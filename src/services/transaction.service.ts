import { collection, doc, Timestamp, writeBatch, increment, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ReceiptService } from './receipt.service';

export interface Transaction {
  transactionId: string;
  userId: string;
  cycleId: string;
  journalId: string;
  categoryId: string;
  templateId: string;
  transactionType: 'EXPENSE' | 'INCOME';
  title: string;
  amount: number;
  date: Date;
  note?: string;
  receiptUrl?: string;
  fastEntryId?: string;
  source?: string;
  transactionDetails: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class TransactionService {
  /**
   * Creates a new transaction and atomically updates the Financial Cycle's math.
   */
  static async createTransaction(
    userId: string, 
    cycleId: string, 
    transactionData: Omit<Transaction, 'transactionId' | 'userId' | 'cycleId' | 'journalId' | 'createdAt' | 'updatedAt'>,
    saveAsFastEntry: boolean,
    receiptFile?: File | null
  ): Promise<void> {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    
    // 1. Determine Journal ID and Day details
    const txDate = transactionData.date;
    const year = txDate.getFullYear();
    const month = String(txDate.getMonth() + 1).padStart(2, '0');
    const day = String(txDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const journalId = `journal_${dateStr.replace(/-/g, '_')}`; // journal_YYYY_MM_DD
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[txDate.getDay()];
    const dayNumber = txDate.getDate();

    // 2. Transaction Document
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const newTxRef = doc(transactionsRef);
    
    const processedCategoryData = { ...transactionData.transactionDetails };
    // Dynamic FILE uploading has been removed. Universal global_receipt is used instead.

    // Global Receipt File
    let finalReceiptUrl = transactionData.receiptUrl;
    if (receiptFile) {
      const metadata = await ReceiptService.uploadReceipt(userId, newTxRef.id, 'global_receipt', receiptFile);
      finalReceiptUrl = metadata.url;
    }

    const newTx = {
      ...transactionData,
      receiptUrl: finalReceiptUrl,
      transactionDetails: processedCategoryData,
      date: Timestamp.fromDate(txDate), // Ensure Firebase Timestamp
      transactionId: newTxRef.id,
      userId,
      cycleId,
      journalId,
      createdAt: now,
      updatedAt: now
    };

    // Firestore rejects undefined values, so we remove them
    Object.keys(newTx).forEach(key => {
      if ((newTx as any)[key] === undefined) {
        delete (newTx as any)[key];
      }
    });
    
    batch.set(newTxRef, newTx);

    // 3. Daily Journal Update
    const journalRef = doc(db, 'users', userId, 'financialCycles', cycleId, 'dailyJournals', journalId);
    
    // We use set with merge: true. 
    // If it doesn't exist, it creates the fields. If it does, it merges.
    // For incrementing, we pass increment values.
    const isExpense = transactionData.transactionType === 'EXPENSE';
    
    const journalData: any = {
      journalId,
      cycleId,
      date: Timestamp.fromDate(new Date(dateStr + 'T00:00:00')), 
      dayName,
      dayNumber,
      transactionCount: increment(1),
      totalSpent: isExpense ? increment(transactionData.amount) : increment(0),
      createdAt: now, 
    };

    if (isExpense && transactionData.categoryId) {
      journalData.categorySummary = {
        [transactionData.categoryId]: {
          totalSpent: increment(transactionData.amount),
          transactionCount: increment(1),
          lastTransactionAt: now
        }
      };
    }

    batch.set(journalRef, journalData, { merge: true });

    // 4. Atomic Cycle Update
    const cycleRef = doc(db, 'users', userId, 'financialCycles', cycleId);
    
    if (transactionData.transactionType === 'EXPENSE') {
      const cycleUpdates: any = {
        totalSpent: increment(transactionData.amount),
        transactionCount: increment(1),
        updatedAt: now
      };
      
      if (transactionData.categoryId) {
        cycleUpdates[`categorySummary.${transactionData.categoryId}.totalSpent`] = increment(transactionData.amount);
        cycleUpdates[`categorySummary.${transactionData.categoryId}.transactionCount`] = increment(1);
        cycleUpdates[`categorySummary.${transactionData.categoryId}.lastTransactionAt`] = now;
      }
      
      batch.update(cycleRef, cycleUpdates);
    } else {
      // INCOME updates the available balance (starting balance for the cycle)
      batch.update(cycleRef, {
        'budgetSnapshot.availableBalance': increment(transactionData.amount),
        transactionCount: increment(1),
        updatedAt: now
      });
    }

    // 3. Fast Entry Creation (Optional)
    if (saveAsFastEntry) {
      const fastEntriesRef = collection(db, 'users', userId, 'fastEntries');
      const newFeRef = doc(fastEntriesRef);
      
      const newFe = {
        fastEntryId: newFeRef.id,
        transactionId: newTxRef.id,
        displayName: transactionData.title,
        usageCount: 0,
        createdAt: now,
        updatedAt: now
      };
      
      batch.set(newFeRef, newFe);
    }

    // Execute atomic batch
    await batch.commit();
  }

  /**
   * Deletes a transaction and reverses all associated totals in the journal, cycle, and category summary.
   */
  static async deleteTransaction(userId: string, cycleId: string, transaction: Transaction): Promise<void> {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    
    // 1. Delete the transaction document
    const txRef = doc(db, 'users', userId, 'transactions', transaction.transactionId);
    batch.delete(txRef);

    // 2. Decrement Journal Stats
    if (transaction.journalId) {
      const journalRef = doc(db, 'users', userId, 'financialCycles', cycleId, 'dailyJournals', transaction.journalId);
      const isExpense = transaction.transactionType === 'EXPENSE';
      const journalUpdates: any = {
        transactionCount: increment(-1),
        totalSpent: isExpense ? increment(-transaction.amount) : increment(0)
      };

      if (isExpense && transaction.categoryId) {
         journalUpdates[`categorySummary.${transaction.categoryId}.totalSpent`] = increment(-transaction.amount);
         journalUpdates[`categorySummary.${transaction.categoryId}.transactionCount`] = increment(-1);
      }

      batch.update(journalRef, journalUpdates);
    }

    // 3. Decrement Cycle and Category Summary Stats
    const cycleRef = doc(db, 'users', userId, 'financialCycles', cycleId);
    
    if (transaction.transactionType === 'EXPENSE') {
      const cycleUpdates: any = {
        totalSpent: increment(-transaction.amount),
        transactionCount: increment(-1),
        updatedAt: now
      };
      
      if (transaction.categoryId) {
        cycleUpdates[`categorySummary.${transaction.categoryId}.totalSpent`] = increment(-transaction.amount);
        cycleUpdates[`categorySummary.${transaction.categoryId}.transactionCount`] = increment(-1);
      }

      batch.update(cycleRef, cycleUpdates);
    } else {
      batch.update(cycleRef, {
        'budgetSnapshot.availableBalance': increment(-transaction.amount),
        transactionCount: increment(-1),
        updatedAt: now
      });
    }

    await batch.commit();
  }

  /**
   * Updates a transaction and adjusts all affected totals. 
   * If the category changed, it rolls back the old category and applies to the new.
   */
  static async updateTransaction(
    userId: string,
    cycleId: string,
    oldTransaction: Transaction,
    updates: Partial<Transaction>,
    receiptFile?: File | null
  ): Promise<void> {
    const batch = writeBatch(db);
    const now = Timestamp.now();

    // 1. Update the transaction document
    const txRef = doc(db, 'users', userId, 'transactions', oldTransaction.transactionId);
    
    const safeUpdates: any = { ...updates, updatedAt: now };
    delete safeUpdates.transactionId;
    delete safeUpdates.userId;
    delete safeUpdates.cycleId;
    delete safeUpdates.createdAt;

    if (safeUpdates.date && safeUpdates.date instanceof Date) {
       safeUpdates.date = Timestamp.fromDate(safeUpdates.date);
    }

    if (receiptFile) {
      const metadata = await ReceiptService.uploadReceipt(userId, oldTransaction.transactionId, 'global_receipt', receiptFile);
      safeUpdates.receiptUrl = metadata.url;
      // Note: we could delete the old global receipt here if we wanted to be perfectly clean, 
      // but standard firebase storage doesn't strictly require it if we overwrite the same path.
    }

    // Dynamic FILE uploading has been removed. Universal global_receipt is used instead.
    let finalCategoryData = oldTransaction.transactionDetails;
    if (safeUpdates.transactionDetails) {
      finalCategoryData = { ...safeUpdates.transactionDetails };
    }

    // Firestore rejects undefined values, so we remove them
    Object.keys(safeUpdates).forEach(key => {
      if (safeUpdates[key] === undefined) {
        delete safeUpdates[key];
      }
    });

    batch.update(txRef, safeUpdates);

    // We only need to adjust totals if amount or categoryId changed.
    // We assume transactionType doesn't change for an existing transaction (it's either an expense or income).
    // Also assuming date doesn't change drastically across cycles for now.
    
    if (oldTransaction.transactionType === 'EXPENSE') {
      const newAmount = updates.amount !== undefined ? updates.amount : oldTransaction.amount;
      const oldAmount = oldTransaction.amount;
      const amountDiff = newAmount - oldAmount;
      
      const newCategory = updates.categoryId !== undefined ? updates.categoryId : oldTransaction.categoryId;
      const oldCategory = oldTransaction.categoryId;
      const categoryChanged = newCategory !== oldCategory;

      const cycleRef = doc(db, 'users', userId, 'financialCycles', cycleId);
      
      const cycleUpdates: any = {
        totalSpent: increment(amountDiff),
        updatedAt: now
      };
      
      if (categoryChanged) {
        cycleUpdates[`categorySummary.${oldCategory}.totalSpent`] = increment(-oldAmount);
        cycleUpdates[`categorySummary.${oldCategory}.transactionCount`] = increment(-1);
        cycleUpdates[`categorySummary.${newCategory}.totalSpent`] = increment(newAmount);
        cycleUpdates[`categorySummary.${newCategory}.transactionCount`] = increment(1);
        cycleUpdates[`categorySummary.${newCategory}.lastTransactionAt`] = now;
      } else if (amountDiff !== 0) {
        cycleUpdates[`categorySummary.${oldCategory}.totalSpent`] = increment(amountDiff);
      }
      
      batch.update(cycleRef, cycleUpdates);

      // Adjust Journal if amount or category changed (assuming same journalId)
      if ((amountDiff !== 0 || categoryChanged) && oldTransaction.journalId) {
        const journalRef = doc(db, 'users', userId, 'financialCycles', cycleId, 'dailyJournals', oldTransaction.journalId);
        const journalUpdates: any = {};
        
        if (amountDiff !== 0) {
          journalUpdates.totalSpent = increment(amountDiff);
        }

        if (categoryChanged) {
          journalUpdates[`categorySummary.${oldCategory}.totalSpent`] = increment(-oldAmount);
          journalUpdates[`categorySummary.${oldCategory}.transactionCount`] = increment(-1);
          journalUpdates[`categorySummary.${newCategory}.totalSpent`] = increment(newAmount);
          journalUpdates[`categorySummary.${newCategory}.transactionCount`] = increment(1);
          journalUpdates[`categorySummary.${newCategory}.lastTransactionAt`] = now;
        } else if (amountDiff !== 0) {
          journalUpdates[`categorySummary.${oldCategory}.totalSpent`] = increment(amountDiff);
        }

        if (Object.keys(journalUpdates).length > 0) {
          batch.update(journalRef, journalUpdates);
        }
      }

    } else if (oldTransaction.transactionType === 'INCOME') {
      const newAmount = updates.amount !== undefined ? updates.amount : oldTransaction.amount;
      const amountDiff = newAmount - oldTransaction.amount;
      
      if (amountDiff !== 0) {
        const cycleRef = doc(db, 'users', userId, 'financialCycles', cycleId);
        batch.update(cycleRef, {
          'budgetSnapshot.availableBalance': increment(amountDiff),
          updatedAt: now
        });
      }
    }

    await batch.commit();
  }

  /**
   * Fetches all transactions for a specific Financial Cycle.
   */
  static async getTransactionsForCycle(userId: string, cycleId: string): Promise<Transaction[]> {
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    // Removed orderBy('date', 'desc') to avoid requiring a Firebase Composite Index
    const q = query(
      transactionsRef, 
      where('cycleId', '==', cycleId)
    );
    
    const snap = await getDocs(q);
    
    const transactions = snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        date: data.date?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Transaction;
    });

    // Sort in memory (descending by date)
    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Fetches transactions specifically for the selected journals.
   * Handles Firestore's 'in' query limit of 10 items by batching.
   */
  static async getTransactionsForJournals(userId: string, journalIds: string[]): Promise<Transaction[]> {
    if (!journalIds || journalIds.length === 0) return [];
    
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const allTransactions: Transaction[] = [];
    
    // Firestore 'in' queries are limited to 10 items
    const chunkSize = 10;
    for (let i = 0; i < journalIds.length; i += chunkSize) {
      const chunk = journalIds.slice(i, i + chunkSize);
      const q = query(
        transactionsRef,
        where('journalId', 'in', chunk)
      );
      
      const snap = await getDocs(q);
      const chunkTxs = snap.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          date: data.date?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Transaction;
      });
      
      allTransactions.push(...chunkTxs);
    }
    
    // Sort in memory (descending by date)
    return allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Temporary migration function to heal transactions created before Daily Journals architecture
   */
  static async migrateMissingJournals(userId: string, cycleId: string, missingTransactions: Transaction[]): Promise<void> {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    
    // Group transactions by generated journalId
    const journalsToCreate: Record<string, any> = {};

    for (const tx of missingTransactions) {
      const txDate = tx.date;
      const year = txDate.getFullYear();
      const month = String(txDate.getMonth() + 1).padStart(2, '0');
      const day = String(txDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const journalId = `journal_${dateStr.replace(/-/g, '_')}`;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[txDate.getDay()];
      const dayNumber = txDate.getDate();

      if (!journalsToCreate[journalId]) {
        journalsToCreate[journalId] = {
          journalId,
          cycleId,
          date: Timestamp.fromDate(new Date(dateStr + 'T00:00:00')),
          dayName,
          dayNumber,
          transactionCount: 0,
          totalSpent: 0,
          createdAt: now,
        };
      }

      journalsToCreate[journalId].transactionCount += 1;
      if (tx.transactionType === 'EXPENSE') {
        journalsToCreate[journalId].totalSpent += tx.amount;
      }

      // Update the transaction itself with the journalId
      const txRef = doc(db, 'users', userId, 'transactions', tx.transactionId);
      batch.update(txRef, { journalId });
    }

    // Add journal sets to batch
    for (const [jId, jData] of Object.entries(journalsToCreate)) {
      const journalRef = doc(db, 'users', userId, 'financialCycles', cycleId, 'dailyJournals', jId);
      batch.set(journalRef, jData, { merge: true });
    }

    await batch.commit();
  }

  /**
   * Temporarily fix dates from Aug 5 to Aug 4
   */
  static async fixDates(userId: string, cycleId: string): Promise<void> {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    const txRef = collection(db, 'users', userId, 'transactions');
    const q = query(txRef, where('cycleId', '==', cycleId));
    const snap = await getDocs(q);

    const oldJournalId = 'journal_2026_08_05';
    const newJournalId = 'journal_2026_08_04';

    let movedCount = 0;
    let movedAmount = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      // Move all current transactions to Aug 4
      if (data.journalId === oldJournalId) {
        batch.update(docSnap.ref, {
          journalId: newJournalId,
          date: Timestamp.fromDate(new Date('2026-08-04T12:00:00Z'))
        });
        movedCount++;
        if (data.transactionType === 'EXPENSE') {
          movedAmount += data.amount;
        }
      }
    }

    if (movedCount > 0) {
      const oldJournalRef = doc(db, 'users', userId, 'financialCycles', cycleId, 'dailyJournals', oldJournalId);
      const newJournalRef = doc(db, 'users', userId, 'financialCycles', cycleId, 'dailyJournals', newJournalId);

      // Create/Update new journal (Aug 4)
      batch.set(newJournalRef, {
        journalId: newJournalId,
        cycleId,
        date: Timestamp.fromDate(new Date('2026-08-04T00:00:00Z')),
        dayName: 'Tuesday',
        dayNumber: 4,
        transactionCount: increment(movedCount),
        totalSpent: increment(movedAmount),
        createdAt: now,
      }, { merge: true });

      // Delete old journal (Aug 5) since we moved everything
      batch.delete(oldJournalRef);
      
      await batch.commit();
      console.log('Fixed dates successfully!');
    }
  }
}
