import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface DailyJournal {
  journalId: string;
  cycleId: string;
  date: Date;
  dayName: string;
  dayNumber: number;
  transactionCount: number;
  totalSpent: number;
  categorySummary?: Record<string, {
    totalSpent: number;
    transactionCount: number;
    lastTransactionAt?: Date | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export class DailyJournalService {
  /**
   * Fetches all Daily Journals for a specific Financial Cycle, ordered chronologically (oldest first).
   */
  static async getDailyJournalsForCycle(userId: string, cycleId: string): Promise<DailyJournal[]> {
    const journalsRef = collection(db, 'users', userId, 'financialCycles', cycleId, 'dailyJournals');
    
    // We can use an in-memory sort or Firestore orderBy depending on indexes.
    // For now, let's fetch all for the cycle and sort in memory to avoid needing a new index immediately.
    const snap = await getDocs(journalsRef);
    
    const journals = snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        date: data.date?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as DailyJournal;
    });

    // Sort ascending by date (oldest first)
    return journals.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
