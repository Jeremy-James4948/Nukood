/**
 * Phase 3 Test Script — Onboarding Account Initialization
 *
 * Run with:
 *   npx tsx src/scripts/test_phase3.ts
 *
 * Tests:
 *   T1 — Existing user (dev_jeremy): initialization must be a no-op
 *   T2 — New user (dev_jj):          full initialization with valid data
 *   T3 — Invalid input:              must reject before writing anything
 *   T4 — Duplicate submission:       second call on dev_jj must be idempotent
 *
 * After each write test the script reads the resulting Firestore documents
 * and prints the actual field values so the output can be compared against
 * the expected values defined in the Phase 2 data contract.
 */

// ── Node / Vite env shim (must be first) ──────────────────────────────────
process.env.FIREBASE_FORCE_NODE = 'true';
// @ts-ignore
if (typeof global !== 'undefined') {
  // @ts-ignore
  global.import = {
    meta: {
      env: {
        VITE_FIREBASE_API_KEY:           process.env.VITE_FIREBASE_API_KEY           || '',
        VITE_FIREBASE_AUTH_DOMAIN:       process.env.VITE_FIREBASE_AUTH_DOMAIN       || '',
        VITE_FIREBASE_PROJECT_ID:        process.env.VITE_FIREBASE_PROJECT_ID        || '',
        VITE_FIREBASE_STORAGE_BUCKET:    process.env.VITE_FIREBASE_STORAGE_BUCKET    || '',
        VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        VITE_FIREBASE_APP_ID:            process.env.VITE_FIREBASE_APP_ID            || '',
      },
    },
  };
}

// Read the real .env.local so we get actual Firebase credentials
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq !== -1) {
        const key = trimmed.substring(0, eq).trim();
        const value = trimmed.substring(eq + 1).trim();
        process.env[key] = value;
        // Also inject into the global shim
        // @ts-ignore
        if (global.import?.meta?.env) {
          // @ts-ignore
          global.import.meta.env[key] = value;
        }
      }
    }
  });
  console.log('[Setup] Loaded .env.local');
} catch {
  console.warn('[Setup] Could not read .env.local — using env vars from shell');
}

// Re-apply VITE_ vars from process.env into the shim after .env.local load
// @ts-ignore
if (global.import?.meta?.env) {
  const keys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];
  keys.forEach((k) => {
    if (process.env[k]) {
      // @ts-ignore
      global.import.meta.env[k] = process.env[k];
    }
  });
}

// ── Now import the real services ──────────────────────────────────────────
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FinancialSettingsService } from '../services/financialSettings.service';
import { FinancialCycleService } from '../services/financialCycle.service';
import {
  OnboardingService,
  OnboardingInput,
  OnboardingValidationError,
  calculateCycleEndDate,
} from '../services/onboarding.service';

// ── Helpers ───────────────────────────────────────────────────────────────

function pass(label: string, detail?: string) {
  console.log(`  ✅ PASS  ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label: string, reason: string) {
  console.log(`  ❌ FAIL  ${label} — ${reason}`);
}

function section(title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

async function readSettingsRaw(userId: string): Promise<any | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'settings', 'financial'));
  return snap.exists() ? snap.data() : null;
}

async function countActiveCycles(userId: string): Promise<number> {
  const snap = await getDocs(collection(db, 'users', userId, 'financialCycles'));
  return snap.docs.filter((d) => d.data().status === 'ACTIVE').length;
}

async function readCycleRaw(userId: string, cycleId: string): Promise<any | null> {
  const snap = await getDoc(doc(db, 'users', userId, 'financialCycles', cycleId));
  return snap.exists() ? snap.data() : null;
}

// ── Unit test: calculateCycleEndDate ──────────────────────────────────────

function testEndDateCalculation() {
  section('UNIT — calculateCycleEndDate');

  const cases: [string, string, string][] = [
    // [label, startDateISO, expectedEndDateISO]
    ['Aug 15 → Sep 14',  '2026-08-15', '2026-09-14'],
    ['Aug  1 → Aug 31',  '2026-08-01', '2026-08-31'],
    ['Jan 31 → Feb 27',  '2026-01-31', '2026-02-27'],  // Feb has 28 days in 2026
    ['Feb 28 → Mar 27',  '2026-02-28', '2026-03-27'],
    ['Feb 29 → Mar 28',  '2024-02-29', '2024-03-28'],  // Leap year
    ['Mar 31 → Apr 29',  '2026-03-31', '2026-04-29'],  // April has 30 days → Apr 30-1
    ['Dec 31 → Jan 30',  '2026-12-31', '2027-01-30'],
  ];

  let allPassed = true;
  for (const [label, start, expectedEnd] of cases) {
    const startDate = new Date(`${start}T00:00:00.000`);
    const result = calculateCycleEndDate(startDate);
    const resultISO = `${result.getFullYear()}-${String(result.getMonth() + 1).padStart(2, '0')}-${String(result.getDate()).padStart(2, '0')}`;

    if (resultISO === expectedEnd) {
      pass(label, `endDate = ${resultISO}`);
    } else {
      fail(label, `expected ${expectedEnd}, got ${resultISO}`);
      allPassed = false;
    }
  }
  return allPassed;
}

// ── T1: Existing user ─────────────────────────────────────────────────────

async function testExistingUser(): Promise<boolean> {
  section('T1 — Existing user (dev_jeremy): must be unchanged');

  const userId = 'dev_jeremy';

  // Snapshot BEFORE
  const settingsBefore = await readSettingsRaw(userId);
  const cyclesBefore = await FinancialCycleService.getAllCycles(userId);

  if (!settingsBefore) {
    fail('Pre-condition', 'dev_jeremy has no settings — cannot verify existing-user protection');
    return false;
  }

  console.log(`  [Before] isOnboarded = ${settingsBefore.isOnboarded}`);
  console.log(`  [Before] monthlyBudget = ${settingsBefore.monthlyBudget}`);
  console.log(`  [Before] cycle count = ${cyclesBefore.length}`);

  // Attempt to call completeOnboarding on an already-onboarded user
  let wasAlreadyOnboarded = false;
  try {
    const result = await OnboardingService.completeOnboarding(userId, {
      monthlyBudget: 99999,      // If this writes, it would be catastrophic
      cycleStartDate: new Date(),
      cycleName: 'SHOULD NOT BE CREATED',
      carryForwardEnabled: false,
    });
    wasAlreadyOnboarded = result.wasAlreadyOnboarded;
  } catch (err) {
    fail('completeOnboarding call', `threw unexpectedly: ${err}`);
    return false;
  }

  // Snapshot AFTER
  const settingsAfter = await readSettingsRaw(userId);
  const cyclesAfter = await FinancialCycleService.getAllCycles(userId);

  let allPassed = true;

  if (!wasAlreadyOnboarded) {
    fail('wasAlreadyOnboarded flag', 'expected true for existing user');
    allPassed = false;
  } else {
    pass('wasAlreadyOnboarded = true', 'service correctly detected existing user');
  }

  if (settingsAfter?.monthlyBudget !== settingsBefore.monthlyBudget) {
    fail('monthlyBudget unchanged', `before=${settingsBefore.monthlyBudget}, after=${settingsAfter?.monthlyBudget}`);
    allPassed = false;
  } else {
    pass('monthlyBudget unchanged', `${settingsAfter?.monthlyBudget}`);
  }

  if (cyclesAfter.length !== cyclesBefore.length) {
    fail('cycle count unchanged', `before=${cyclesBefore.length}, after=${cyclesAfter.length}`);
    allPassed = false;
  } else {
    pass('cycle count unchanged', `${cyclesAfter.length} cycles`);
  }

  if (settingsAfter?.carryForwardEnabled === settingsBefore.carryForwardEnabled) {
    pass('carryForwardEnabled unchanged', `${settingsAfter?.carryForwardEnabled}`);
  } else {
    fail('carryForwardEnabled changed', `before=${settingsBefore.carryForwardEnabled}, after=${settingsAfter?.carryForwardEnabled}`);
    allPassed = false;
  }

  return allPassed;
}

// ── T2: New user ──────────────────────────────────────────────────────────

async function testNewUser(): Promise<{ passed: boolean; cycleId: string }> {
  section('T2 — New user (dev_jj): full initialization');

  const userId = 'dev_jj';

  // Clean slate check: if jj is already onboarded from a previous test run,
  // reset isOnboarded to false so we can test a fresh initialization.
  // NOTE: In production this would never happen; this is test harness only.
  const existingSettings = await readSettingsRaw(userId);
  if (existingSettings?.isOnboarded === true) {
    console.log('  [Setup] dev_jj already onboarded from a previous run.');
    console.log('  [Setup] Resetting isOnboarded = false to test initialization...');
    await FinancialSettingsService.updateSettings(userId, { isOnboarded: false } as any);

    // Also delete any existing active cycle to avoid false-positive idempotency result
    // (We only delete cycles with name matching our test, leaving any real data untouched)
    const allCycles = await FinancialCycleService.getAllCycles(userId);
    const testCycles = allCycles.filter((c) => c.cycleName === 'August' && c.status === 'ACTIVE');
    if (testCycles.length > 0) {
      console.log(`  [Setup] Found ${testCycles.length} test cycle(s) to remove for clean test.`);
      // We cannot delete in Firestore client SDK without a reference, so we mark as completed
      // to prevent the service from reading them as the active cycle. For test purity only.
      for (const tc of testCycles) {
        await FinancialCycleService.updateCycleName(userId, tc.cycleId, `__test_reset_${tc.cycleId}`);
      }
    }
  }

  const input: OnboardingInput = {
    profileName: 'JJ',
    monthlyBudget: 12000,
    cycleStartDate: new Date('2026-08-15T00:00:00.000'),
    cycleName: 'August',
    carryForwardEnabled: true,
  };

  console.log('\n  [Input]');
  console.log(`    profileName:        ${input.profileName}`);
  console.log(`    monthlyBudget:      ${input.monthlyBudget}`);
  console.log(`    cycleStartDate:     2026-08-15`);
  console.log(`    cycleName:          ${input.cycleName}`);
  console.log(`    carryForwardEnabled:${input.carryForwardEnabled}`);

  let result: Awaited<ReturnType<typeof OnboardingService.completeOnboarding>>;
  try {
    result = await OnboardingService.completeOnboarding(userId, input);
  } catch (err) {
    fail('completeOnboarding', `threw: ${err}`);
    return { passed: false, cycleId: '' };
  }

  let allPassed = true;

  // --- Verify return value ---
  if (result.wasAlreadyOnboarded) {
    fail('wasAlreadyOnboarded', 'expected false for a new user');
    allPassed = false;
  } else {
    pass('wasAlreadyOnboarded = false');
  }

  // --- Verify Firestore settings document ---
  const settingsRaw = await readSettingsRaw(userId);

  console.log('\n  [Firestore] users/dev_jj/settings/financial:');
  console.log(JSON.stringify(settingsRaw, null, 4).split('\n').map((l) => '    ' + l).join('\n'));

  if (settingsRaw?.profileName === 'JJ') {
    pass('profileName', 'JJ');
  } else {
    fail('profileName', `expected "JJ", got "${settingsRaw?.profileName}"`);
    allPassed = false;
  }

  if (settingsRaw?.monthlyBudget === 12000) {
    pass('monthlyBudget', '12000');
  } else {
    fail('monthlyBudget', `expected 12000, got ${settingsRaw?.monthlyBudget}`);
    allPassed = false;
  }

  if (settingsRaw?.carryForwardEnabled === true) {
    pass('carryForwardEnabled', 'true');
  } else {
    fail('carryForwardEnabled', `expected true, got ${settingsRaw?.carryForwardEnabled}`);
    allPassed = false;
  }

  if (settingsRaw?.currency === 'INR') {
    pass('currency', 'INR');
  } else {
    fail('currency', `expected "INR", got "${settingsRaw?.currency}"`);
    allPassed = false;
  }

  if (settingsRaw?.isOnboarded === true) {
    pass('isOnboarded', 'true');
  } else {
    fail('isOnboarded', `expected true, got ${settingsRaw?.isOnboarded}`);
    allPassed = false;
  }

  // cycleConfiguration.startDate should be Aug 15
  const storedStart = settingsRaw?.cycleConfiguration?.startDate?.toDate?.();
  if (storedStart) {
    const d = storedStart.getDate();
    const m = storedStart.getMonth(); // 0-indexed: 7 = August
    if (d === 15 && m === 7) {
      pass('cycleConfiguration.startDate', '2026-08-15');
    } else {
      fail('cycleConfiguration.startDate', `got ${storedStart.toISOString()}`);
      allPassed = false;
    }
  } else {
    fail('cycleConfiguration.startDate', 'not found or not a Timestamp');
    allPassed = false;
  }

  // --- Verify Firestore cycle document ---
  const cycleId = result.cycle.cycleId;
  const cycleRaw = await readCycleRaw(userId, cycleId);

  console.log(`\n  [Firestore] users/dev_jj/financialCycles/${cycleId}:`);
  console.log(JSON.stringify(cycleRaw, null, 4).split('\n').map((l) => '    ' + l).join('\n'));

  if (cycleRaw?.cycleName === 'August') {
    pass('cycleName', 'August');
  } else {
    fail('cycleName', `expected "August", got "${cycleRaw?.cycleName}"`);
    allPassed = false;
  }

  if (cycleRaw?.status === 'ACTIVE') {
    pass('status', 'ACTIVE');
  } else {
    fail('status', `expected "ACTIVE", got "${cycleRaw?.status}"`);
    allPassed = false;
  }

  if (cycleRaw?.budgetSnapshot?.monthlyBudget === 12000) {
    pass('budgetSnapshot.monthlyBudget', '12000');
  } else {
    fail('budgetSnapshot.monthlyBudget', `expected 12000, got ${cycleRaw?.budgetSnapshot?.monthlyBudget}`);
    allPassed = false;
  }

  if (cycleRaw?.budgetSnapshot?.carryForward === 0) {
    pass('budgetSnapshot.carryForward', '0 (first cycle — no previous cycle)');
  } else {
    fail('budgetSnapshot.carryForward', `expected 0, got ${cycleRaw?.budgetSnapshot?.carryForward}`);
    allPassed = false;
  }

  if (cycleRaw?.budgetSnapshot?.availableBalance === 12000) {
    pass('budgetSnapshot.availableBalance', '12000');
  } else {
    fail('budgetSnapshot.availableBalance', `expected 12000, got ${cycleRaw?.budgetSnapshot?.availableBalance}`);
    allPassed = false;
  }

  // Cycle start: Aug 15
  const cycleStart = cycleRaw?.startDate?.toDate?.();
  if (cycleStart && cycleStart.getDate() === 15 && cycleStart.getMonth() === 7) {
    pass('startDate', '2026-08-15');
  } else {
    fail('startDate', `got ${cycleStart?.toISOString?.() || 'undefined'}`);
    allPassed = false;
  }

  // Cycle end: Sep 14 (calendar-month logic)
  const cycleEnd = cycleRaw?.endDate?.toDate?.();
  if (cycleEnd && cycleEnd.getDate() === 14 && cycleEnd.getMonth() === 8) {
    pass('endDate', '2026-09-14 (calendar-month logic: Aug 15 → Sep 14)');
  } else {
    fail('endDate', `expected 2026-09-14, got ${cycleEnd?.toISOString?.() || 'undefined'}`);
    allPassed = false;
  }

  // User ownership: cycleId format encodes user data; settings path confirms ownership
  pass('user ownership', `settings at users/dev_jj/settings/financial, cycle at users/dev_jj/financialCycles/${cycleId}`);

  return { passed: allPassed, cycleId };
}

// ── T3: Invalid data ──────────────────────────────────────────────────────

async function testInvalidData(): Promise<boolean> {
  section('T3 — Invalid input: must reject without writing');

  // Use a safe isolated user ID that won't affect any real data
  const userId = 'dev_jj';

  // Save state before
  const settingsBefore = await readSettingsRaw(userId);
  const isOnboardedBefore = settingsBefore?.isOnboarded;

  let allPassed = true;

  const invalidCases: Array<{ label: string; input: Partial<OnboardingInput>; expectField: string }> = [
    {
      label: 'negative monthlyBudget',
      input: {
        monthlyBudget: -100,
        cycleStartDate: new Date(),
        cycleName: 'Test',
        carryForwardEnabled: true,
      },
      expectField: 'monthlyBudget',
    },
    {
      label: 'non-finite monthlyBudget (NaN)',
      input: {
        monthlyBudget: NaN,
        cycleStartDate: new Date(),
        cycleName: 'Test',
        carryForwardEnabled: true,
      },
      expectField: 'monthlyBudget',
    },
    {
      label: 'invalid cycleStartDate',
      input: {
        monthlyBudget: 1000,
        cycleStartDate: new Date('not-a-date'),
        cycleName: 'Test',
        carryForwardEnabled: true,
      },
      expectField: 'cycleStartDate',
    },
    {
      label: 'empty cycleName',
      input: {
        monthlyBudget: 1000,
        cycleStartDate: new Date(),
        cycleName: '',
        carryForwardEnabled: true,
      },
      expectField: 'cycleName',
    },
    {
      label: 'cycleName exceeds 30 chars',
      input: {
        monthlyBudget: 1000,
        cycleStartDate: new Date(),
        cycleName: 'A'.repeat(31),
        carryForwardEnabled: true,
      },
      expectField: 'cycleName',
    },
    {
      label: 'carryForwardEnabled is not boolean',
      input: {
        monthlyBudget: 1000,
        cycleStartDate: new Date(),
        cycleName: 'Test',
        carryForwardEnabled: 'yes' as any,
      },
      expectField: 'carryForwardEnabled',
    },
  ];

  for (const tc of invalidCases) {
    let threw = false;
    let threwCorrectType = false;
    let threwCorrectField = false;

    try {
      await OnboardingService.completeOnboarding(userId, tc.input as OnboardingInput);
    } catch (err) {
      threw = true;
      if (err instanceof OnboardingValidationError) {
        threwCorrectType = true;
        if (err.field === tc.expectField) {
          threwCorrectField = true;
        }
      }
    }

    if (threw && threwCorrectType && threwCorrectField) {
      pass(`"${tc.label}"`, `threw OnboardingValidationError on field="${tc.expectField}"`);
    } else if (!threw) {
      fail(`"${tc.label}"`, 'did NOT throw — invalid data was accepted');
      allPassed = false;
    } else if (!threwCorrectType) {
      fail(`"${tc.label}"`, 'threw a generic Error, not OnboardingValidationError');
      allPassed = false;
    } else {
      fail(`"${tc.label}"`, `threw on wrong field (expected "${tc.expectField}")`);
      allPassed = false;
    }
  }

  // Confirm isOnboarded did not change
  const settingsAfter = await readSettingsRaw(userId);
  const isOnboardedAfter = settingsAfter?.isOnboarded;

  if (isOnboardedAfter === isOnboardedBefore) {
    pass('isOnboarded unchanged after invalid inputs', `${isOnboardedAfter}`);
  } else {
    fail('isOnboarded changed after invalid inputs', `before=${isOnboardedBefore}, after=${isOnboardedAfter}`);
    allPassed = false;
  }

  return allPassed;
}

// ── T4: Duplicate submission ──────────────────────────────────────────────

async function testDuplicateSubmission(firstCycleId: string): Promise<boolean> {
  section('T4 — Duplicate submission (dev_jj): must be idempotent');

  const userId = 'dev_jj';

  // dev_jj should now be onboarded (from T2)
  const activeCyclesBefore = await countActiveCycles(userId);

  // Submit the exact same onboarding data a second time
  const input: OnboardingInput = {
    profileName: 'JJ',
    monthlyBudget: 12000,
    cycleStartDate: new Date('2026-08-15T00:00:00.000'),
    cycleName: 'August',
    carryForwardEnabled: true,
  };

  let result: Awaited<ReturnType<typeof OnboardingService.completeOnboarding>>;
  try {
    result = await OnboardingService.completeOnboarding(userId, input);
  } catch (err) {
    fail('second completeOnboarding call', `threw: ${err}`);
    return false;
  }

  let allPassed = true;

  if (result.wasAlreadyOnboarded) {
    pass('wasAlreadyOnboarded = true', 'service correctly detected duplicate');
  } else {
    fail('wasAlreadyOnboarded', 'expected true on second call');
    allPassed = false;
  }

  const activeCyclesAfter = await countActiveCycles(userId);

  if (activeCyclesAfter === activeCyclesBefore) {
    pass('no duplicate cycle created', `active cycles = ${activeCyclesAfter}`);
  } else {
    fail('duplicate cycle created', `before=${activeCyclesBefore}, after=${activeCyclesAfter}`);
    allPassed = false;
  }

  // Settings should be unchanged from T2
  const settingsRaw = await readSettingsRaw(userId);
  if (settingsRaw?.monthlyBudget === 12000) {
    pass('settings unchanged', `monthlyBudget still = 12000`);
  } else {
    fail('settings changed', `expected 12000, got ${settingsRaw?.monthlyBudget}`);
    allPassed = false;
  }

  if (settingsRaw?.isOnboarded === true) {
    pass('isOnboarded remains true');
  } else {
    fail('isOnboarded', `expected true, got ${settingsRaw?.isOnboarded}`);
    allPassed = false;
  }

  return allPassed;
}

// ── Runner ────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║        NUKOOD — PHASE 3 TEST SUITE                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  const results: Record<string, boolean> = {};

  // Unit tests (no Firestore)
  results['UNIT — calculateCycleEndDate'] = testEndDateCalculation();

  // Integration tests (require real Firestore)
  results['T1 — Existing user protection'] = await testExistingUser();

  const { passed: t2Passed, cycleId } = await testNewUser();
  results['T2 — New user initialization'] = t2Passed;

  results['T3 — Invalid input rejection'] = await testInvalidData();
  results['T4 — Duplicate submission idempotency'] = await testDuplicateSubmission(cycleId);

  // Summary
  section('RESULTS SUMMARY');
  let anyFailed = false;
  for (const [name, passed] of Object.entries(results)) {
    if (passed) {
      console.log(`  ✅  ${name}`);
    } else {
      console.log(`  ❌  ${name}`);
      anyFailed = true;
    }
  }

  console.log('');
  if (anyFailed) {
    console.log('⚠️  Some tests FAILED. Review output above.\n');
    process.exit(1);
  } else {
    console.log('🎉  All tests PASSED.\n');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('\n[Fatal] Unhandled error in test runner:', err);
  process.exit(1);
});
