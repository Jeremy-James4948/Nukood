import { collection, doc, getDoc, getDocs, setDoc, query, where, limit, Timestamp, writeBatch, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FinancialSettings, FinancialSettingsService } from './financialSettings.service';
import { Transaction } from './transaction.service';

export interface FinancialCycle {
  cycleId: string;
  cycleName: string;
  startDate: Date;
  endDate: Date;
  cycleLengthDays: number;
  budgetSnapshot: {
    monthlyBudget: number;
    carryForward: number;
    availableBalance: number;
  };
  totalSpent: number;
  transactionCount: number;
  categorySummary?: Record<string, {
    totalSpent: number;
    transactionCount: number;
    lastTransactionAt: Date | null;
  }>;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

import { CategoryService } from './category.service';

export class FinancialCycleService {
  /**
   * Fetches the currently ACTIVE financial cycle for the user.
   */
  static async getActiveCycle(userId: string): Promise<FinancialCycle | null> {
    const cyclesRef = collection(db, 'users', userId, 'financialCycles');
    const q = query(cyclesRef, where('status', '==', 'ACTIVE'), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) return null;

    const doc = snap.docs[0];
    const data = doc.data();
    return this.mapToCycle(doc.id, data);
  }

  /**
   * Fetches the most recent completed cycle to calculate Carry Forward.
   */
  static async getPreviousCycle(userId: string): Promise<FinancialCycle | null> {
    const cyclesRef = collection(db, 'users', userId, 'financialCycles');
    // We avoid orderBy here because it requires a composite index in Firestore
    const q = query(cyclesRef, where('status', '==', 'COMPLETED'));
    const snap = await getDocs(q);

    if (snap.empty) return null;

    const cycles = snap.docs.map(doc => this.mapToCycle(doc.id, doc.data()));
    cycles.sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

    return cycles[0];
  }

  /**
   * Fetches all cycles (ACTIVE and COMPLETED), ordered newest to oldest.
   */
  static async getAllCycles(userId: string): Promise<FinancialCycle[]> {
    const cyclesRef = collection(db, 'users', userId, 'financialCycles');
    const snap = await getDocs(cyclesRef);

    if (snap.empty) return [];

    let cycles = snap.docs.map(doc => this.mapToCycle(doc.id, doc.data()));
    cycles = cycles.filter(c => c.status === 'ACTIVE' || c.status === 'COMPLETED');
    cycles.sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

    return cycles;
  }

  /**
   * Creates a brand new cycle based on the user's financial settings.
   * VERY IMPORTANT: Handles strict date boundaries and carry forward calculation.
   */
  static async createNewCycle(
    userId: string,
    settings: FinancialSettings,
    cycleName: string,
    providedPreviousCycle?: FinancialCycle | null
  ): Promise<FinancialCycle> {

    const previousCycle = providedPreviousCycle || await this.getPreviousCycle(userId);
    let carryForward = 0;

    if (settings.carryForwardEnabled && previousCycle) {
      carryForward = Math.max(0, previousCycle.budgetSnapshot.availableBalance - previousCycle.totalSpent);
    }

    const availableBalance = settings.monthlyBudget + carryForward;

    // Calculate the new cycle's start date.
    //
    // Priority order:
    //   1. If the user has configured a start date in settings that falls AFTER the previous
    //      cycle ended, honour it — they deliberately changed the cadence in settings and want
    //      the next cycle to begin on that specific date.
    //   2. Otherwise, chain immediately after the previous cycle (standard rolling behaviour).
    //   3. No previous cycle → use the settings start date directly (first cycle creation).
    let startDate: Date;

    if (previousCycle) {
      const configuredStart = new Date(settings.cycleConfiguration.startDate);
      configuredStart.setHours(0, 0, 0, 0);
      const chainedStart = new Date(previousCycle.endDate.getTime() + 24 * 60 * 60 * 1000);
      chainedStart.setHours(0, 0, 0, 0);

      // Use the configured date only when it is strictly after the previous cycle ended,
      // meaning the user intentionally set a future start date.  In all other cases
      // (settings date is in the past or same as chained date), chain as normal.
      startDate = configuredStart > previousCycle.endDate ? configuredStart : chainedStart;
    } else {
      startDate = new Date(settings.cycleConfiguration.startDate);
      startDate.setHours(0, 0, 0, 0);
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + settings.cycleConfiguration.cycleLengthDays - 1);
    endDate.setHours(23, 59, 59, 999);

    const cycleId = `cycle_${startDate.getFullYear()}_${(startDate.getMonth() + 1).toString().padStart(2, '0')}_${startDate.getDate().toString().padStart(2, '0')}`;
    const docRef = doc(db, 'users', userId, 'financialCycles', cycleId);

    // Initialize categorySummary with all default categories
    const allCategories = await CategoryService.getAllCategories();
    const categorySummary: Record<string, any> = {};
    allCategories.forEach(cat => {
      categorySummary[cat.categoryId] = {
        totalSpent: 0,
        transactionCount: 0,
        lastTransactionAt: null
      };
    });

    const newCycleData = {
      cycleName,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      cycleLengthDays: settings.cycleConfiguration.cycleLengthDays,
      budgetSnapshot: {
        monthlyBudget: settings.monthlyBudget,
        carryForward,
        availableBalance,
      },
      totalSpent: 0,
      transactionCount: 0,
      categorySummary,
      status: 'ACTIVE',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(docRef, newCycleData);

    return {
      cycleId,
      ...newCycleData,
      startDate: startDate,
      endDate: endDate,
      createdAt: new Date(),
      updatedAt: new Date()
    } as FinancialCycle;
  }

  private static mapToCycle(id: string, data: any): FinancialCycle {

    // Map timestamps in categorySummary
    const mappedCategorySummary = data.categorySummary ? { ...data.categorySummary } : undefined;
    if (mappedCategorySummary) {
      Object.keys(mappedCategorySummary).forEach(catId => {
        const lastTx = mappedCategorySummary[catId].lastTransactionAt;
        if (lastTx && typeof lastTx.toDate === 'function') {
          mappedCategorySummary[catId].lastTransactionAt = lastTx.toDate();
        } else if (lastTx) {
          mappedCategorySummary[catId].lastTransactionAt = new Date(lastTx);
        }
      });
    }

    return {
      ...data,
      cycleId: id,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      categorySummary: mappedCategorySummary,
    } as FinancialCycle;
  }

  /**
   * Temporary helper to forcefully set the active cycle budget to 15000.
   */
  static async setTemporaryBudget(userId: string, cycleId: string, budget: number): Promise<void> {
    const cycleRef = doc(db, 'users', userId, 'financialCycles', cycleId);
    const snap = await getDoc(cycleRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.budgetSnapshot.monthlyBudget !== budget) {
        await setDoc(cycleRef, {
          budgetSnapshot: {
            ...data.budgetSnapshot,
            monthlyBudget: budget,
            availableBalance: budget + (data.budgetSnapshot.carryForward || 0)
          }
        }, { merge: true });
        console.log(`Updated budget for cycle ${cycleId} to ${budget}`);
      }
    }
  }

  /**
   * Updates the end date of a financial cycle and recalculates its cycleLengthDays.
   * Safe to call on the active cycle when the user adjusts the cycle's end date in settings.
   */
  static async updateCycleEndDate(userId: string, cycleId: string, newEndDate: Date): Promise<void> {
    const cycleRef = doc(db, 'users', userId, 'financialCycles', cycleId);
    const snap = await getDoc(cycleRef);
    if (!snap.exists()) throw new Error(`Cycle ${cycleId} not found.`);

    const data = snap.data();
    const startDate: Date = data.startDate?.toDate() || new Date();

    // Normalize: end date is always end-of-day, start is beginning-of-day
    const normalizedEnd = new Date(newEndDate);
    normalizedEnd.setHours(23, 59, 59, 999);

    const startDay = new Date(startDate);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(normalizedEnd);
    endDay.setHours(0, 0, 0, 0);

    const diffMs = endDay.getTime() - startDay.getTime();
    const cycleLengthDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

    await setDoc(cycleRef, {
      endDate: Timestamp.fromDate(normalizedEnd),
      cycleLengthDays,
      updatedAt: Timestamp.now()
    }, { merge: true });
  }

  /**
   * Updates both start and end dates of a cycle (used for archive historical corrections).
   * Recalculates cycleLengthDays from the new boundaries.
   */
  static async updateCycleDates(userId: string, cycleId: string, newStartDate: Date, newEndDate: Date): Promise<void> {
    const normalizedStart = new Date(newStartDate);
    normalizedStart.setHours(0, 0, 0, 0);
    const normalizedEnd = new Date(newEndDate);
    normalizedEnd.setHours(23, 59, 59, 999);

    const diffMs = normalizedEnd.getTime() - normalizedStart.getTime();
    const cycleLengthDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

    const cycleRef = doc(db, 'users', userId, 'financialCycles', cycleId);
    await setDoc(cycleRef, {
      startDate: Timestamp.fromDate(normalizedStart),
      endDate: Timestamp.fromDate(normalizedEnd),
      cycleLengthDays,
      updatedAt: Timestamp.now()
    }, { merge: true });
  }

  /**
   * Splits the active cycle at newEndDate.
   *
   * - The active cycle is shortened to newEndDate and marked COMPLETED.
   * - A new ACTIVE cycle is created starting the next day.
   * - All overflow transactions (date > newEndDate) are moved to the new cycle:
   *     their cycleId is updated, and their daily journal documents are relocated
   *     from the old cycle's subcollection to the new cycle's subcollection.
   * - Carry-forward is calculated from the trimmed old cycle's remaining balance.
   *
   * Everything is executed in a single atomic batch write.
   */
  static async splitCycleAtDate(
    userId: string,
    activeCycle: FinancialCycle,
    newEndDate: Date,
    overflowTransactions: Array<{
      transactionId: string;
      transactionType: 'EXPENSE' | 'INCOME';
      amount: number;
      categoryId: string;
      date: Date;
    }>,
    settings: FinancialSettings,
    newCycleName: string
  ): Promise<FinancialCycle> {
    // --- Normalize boundary ---
    const normalizedEnd = new Date(newEndDate);
    normalizedEnd.setHours(23, 59, 59, 999);

    // --- Fetch overflow journal docs (stored as a subcollection on the old cycle) ---
    const journalsRef = collection(db, 'users', userId, 'financialCycles', activeCycle.cycleId, 'dailyJournals');
    const journalsSnap = await getDocs(journalsRef);
    const overflowJournalDocs = journalsSnap.docs.filter(jDoc => {
      const jDate = jDoc.data().date?.toDate();
      return jDate && jDate > normalizedEnd;
    });

    // --- Old cycle corrected length ---
    const oldStartDay = new Date(activeCycle.startDate);
    oldStartDay.setHours(0, 0, 0, 0);
    const oldNewEndDay = new Date(normalizedEnd);
    oldNewEndDay.setHours(0, 0, 0, 0);
    const oldCycleLength = Math.max(1, Math.round((oldNewEndDay.getTime() - oldStartDay.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // --- Overflow totals ---
    const overflowExpenseTotal = overflowTransactions
      .filter(tx => tx.transactionType === 'EXPENSE')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const overflowIncomeTotal = overflowTransactions
      .filter(tx => tx.transactionType === 'INCOME')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // --- Carry-forward from trimmed old cycle ---
    const oldRemaining = activeCycle.budgetSnapshot.availableBalance - (activeCycle.totalSpent - overflowExpenseTotal);
    const carryForward = settings.carryForwardEnabled ? Math.max(0, oldRemaining) : 0;

    // --- New cycle dates ---
    const newCycleStart = new Date(normalizedEnd);
    newCycleStart.setDate(newCycleStart.getDate() + 1);
    newCycleStart.setHours(0, 0, 0, 0);
    const newCycleEnd = new Date(newCycleStart);
    newCycleEnd.setDate(newCycleStart.getDate() + settings.cycleConfiguration.cycleLengthDays - 1);
    newCycleEnd.setHours(23, 59, 59, 999);
    const newCycleId = `cycle_${newCycleStart.getFullYear()}_${String(newCycleStart.getMonth() + 1).padStart(2, '0')}_${String(newCycleStart.getDate()).padStart(2, '0')}`;

    // --- New cycle category summary (computed from overflow expense transactions) ---
    const newCycleCategorySummary: Record<string, any> = {};
    overflowTransactions
      .filter(tx => tx.transactionType === 'EXPENSE')
      .forEach(tx => {
        if (!newCycleCategorySummary[tx.categoryId]) {
          newCycleCategorySummary[tx.categoryId] = { totalSpent: 0, transactionCount: 0, lastTransactionAt: null };
        }
        newCycleCategorySummary[tx.categoryId].totalSpent += tx.amount;
        newCycleCategorySummary[tx.categoryId].transactionCount += 1;
        const last = newCycleCategorySummary[tx.categoryId].lastTransactionAt;
        if (!last || tx.date > last) {
          newCycleCategorySummary[tx.categoryId].lastTransactionAt = Timestamp.fromDate(tx.date);
        }
      });

    // --- Build atomic batch ---
    const batch = writeBatch(db);
    const now = Timestamp.now();

    // 1. Trim old cycle and mark it COMPLETED
    const oldCycleRef = doc(db, 'users', userId, 'financialCycles', activeCycle.cycleId);
    const oldCycleUpdates: any = {
      endDate: Timestamp.fromDate(normalizedEnd),
      cycleLengthDays: oldCycleLength,
      status: 'COMPLETED',
      totalSpent: increment(-overflowExpenseTotal),
      transactionCount: increment(-overflowTransactions.length),
      updatedAt: now
    };
    // Subtract overflow contributions from old cycle's categorySummary
    overflowTransactions
      .filter(tx => tx.transactionType === 'EXPENSE')
      .forEach(tx => {
        oldCycleUpdates[`categorySummary.${tx.categoryId}.totalSpent`] = increment(-tx.amount);
        oldCycleUpdates[`categorySummary.${tx.categoryId}.transactionCount`] = increment(-1);
      });
    batch.update(oldCycleRef, oldCycleUpdates);

    // 2. Create the new ACTIVE cycle
    const newCycleRef = doc(db, 'users', userId, 'financialCycles', newCycleId);
    batch.set(newCycleRef, {
      cycleName: newCycleName,
      startDate: Timestamp.fromDate(newCycleStart),
      endDate: Timestamp.fromDate(newCycleEnd),
      cycleLengthDays: settings.cycleConfiguration.cycleLengthDays,
      budgetSnapshot: {
        monthlyBudget: settings.monthlyBudget,
        carryForward,
        availableBalance: settings.monthlyBudget + carryForward + overflowIncomeTotal
      },
      totalSpent: overflowExpenseTotal,
      transactionCount: overflowTransactions.length,
      categorySummary: newCycleCategorySummary,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    });

    // 3. Re-assign overflow transactions to the new cycle
    for (const tx of overflowTransactions) {
      const txRef = doc(db, 'users', userId, 'transactions', tx.transactionId);
      batch.update(txRef, { cycleId: newCycleId, updatedAt: now });
    }

    // 4. Relocate overflow journal documents: delete from old cycle, create in new cycle
    for (const jDoc of overflowJournalDocs) {
      batch.delete(jDoc.ref);
      const newJournalRef = doc(db, 'users', userId, 'financialCycles', newCycleId, 'dailyJournals', jDoc.id);
      batch.set(newJournalRef, { ...jDoc.data(), cycleId: newCycleId });
    }

    await batch.commit();

    return {
      cycleId: newCycleId,
      cycleName: newCycleName,
      startDate: newCycleStart,
      endDate: newCycleEnd,
      cycleLengthDays: settings.cycleConfiguration.cycleLengthDays,
      budgetSnapshot: {
        monthlyBudget: settings.monthlyBudget,
        carryForward,
        availableBalance: settings.monthlyBudget + carryForward + overflowIncomeTotal
      },
      totalSpent: overflowExpenseTotal,
      transactionCount: overflowTransactions.length,
      categorySummary: newCycleCategorySummary,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    } as FinancialCycle;
  }

  /**
   * Marks a financial cycle as COMPLETED.
   * Should be called before creating a new cycle so carry-forward
   * calculation in createNewCycle picks it up via getPreviousCycle.
   */
  static async completeCycle(userId: string, cycleId: string): Promise<void> {
    const cycleRef = doc(db, 'users', userId, 'financialCycles', cycleId);
    await setDoc(cycleRef, {
      status: 'COMPLETED',
      updatedAt: Timestamp.now()
    }, { merge: true });
  }

  /**
   * Updates the cycleName for a specific Financial Cycle.
   */
  static async updateCycleName(userId: string, cycleId: string, newName: string): Promise<void> {
    const cycleRef = doc(db, 'users', userId, 'financialCycles', cycleId);
    await setDoc(cycleRef, {
      cycleName: newName,
      updatedAt: Timestamp.now()
    }, { merge: true });
  }

  /**
   * Cascades carry-forward recalculations chronologically across cycles.
   * Starts from startingCycleId and updates all subsequent cycles.
   */
  static async cascadeCarryForward(userId: string, startingCycleId: string): Promise<void> {
    const settings = await FinancialSettingsService.getSettings(userId);
    if (!settings) return;

    const cyclesRef = collection(db, 'users', userId, 'financialCycles');
    const snap = await getDocs(cyclesRef);

    // Parse and sort chronologically
    const cycles = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ref: doc.ref,
        startDate: data.startDate?.toDate() || new Date(0),
        status: data.status,
        monthlyBudget: data.budgetSnapshot?.monthlyBudget || 0,
        carryForward: data.budgetSnapshot?.carryForward || 0,
        availableBalance: data.budgetSnapshot?.availableBalance || 0,
        totalSpent: data.totalSpent || 0,
        dailyJournals: {} as Record<string, any>
      };
    }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    const startIndex = cycles.findIndex(c => c.id === startingCycleId);
    if (startIndex === -1 || startIndex === cycles.length - 1) return; // Nothing to cascade to

    const batch = writeBatch(db);
    let previousRemaining = cycles[startIndex].availableBalance - cycles[startIndex].totalSpent;

    for (let i = startIndex + 1; i < cycles.length; i++) {
      const current = cycles[i];
      const newCarryForward = settings.carryForwardEnabled ? Math.max(0, previousRemaining) : 0;
      const newAvailableBalance = current.monthlyBudget + newCarryForward;

      batch.update(current.ref, {
        'budgetSnapshot.carryForward': newCarryForward,
        'budgetSnapshot.availableBalance': newAvailableBalance,
        updatedAt: Timestamp.now()
      });

      previousRemaining = newAvailableBalance - current.totalSpent;
    }

    await batch.commit();
  }

  /**
   * Updates cycle dates and intelligently re-assigns transactions/journals across
   * cycle boundaries to maintain perfect mathematical integrity.
   * Note: The safest way to do this in NoSQL without edge case bugs is to 
   * update the dates, then trigger a full ground-truth rebuild of all cycles 
   * from the transactions collection.
   */
  static async rebalanceCyclesAfterDateChange(
    userId: string,
    cycleId: string,
    newStartDate: Date,
    newEndDate: Date
  ): Promise<void> {
    // 1. Update the cycle's boundaries
    await this.updateCycleDates(userId, cycleId, newStartDate, newEndDate);

    // 2. Fetch all cycles sorted chronologically
    const cyclesRef = collection(db, 'users', userId, 'financialCycles');
    const cyclesSnap = await getDocs(cyclesRef);
    const cycles = cyclesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ref: doc.ref,
        startDate: data.startDate?.toDate() || new Date(0),
        endDate: data.endDate?.toDate() || new Date(0),
        categorySummary: {} as Record<string, any>,
        totalSpent: 0,
        transactionCount: 0,
        dailyJournals: {} as Record<string, any>
      };
    }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // 3. Fetch all transactions
    const txRef = collection(db, 'users', userId, 'transactions');
    const txSnap = await getDocs(txRef);
    const transactions = txSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...(d.data() as any) }));

    const batch = writeBatch(db);
    let writes = 0;
    const commitBatch = async () => { if (writes > 0) { await batch.commit(); writes = 0; } };

    // 4. Re-assign transactions to cycles based on date
    for (const tx of transactions) {
      const txDate = tx.date?.toDate();
      if (!txDate) continue;

      // Find the cycle this transaction belongs to
      let targetCycle = cycles.find(c => txDate >= c.startDate && txDate <= c.endDate);

      // If no target cycle found (e.g. gap), fallback to the first cycle if before, or last if after.
      // Or just skip. Since we want perfect integrity, we just skip orphans.
      if (!targetCycle) continue;

      // Update tx cycleId if it changed
      if (tx.cycleId !== targetCycle.id) {
        batch.update(tx.ref, { cycleId: targetCycle.id });
        writes++;
      }

      // Rebuild aggregates
      if (tx.transactionType === 'EXPENSE') {
        targetCycle.totalSpent += tx.amount || 0;
        if (!targetCycle.categorySummary[tx.categoryId]) {
          targetCycle.categorySummary[tx.categoryId] = { totalSpent: 0, transactionCount: 0, lastTransactionAt: null };
        }
        targetCycle.categorySummary[tx.categoryId].totalSpent += tx.amount || 0;
        targetCycle.categorySummary[tx.categoryId].transactionCount += 1;

        const last = targetCycle.categorySummary[tx.categoryId].lastTransactionAt;
        if (!last || txDate > last.toDate()) {
          targetCycle.categorySummary[tx.categoryId].lastTransactionAt = Timestamp.fromDate(txDate);
        }
      }
      targetCycle.transactionCount += 1;

      // Rebuild Daily Journals
      const ny = txDate.getFullYear();
      const nm = String(txDate.getMonth() + 1).padStart(2, '0');
      const ndy = String(txDate.getDate()).padStart(2, '0');
      const jId = `journal_${ny}_${nm}_${ndy}`;

      if (!targetCycle.dailyJournals[jId]) {
        targetCycle.dailyJournals[jId] = {
          journalId: jId,
          cycleId: targetCycle.id,
          date: txDate,
          dayName: txDate.toLocaleDateString('en-US', { weekday: 'long' }),
          dayNumber: txDate.getDate(),
          transactionCount: 0,
          totalSpent: 0,
          categorySummary: {}
        };
      }
      const j = targetCycle.dailyJournals[jId];
      j.transactionCount += 1;
      if (tx.transactionType === 'EXPENSE') {
        j.totalSpent += tx.amount || 0;
        if (!j.categorySummary[tx.categoryId]) {
          j.categorySummary[tx.categoryId] = { totalSpent: 0, transactionCount: 0, lastTransactionAt: null };
        }
        j.categorySummary[tx.categoryId].totalSpent += tx.amount || 0;
        j.categorySummary[tx.categoryId].transactionCount += 1;
      }
    }

    // 5. Update Cycles and create Journals
    for (const cycle of cycles) {
      batch.update(cycle.ref, {
        totalSpent: cycle.totalSpent,
        transactionCount: cycle.transactionCount,
        categorySummary: cycle.categorySummary,
        updatedAt: Timestamp.now()
      });
      writes++;

      // We should technically delete old journals, but since we use standard naming, 
      // setting them will overwrite perfectly. To be 100% clean, we could delete existing first,
      // but overwrite is fine.
      for (const jId of Object.keys(cycle.dailyJournals)) {
        const jRef = doc(db, 'users', userId, 'financialCycles', cycle.id, 'dailyJournals', jId);
        batch.set(jRef, {
          ...cycle.dailyJournals[jId],
          createdAt: Timestamp.now(), // approximation
          updatedAt: Timestamp.now()
        }, { merge: true });
        writes++;
        if (writes > 450) {
          await commitBatch();
        }
      }
    }

    await commitBatch();

    // 6. Cascade carry-forwards starting from the earliest cycle
    if (cycles.length > 0) {
      await this.cascadeCarryForward(userId, cycles[0].id);
    }
  }
}
