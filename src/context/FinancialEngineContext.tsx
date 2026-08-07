import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FinancialSettings, FinancialSettingsService } from '../services/financialSettings.service';
import { FinancialCycle, FinancialCycleService } from '../services/financialCycle.service';
import { Category, CategoryService } from '../services/category.service';
import { FastEntry, FastEntryService } from '../services/fastEntry.service';
import { Transaction, TransactionService } from '../services/transaction.service';
import { TransactionTemplate } from '../constants/templates';
import { TemplateService } from '../services/template.service';
import { DailyJournal, DailyJournalService } from '../services/dailyJournal.service';

interface FinancialEngineContextType {
  settings: FinancialSettings | null;
  activeCycle: FinancialCycle | null;
  categories: Category[];
  templates: TransactionTemplate[];
  fastEntries: FastEntry[];
  transactions: Transaction[];
  dailyJournals: DailyJournal[];
  isLoading: boolean;
  error: Error | null;
  userId: string;
  refreshCycle: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshFastEntries: () => Promise<void>;
  updateCategory: (categoryId: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateFastEntry: (fastEntryId: string, updates: Partial<FastEntry>) => Promise<void>;
  deleteFastEntry: (fastEntryId: string) => Promise<void>;
}

const FinancialEngineContext = createContext<FinancialEngineContextType | undefined>(undefined);

export const useFinancialEngine = () => {
  const context = useContext(FinancialEngineContext);
  if (context === undefined) {
    throw new Error('useFinancialEngine must be used within a FinancialEngineProvider');
  }
  return context;
};

// Mock user for now since auth isn't implemented
const MOCK_USER_ID = "demo-user-1";

export const FinancialEngineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<FinancialSettings | null>(null);
  const [activeCycle, setActiveCycle] = useState<FinancialCycle | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [fastEntries, setFastEntries] = useState<FastEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyJournals, setDailyJournals] = useState<DailyJournal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeEngine = async () => {
      try {
        // 1. Fetch or Initialize Settings
        let currentSettings = await FinancialSettingsService.getSettings(MOCK_USER_ID);
        if (!currentSettings) {
          // Setup a default budget of 1500 for the demo user
          currentSettings = await FinancialSettingsService.initializeSettings(MOCK_USER_ID, {
            monthlyBudget: 1500,
            currency: 'INR'
          });
        }
        
        if (!mounted) return;
        setSettings(currentSettings);

        // 2. Fetch or Initialize Active Cycle
        let cycle = await FinancialCycleService.getActiveCycle(MOCK_USER_ID);
        if (!cycle) {
          cycle = await FinancialCycleService.createNewCycle(MOCK_USER_ID, currentSettings, "Current Cycle");
        }

        if (!mounted) return;
        setActiveCycle(cycle);

        // 3. Fetch or Initialize Categories
        console.log("Fetching categories for user:", MOCK_USER_ID);
        // MIGRATION: Force sync categories to backend to push the new color scheme
        await CategoryService.syncDefaultCategories(MOCK_USER_ID);
        const userCategories = await CategoryService.getCategories(MOCK_USER_ID);
        console.log("Fetched categories:", userCategories);
        if (!mounted) return;
        setCategories(userCategories);

        // 3b. Fetch or Initialize Templates
        // MIGRATION: Force sync templates to backend to push the new Grocery changes
        await TemplateService.syncDefaultTemplates(MOCK_USER_ID);
        const userTemplates = await TemplateService.getTemplates(MOCK_USER_ID);
        if (!mounted) return;
        setTemplates(userTemplates);

        // 4. Fetch Fast Entries
        const userFastEntries = await FastEntryService.getFastEntries(MOCK_USER_ID);
        if (!mounted) return;
        setFastEntries(userFastEntries);

        // 5. Fetch Transactions and Daily Journals if there's an active cycle
        if (cycle) {
          // Temporary budget overwrite request from user
          await FinancialCycleService.setTemporaryBudget(MOCK_USER_ID, cycle.cycleId, 15000);
          // Refetch cycle to get the updated availableBalance
          const updatedCycle = await FinancialCycleService.getActiveCycle(MOCK_USER_ID);
          if (updatedCycle && mounted) setActiveCycle(updatedCycle);

          const userTransactions = await TransactionService.getTransactionsForCycle(MOCK_USER_ID, cycle.cycleId);
          
          // MIGRATION: Automatically heal older transactions without journalIds
          const missing = userTransactions.filter(tx => !tx.journalId);
          if (missing.length > 0) {
            console.log("Migrating missing journals...", missing.length);
            await TransactionService.migrateMissingJournals(MOCK_USER_ID, cycle.cycleId, missing);
            // Re-fetch transactions after fixing
            const fixedTransactions = await TransactionService.getTransactionsForCycle(MOCK_USER_ID, cycle.cycleId);
            if (!mounted) return;
            setTransactions(fixedTransactions);
          }
          
          // MIGRATION: Category Summary Initialization
          const currentCycle = updatedCycle || cycle;
          const finalTransactions = missing.length > 0 ? (await TransactionService.getTransactionsForCycle(MOCK_USER_ID, cycle.cycleId)) : userTransactions;

          if (!currentCycle.categorySummary) {
            console.log("Migrating categorySummary...");
            const categorySummary: Record<string, any> = {};
            userCategories.forEach(cat => {
               categorySummary[cat.categoryId] = {
                 totalSpent: 0,
                 transactionCount: 0,
                 lastTransactionAt: null
               };
            });
            
            finalTransactions.forEach(tx => {
               if (tx.transactionType === 'EXPENSE' && categorySummary[tx.categoryId]) {
                 categorySummary[tx.categoryId].totalSpent += tx.amount;
                 categorySummary[tx.categoryId].transactionCount += 1;
                 
                 const currentLast = categorySummary[tx.categoryId].lastTransactionAt;
                 if (!currentLast || tx.date > currentLast) {
                    categorySummary[tx.categoryId].lastTransactionAt = tx.date;
                 }
               }
            });
            
            const cycleRef = doc(db, 'users', MOCK_USER_ID, 'financialCycles', currentCycle.cycleId);
            await updateDoc(cycleRef, { categorySummary });
            
            currentCycle.categorySummary = categorySummary;
            if (mounted) setActiveCycle({...currentCycle});
          }

          if (missing.length === 0) {
            if (!mounted) return;
            setTransactions(userTransactions);
          }
          
          const userJournals = await DailyJournalService.getDailyJournalsForCycle(MOCK_USER_ID, cycle.cycleId);
          
          // MIGRATION: Journal Category Summary
          let journalsModified = false;
          const migratedJournals = await Promise.all(userJournals.map(async (journal) => {
            if (!journal.categorySummary) {
              journalsModified = true;
              const journalTx = finalTransactions.filter(t => t.journalId === journal.journalId && t.transactionType === 'EXPENSE');
              const jSummary: Record<string, any> = {};
              
              journalTx.forEach(tx => {
                if (!jSummary[tx.categoryId]) {
                  jSummary[tx.categoryId] = { totalSpent: 0, transactionCount: 0, lastTransactionAt: null };
                }
                jSummary[tx.categoryId].totalSpent += tx.amount;
                jSummary[tx.categoryId].transactionCount += 1;
                const currentLast = jSummary[tx.categoryId].lastTransactionAt;
                if (!currentLast || tx.date > currentLast) {
                   jSummary[tx.categoryId].lastTransactionAt = tx.date;
                }
              });

              const jRef = doc(db, 'users', MOCK_USER_ID, 'financialCycles', cycle.cycleId, 'dailyJournals', journal.journalId);
              await updateDoc(jRef, { categorySummary: jSummary });
              return { ...journal, categorySummary: jSummary };
            }
            return journal;
          }));

          if (!mounted) return;
          setDailyJournals(migratedJournals);
        }

      } catch (err) {
        if (mounted) {
          console.error("Error initializing financial engine:", err);
          setError(err instanceof Error ? err : new Error('Unknown error in Financial Engine'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeEngine();

    return () => {
      mounted = false;
    };
  }, []);

  const refreshCycle = async () => {
    try {
      const cycle = await FinancialCycleService.getActiveCycle(MOCK_USER_ID);
      if (cycle) {
        setActiveCycle(cycle);
      }
    } catch (err) {
      console.error("Error refreshing cycle:", err);
    }
  };

  const refreshSettings = async () => {
    try {
      const currentSettings = await FinancialSettingsService.getSettings(MOCK_USER_ID);
      if (currentSettings) {
        setSettings(currentSettings);
      }
    } catch (err) {
      console.error("Error refreshing settings:", err);
    }
  };

  const refreshCategories = async () => {
    try {
      const userCategories = await CategoryService.getCategories(MOCK_USER_ID);
      setCategories(userCategories);
    } catch (err) {
      console.error("Error refreshing categories:", err);
    }
  };

  const refreshTransactions = async () => {
    try {
      if (activeCycle) {
        const userTransactions = await TransactionService.getTransactionsForCycle(MOCK_USER_ID, activeCycle.cycleId);
        setTransactions(userTransactions);
        
        const userJournals = await DailyJournalService.getDailyJournalsForCycle(MOCK_USER_ID, activeCycle.cycleId);
        setDailyJournals(userJournals);
      }
    } catch (err) {
      console.error("Error refreshing transactions:", err);
    }
  };

  const refreshFastEntries = async () => {
    try {
      const userFastEntries = await FastEntryService.getFastEntries(MOCK_USER_ID);
      setFastEntries(userFastEntries);
    } catch (err) {
      console.error("Error refreshing fast entries:", err);
    }
  };

  const updateCategory = async (categoryId: string, updates: Partial<Category>) => {
    try {
      await CategoryService.updateCategory(MOCK_USER_ID, categoryId, updates);
      await refreshCategories();
    } catch (err) {
      console.error("Error updating category:", err);
      throw err;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      await CategoryService.deleteCategory(MOCK_USER_ID, categoryId);
      await refreshCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
      throw err;
    }
  };

  const updateFastEntry = async (fastEntryId: string, updates: Partial<FastEntry>) => {
    try {
      await FastEntryService.updateFastEntry(MOCK_USER_ID, fastEntryId, updates);
      await refreshFastEntries();
    } catch (err) {
      console.error("Error updating fast entry:", err);
      throw err;
    }
  };

  const deleteFastEntry = async (fastEntryId: string) => {
    try {
      await FastEntryService.deleteFastEntry(MOCK_USER_ID, fastEntryId);
      await refreshFastEntries();
    } catch (err) {
      console.error("Error deleting fast entry:", err);
      throw err;
    }
  };

  return (
    <FinancialEngineContext.Provider value={{ 
      settings, activeCycle, categories, templates, fastEntries, transactions, dailyJournals, isLoading, error, userId: MOCK_USER_ID, 
      refreshCycle, refreshSettings, refreshCategories, refreshTransactions, refreshFastEntries, updateCategory, deleteCategory, updateFastEntry, deleteFastEntry 
    }}>
      {children}
    </FinancialEngineContext.Provider>
  );
};
