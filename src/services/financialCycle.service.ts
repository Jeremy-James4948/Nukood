import { collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FinancialSettings } from './financialSettings.service';

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
    cycleName: string
  ): Promise<FinancialCycle> {
    
    const previousCycle = await this.getPreviousCycle(userId);
    let carryForward = 0;
    
    if (settings.carryForwardEnabled && previousCycle) {
      carryForward = Math.max(0, previousCycle.budgetSnapshot.availableBalance - previousCycle.totalSpent);
    }
    
    const availableBalance = settings.monthlyBudget + carryForward;
    
    // Calculate dates
    // If there is a previous cycle, the new cycle starts the day after it ended.
    // Otherwise, it starts based on the settings config.
    const startDate = previousCycle 
      ? new Date(previousCycle.endDate.getTime() + 24 * 60 * 60 * 1000) 
      : new Date(settings.cycleConfiguration.startDate);
      
    // Set time to beginning of the day to ensure boundary tracking is perfect
    startDate.setHours(0, 0, 0, 0);
    
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
   * Updates the cycleName for a specific Financial Cycle.
   */
  static async updateCycleName(userId: string, cycleId: string, newName: string): Promise<void> {
    const cycleRef = doc(db, 'users', userId, 'financialCycles', cycleId);
    await setDoc(cycleRef, { 
      cycleName: newName,
      updatedAt: Timestamp.now()
    }, { merge: true });
  }
}
