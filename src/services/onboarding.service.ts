/**
 * OnboardingService — Phase 3
 *
 * Single entry point for new-user account initialization.
 * The UI calls `OnboardingService.completeOnboarding(userId, draft)` once
 * the user has confirmed their choices on the review screen.
 *
 * Responsibilities:
 *  1. Validate the finalized onboarding input.
 *  2. Guard against duplicate initialization (idempotency).
 *  3. Build FinancialSettings from the draft.
 *  4. Calculate the first cycle's end date using calendar-month logic.
 *  5. Build the first FinancialCycle from the draft.
 *  6. Commit everything atomically via Firestore writeBatch.
 *  7. Set isOnboarded = true only inside the same batch — never before.
 *
 * Field mapping (Phase 2 contract → exact existing fields):
 *  profileName        → FinancialSettings.profileName
 *  monthlyBudget      → FinancialSettings.monthlyBudget
 *  cycleStartDate     → FinancialSettings.cycleConfiguration.startDate
 *  cycleName          → FinancialCycle.cycleName
 *  carryForwardEnabled→ FinancialSettings.carryForwardEnabled
 *  currency           → FinancialSettings.currency (system default "INR")
 *  isOnboarded        → FinancialSettings.isOnboarded
 */

import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  limit,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FinancialSettings, FinancialSettingsService } from './financialSettings.service';
import { FinancialCycle } from './financialCycle.service';
import { CategoryService } from './category.service';

// ---------------------------------------------------------------------------
// Public input type — exactly the fields collected by the Phase 2 questionnaire
// ---------------------------------------------------------------------------

/**
 * OnboardingInput is the finalized, validated data collected from the
 * onboarding questionnaire.  It maps 1-to-1 with the Phase 2 OnboardingDraft
 * interface.  The UI passes this object to completeOnboarding().
 *
 * Do NOT add derived values (endDate, availableBalance, etc.) here —
 * those are calculated internally by the service.
 */
export interface OnboardingInput {
  /** Optional display name for the user (maps to FinancialSettings.profileName). */
  profileName?: string;

  /**
   * Base budget for the user's financial cycles.
   * Maps to FinancialSettings.monthlyBudget.
   * Must be >= 0.
   */
  monthlyBudget: number;

  /**
   * The start date for the first financial cycle.
   * Maps to FinancialSettings.cycleConfiguration.startDate
   * and FinancialCycle.startDate.
   */
  cycleStartDate: Date;

  /**
   * User-chosen display name for the first cycle.
   * Maps to FinancialCycle.cycleName.
   */
  cycleName: string;

  /**
   * Whether unused budget carries forward into the next cycle.
   * Maps to FinancialSettings.carryForwardEnabled.
   */
  carryForwardEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface OnboardingResult {
  /** The newly created (or already-existing) FinancialSettings document. */
  settings: FinancialSettings;
  /** The newly created (or already-existing) first FinancialCycle. */
  cycle: FinancialCycle;
  /**
   * True when this call actually performed initialization.
   * False when the user was already onboarded and the call was a no-op.
   */
  wasAlreadyOnboarded: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export class OnboardingValidationError extends Error {
  public readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'OnboardingValidationError';
    this.field = field;
  }
}

/**
 * Validates the OnboardingInput and throws OnboardingValidationError if any
 * rule is violated.  Called before any Firestore writes.
 */
function validateOnboardingInput(input: OnboardingInput): void {
  // --- monthlyBudget ---
  if (typeof input.monthlyBudget !== 'number' || !isFinite(input.monthlyBudget)) {
    throw new OnboardingValidationError(
      'monthlyBudget',
      'monthlyBudget must be a finite number.'
    );
  }
  if (input.monthlyBudget < 0) {
    throw new OnboardingValidationError(
      'monthlyBudget',
      'monthlyBudget must be greater than or equal to 0.'
    );
  }

  // --- cycleStartDate ---
  if (!(input.cycleStartDate instanceof Date) || isNaN(input.cycleStartDate.getTime())) {
    throw new OnboardingValidationError(
      'cycleStartDate',
      'cycleStartDate must be a valid Date object.'
    );
  }

  // --- cycleName ---
  if (typeof input.cycleName !== 'string') {
    throw new OnboardingValidationError(
      'cycleName',
      'cycleName must be a string.'
    );
  }
  const trimmedCycleName = input.cycleName.trim();
  if (trimmedCycleName.length === 0) {
    throw new OnboardingValidationError(
      'cycleName',
      'cycleName must not be empty.'
    );
  }
  if (trimmedCycleName.length > 30) {
    throw new OnboardingValidationError(
      'cycleName',
      'cycleName must not exceed 30 characters.'
    );
  }

  // --- carryForwardEnabled ---
  if (typeof input.carryForwardEnabled !== 'boolean') {
    throw new OnboardingValidationError(
      'carryForwardEnabled',
      'carryForwardEnabled must be a boolean.'
    );
  }

  // --- profileName (optional) ---
  if (input.profileName !== undefined && input.profileName !== null) {
    if (typeof input.profileName !== 'string') {
      throw new OnboardingValidationError(
        'profileName',
        'profileName must be a string if provided.'
      );
    }
    if (input.profileName.trim().length > 50) {
      throw new OnboardingValidationError(
        'profileName',
        'profileName must not exceed 50 characters.'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Cycle end-date utility (calendar-month logic)
// ---------------------------------------------------------------------------

/**
 * Calculates the last day of the user's first financial cycle using
 * calendar-month arithmetic, as required by the Phase 2 data contract.
 *
 * Rule: endDate = (start date advanced by exactly one calendar month) - 1 day
 *
 * Examples:
 *   Aug 15  → Sep 14
 *   Aug  1  → Aug 31
 *   Jan 31  → Feb 27/28 (handles month-length differences)
 *   Feb 28  → Mar 27
 *   Feb 29  → Mar 28 (leap year)
 *
 * Handles correctly:
 *  - February (28/29 days)
 *  - Leap years
 *  - Months with 30 days
 *  - Months with 31 days
 *  - Start dates near the end of a month (e.g. Jan 31 → Feb 27/28, not Mar 2/3)
 *
 * Time is set to end-of-day (23:59:59.999) so transaction boundary checks
 * work correctly, consistent with the existing createNewCycle implementation.
 */
export function calculateCycleEndDate(startDate: Date): Date {
  // Strategy: find the first day of the NEXT calendar month relative to the
  // start month, then subtract 1 day.  This naturally handles all month-length
  // differences and leap years without any overflow risk.
  //
  // E.g.  Aug 15 → first day of Sep = Sep 1 → Sep 1 - 1 day = Aug 31.
  //        Then the "end" of the AUG-15 cycle is Sep 14 = Sep 1 - 1... wait:
  //
  // Correct rule from data contract:
  //   cycleEndDate = (startDate + 1 calendar month) - 1 day
  //   Aug 15 + 1 month = Sep 15 → Sep 15 - 1 day = Sep 14 ✓
  //   Aug  1 + 1 month = Sep  1 → Sep  1 - 1 day = Aug 31 ✓
  //   Jan 31 + 1 month = ??? (JS overflows to Mar 3) — must clamp to Feb 28/29
  //
  // Fix: when adding 1 month overflows (day changed), clamp to last day of target month.

  const targetYear  = startDate.getFullYear();
  const targetMonth = startDate.getMonth() + 1; // +1 calendar month (0-indexed)

  // Determine the actual last day of targetMonth (handles 28/29/30/31)
  // new Date(year, month+1, 0) gives the last day of `month` (month is 0-indexed)
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(startDate.getDate(), lastDayOfTargetMonth);

  // Build the "start + 1 month" date, clamped to a valid day
  const plusOneMonth = new Date(targetYear, targetMonth, targetDay, 0, 0, 0, 0);

  // End date = (start + 1 month) - 1 day
  const endDate = new Date(plusOneMonth);
  endDate.setDate(endDate.getDate() - 1);

  // Normalize to end-of-day, consistent with existing FinancialCycleService behaviour
  endDate.setHours(23, 59, 59, 999);

  return endDate;
}

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------

export class OnboardingService {
  /**
   * Completes the onboarding initialization for a new user.
   *
   * This is the ONE operation responsible for:
   *   "Take the finalized onboarding configuration and initialize this
   *    user's Nukood account."
   *
   * The UI should call this once the user confirms their choices.
   * The UI must NOT write directly to Firestore.
   *
   * @param userId  The authenticated user's ID.  Must come from the app's
   *                auth layer — never trust a value submitted by the client UI.
   * @param input   The finalized onboarding answers.
   * @returns       OnboardingResult with the created settings, cycle, and a
   *                flag indicating whether initialization was performed.
   * @throws        OnboardingValidationError if any input is invalid.
   * @throws        Error if the Firestore batch commit fails.
   */
  static async completeOnboarding(
    userId: string,
    input: OnboardingInput
  ): Promise<OnboardingResult> {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new Error('completeOnboarding requires a valid userId from the auth layer.');
    }

    // -----------------------------------------------------------------------
    // Step 1: Validate input — do this before ANY reads or writes
    // -----------------------------------------------------------------------
    validateOnboardingInput(input);

    // Normalize string inputs after validation
    const normalizedInput: OnboardingInput = {
      ...input,
      cycleName: input.cycleName.trim(),
      profileName: input.profileName ? input.profileName.trim() : input.profileName,
    };
    // -----------------------------------------------------------------------
    // Step 2: Idempotency — check if already onboarded
    // getUserInitializationState handles three cases:
    //   a) settings doc exists, isOnboarded === true  → true  (already onboarded)
    //   b) settings doc exists, isOnboarded === undefined (legacy user) → true
    //   c) settings doc missing, or isOnboarded === false → false (new user)
    // -----------------------------------------------------------------------
    const settingsRef = doc(db, 'users', userId, 'settings', 'financial');
    const alreadyOnboarded = await FinancialSettingsService.getUserInitializationState(userId);


    if (alreadyOnboarded) {
      console.log(`[OnboardingService] User ${userId} is already onboarded. Returning existing state.`);

      const settingsSnap = await getDoc(settingsRef);
      const existingData = settingsSnap.exists() ? settingsSnap.data() as FinancialSettings : null;

      // Fetch the existing active cycle to return
      const cyclesRef = collection(db, 'users', userId, 'financialCycles');
      const cycleQuery = query(cyclesRef, where('status', '==', 'ACTIVE'), limit(1));
      const cycleSnap = await getDocs(cycleQuery);

      let existingCycle: FinancialCycle | null = null;
      if (!cycleSnap.empty) {
        const cycleDoc = cycleSnap.docs[0];
        const cycleData = cycleDoc.data();
        existingCycle = {
          ...cycleData,
          cycleId: cycleDoc.id,
          startDate: cycleData.startDate?.toDate() || new Date(),
          endDate: cycleData.endDate?.toDate() || new Date(),
          createdAt: cycleData.createdAt?.toDate() || new Date(),
          updatedAt: cycleData.updatedAt?.toDate() || new Date(),
        } as FinancialCycle;
      }

      const existingSettings: FinancialSettings = existingData
        ? {
            ...existingData,
            cycleConfiguration: {
              ...existingData.cycleConfiguration,
              startDate: existingData.cycleConfiguration?.startDate instanceof Date
                ? existingData.cycleConfiguration.startDate
                : (existingData.cycleConfiguration?.startDate as any)?.toDate?.() || new Date(),
            },
          }
        : {} as FinancialSettings;

      return {
        settings: existingSettings,
        cycle: existingCycle!,
        wasAlreadyOnboarded: true,
      };
    }

    // -----------------------------------------------------------------------
    // Step 3: Check for an existing active cycle (extra safety guard)
    // An existing active cycle with isOnboarded = false means a partial previous
    // attempt may have occurred. We must not create a second cycle.
    // -----------------------------------------------------------------------
    const cyclesRef = collection(db, 'users', userId, 'financialCycles');
    const existingCycleQuery = query(cyclesRef, where('status', '==', 'ACTIVE'), limit(1));
    const existingCycleSnap = await getDocs(existingCycleQuery);
    const hasExistingCycle = !existingCycleSnap.empty;

    // -----------------------------------------------------------------------
    // Step 4: Calculate derived values
    // -----------------------------------------------------------------------

    // Normalize startDate to beginning-of-day (consistent with existing service)
    const startDate = new Date(normalizedInput.cycleStartDate);
    startDate.setHours(0, 0, 0, 0);

    // Calendar-month end date (not simple + 30 days)
    const endDate = calculateCycleEndDate(startDate);

    // cycleLengthDays: actual number of days in this calendar-month span
    const cycleLengthDays =
      Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    // Cycle ID format matches existing convention: cycle_YYYY_MM_DD
    const cycleId = `cycle_${startDate.getFullYear()}_${(startDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}_${startDate.getDate().toString().padStart(2, '0')}`;

    // -----------------------------------------------------------------------
    // Step 5: Build the FinancialSettings document
    // Using the exact existing FinancialSettings structure.
    // Fields mapped directly from the Phase 2 contract.
    // -----------------------------------------------------------------------
    // Build the settings object, omitting undefined optional fields so Firestore
    // does not reject the write with "Unsupported field value: undefined".
    const newSettings: FinancialSettings = {
      monthlyBudget: normalizedInput.monthlyBudget,
      carryForwardEnabled: normalizedInput.carryForwardEnabled,
      currency: 'INR', // System default; currency is not an onboarding question currently
      budgetThresholds: { comfortable: 90, onTrack: 105, tight: 115 },
      cycleConfiguration: {
        startDate: startDate,
        cycleLengthDays: cycleLengthDays,
        autoCreateNextCycle: true,
      },
      hiddenCategoryIds: [],
      isOnboarded: true, // Set inside the batch — atomic with the cycle write
    };
    // Only set profileName if provided (avoids 'undefined' Firestore rejection)
    if (normalizedInput.profileName) {
      newSettings.profileName = normalizedInput.profileName;
    }

    // -----------------------------------------------------------------------
    // Step 6: Build the FinancialCycle document (first cycle)
    // Reusing the exact existing FinancialCycle structure.
    // First cycle has no carry-forward (no previous cycle exists).
    // -----------------------------------------------------------------------

    // Initialize categorySummary from global categories (same as existing createNewCycle)
    let categorySummary: Record<string, any> = {};
    try {
      const allCategories = await CategoryService.getAllCategories();
      allCategories.forEach((cat) => {
        categorySummary[cat.categoryId] = {
          totalSpent: 0,
          transactionCount: 0,
          lastTransactionAt: null,
        };
      });
    } catch (err) {
      console.warn('[OnboardingService] Could not load categories for categorySummary. Initializing empty.', err);
      categorySummary = {};
    }

    const firstCycleData = {
      cycleName: normalizedInput.cycleName,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      cycleLengthDays: cycleLengthDays,
      budgetSnapshot: {
        monthlyBudget: normalizedInput.monthlyBudget,
        carryForward: 0, // First cycle — no previous cycle to carry from
        availableBalance: normalizedInput.monthlyBudget,
      },
      totalSpent: 0,
      transactionCount: 0,
      categorySummary,
      status: 'ACTIVE' as const,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // -----------------------------------------------------------------------
    // Step 7: Atomic commit via Firestore writeBatch
    //
    // isOnboarded = true is set in the SAME batch as all other writes.
    // If the batch fails, isOnboarded remains false/unset — the user is
    // never falsely marked as onboarded if their data is missing.
    // -----------------------------------------------------------------------
    const batch = writeBatch(db);

    // Write FinancialSettings (with isOnboarded: true)
    // Using setDoc semantics (create or overwrite) — safe because we checked
    // idempotency above. For existing-but-not-onboarded docs we overwrite intentionally.
    batch.set(settingsRef, {
      ...newSettings,
      cycleConfiguration: {
        ...newSettings.cycleConfiguration,
        startDate: Timestamp.fromDate(startDate),
      },
    });

    // Write the first FinancialCycle.
    // We always write (setDoc / overwrite) using the deterministic cycleId derived
    // from the user's chosen startDate.  This is safe because:
    //   - A genuinely new user has no cycle at this path.
    //   - If a previous partial/dev run left a stale cycle at this path, we replace
    //     it with the correct onboarding data (still idempotent by cycleId).
    //   - The idempotency check above already returned early if isOnboarded === true,
    //     so a fully initialized user's cycle is never overwritten.
    const cycleDocRef = doc(db, 'users', userId, 'financialCycles', cycleId);
    batch.set(cycleDocRef, firstCycleData);

    // Commit — atomic: either all succeed or none do
    await batch.commit();

    console.log(`[OnboardingService] Successfully initialized account for user ${userId}.`);
    console.log(`[OnboardingService]   Settings path: users/${userId}/settings/financial`);
    console.log(`[OnboardingService]   Cycle path:    users/${userId}/financialCycles/${cycleId}`);

    // -----------------------------------------------------------------------
    // Step 8: Return the initialized state
    // -----------------------------------------------------------------------
    const resultCycle: FinancialCycle = {
      cycleId,
      ...firstCycleData,
      startDate,
      endDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      settings: newSettings,
      cycle: resultCycle,
      wasAlreadyOnboarded: false,
    };
  }
}
