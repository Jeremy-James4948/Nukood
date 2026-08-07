import { collection, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { FinancialCycle } from '../../services/financialCycle.service';
import { DailyJournal } from '../../services/dailyJournal.service';

export async function createMockArchive(userId: string) {
  const batch = writeBatch(db);
  const now = new Date();
  
  const cycleId = 'cycle_mock_2026_07';
  const cycleRef = doc(db, 'users', userId, 'financialCycles', cycleId);
  
  const startDate = new Date(2026, 6, 15); // July 15
  const endDate = new Date(2026, 7, 14); // Aug 14

  const mockCycle = {
    cycleName: "July Budget",
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    cycleLengthDays: 31,
    budgetSnapshot: {
      monthlyBudget: 2500,
      carryForward: 0,
      availableBalance: 2500,
    },
    totalSpent: 1943,
    transactionCount: 7,
    categorySummary: {
      'cat_food': { totalSpent: 420, transactionCount: 3, lastTransactionAt: Timestamp.now() },
      'cat_transport': { totalSpent: 120, transactionCount: 1, lastTransactionAt: Timestamp.now() },
      'cat_groceries': { totalSpent: 810, transactionCount: 2, lastTransactionAt: Timestamp.now() },
      'cat_shopping': { totalSpent: 593, transactionCount: 1, lastTransactionAt: Timestamp.now() },
    },
    status: 'COMPLETED',
    createdAt: Timestamp.fromDate(startDate),
    updatedAt: Timestamp.fromDate(endDate)
  };

  batch.set(cycleRef, mockCycle);

  const mockDays = [
    { date: '16', month: 'Jul', fullDate: '2026-07-16', expenses: 120 },
    { date: '21', month: 'Jul', fullDate: '2026-07-21', expenses: 45 },
    { date: '28', month: 'Jul', fullDate: '2026-07-28', expenses: 320 },
    { date: '01', month: 'Aug', fullDate: '2026-08-01', expenses: 810 },
    { date: '05', month: 'Aug', fullDate: '2026-08-05', expenses: 540 },
    { date: '11', month: 'Aug', fullDate: '2026-08-11', expenses: 108 }
  ];

  for (const day of mockDays) {
    const journalId = `journal_${day.fullDate.replace(/-/g, '_')}`;
    const journalRef = doc(db, 'users', userId, 'financialCycles', cycleId, 'dailyJournals', journalId);
    
    const d = new Date(`${day.fullDate}T12:00:00Z`);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    batch.set(journalRef, {
      journalId,
      cycleId,
      date: Timestamp.fromDate(d),
      dayName: days[d.getDay()],
      dayNumber: d.getDate(),
      transactionCount: 1,
      totalSpent: day.expenses,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }

  await batch.commit();
}
