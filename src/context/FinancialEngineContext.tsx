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
import { useAuth } from './AuthContext';

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
  updateFastEntry: (fastEntryId: string, updates: Partial<FastEntry>) => Promise<void>;
  deleteFastEntry: (fastEntryId: string) => Promise<void>;
  toggleCategoryVisibility: (categoryId: string) => Promise<void>;
}

const FinancialEngineContext = createContext<FinancialEngineContextType | undefined>(undefined);

export const useFinancialEngine = () => {
  const context = useContext(FinancialEngineContext);
  if (context === undefined) {
    throw new Error('useFinancialEngine must be used within a FinancialEngineProvider');
  }
  return context;
};

export const FinancialEngineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.userId || '';

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
      if (!isAuthenticated || !userId) {
        if (mounted) {
          setSettings(null);
          setActiveCycle(null);
          setCategories([]);
          setTemplates([]);
          setFastEntries([]);
          setTransactions([]);
          setDailyJournals([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // --- PHASE 3 ONBOARDING GUARD ---
        // Check whether this user has completed onboarding before loading or
        // auto-creating any financial data.  A new user who lands here mid-
        // onboarding must NOT get default settings (budget 1500, cycle "Current
        // Cycle") written over their chosen values.
        //
        // getUserInitializationState returns:
        //   true  — settings doc exists with isOnboarded=true, OR legacy user
        //           without the field (treated as already onboarded).
        //   false — no settings doc, or isOnboarded is explicitly false.
        const isOnboarded = await FinancialSettingsService.getUserInitializationState(userId);
        if (!isOnboarded) {
          // New user who has not yet completed onboarding.
          // Leave settings and cycle null — the onboarding flow will
          // call OnboardingService.completeOnboarding() to initialize them.
          if (mounted) {
            setSettings(null);
            setActiveCycle(null);
            setIsLoading(false);
          }
          return;
        }
        // --- END ONBOARDING GUARD ---

        // 1. Fetch or Initialize Settings
        let currentSettings = await FinancialSettingsService.getSettings(userId);
        if (!currentSettings) {
          // Setup a default budget of 1500 for the new user
          currentSettings = await FinancialSettingsService.initializeSettings(userId, {
            monthlyBudget: 1500,
            currency: 'INR'
          });
        }
        
        if (!mounted) return;
        setSettings(currentSettings);

        // 2. Fetch or Initialize Active Cycle
        let cycle = await FinancialCycleService.getActiveCycle(userId);
        if (!cycle) {
          cycle = await FinancialCycleService.createNewCycle(userId, currentSettings, "Current Cycle");
        }

        if (!mounted) return;
        setActiveCycle(cycle);

        // 3. Fetch Active Global Categories
        console.log("Fetching active global categories...");
        const activeCategories = await CategoryService.getActiveCategories();
        if (!mounted) return;
        setCategories(activeCategories);

        // 3b. Fetch Active Global Templates
        const activeTemplates = await TemplateService.getActiveTemplates();
        if (!mounted) return;
        setTemplates(activeTemplates);

        // 4. Fetch Fast Entries
        const userFastEntries = await FastEntryService.getFastEntries(userId);
        if (!mounted) return;
        setFastEntries(userFastEntries);


          const userTransactions = await TransactionService.getTransactionsForCycle(userId, cycle.cycleId);
          
          // MIGRATION: Automatically heal older transactions without journalIds
          const missing = userTransactions.filter(tx => !tx.journalId);
          if (missing.length > 0) {
            console.log("Migrating missing journals...", missing.length);
            await TransactionService.migrateMissingJournals(userId, cycle.cycleId, missing);
            // Re-fetch transactions after fixing
            const fixedTransactions = await TransactionService.getTransactionsForCycle(userId, cycle.cycleId);
            if (!mounted) return;
            setTransactions(fixedTransactions);
          }
          
          // MIGRATION: Category Summary Initialization
          const currentCycle = cycle;
          const finalTransactions = missing.length > 0 ? (await TransactionService.getTransactionsForCycle(userId, cycle.cycleId)) : userTransactions;

          if (!currentCycle.categorySummary) {
            console.log("Migrating categorySummary...");
            const categorySummary: Record<string, any> = {};
            activeCategories.forEach(cat => {
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
            
            const cycleRef = doc(db, 'users', userId, 'financialCycles', currentCycle.cycleId);
            await updateDoc(cycleRef, { categorySummary });
            
            currentCycle.categorySummary = categorySummary;
            if (mounted) setActiveCycle({...currentCycle});
          }

          if (missing.length === 0) {
            if (!mounted) return;
            setTransactions(userTransactions);
          }
          
          const userJournals = await DailyJournalService.getDailyJournalsForCycle(userId, cycle.cycleId);
          
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

              const jRef = doc(db, 'users', userId, 'financialCycles', cycle.cycleId, 'dailyJournals', journal.journalId);
              await updateDoc(jRef, { categorySummary: jSummary });
              return { ...journal, categorySummary: jSummary };
            }
            return journal;
          }));

          if (!mounted) return;
          setDailyJournals(migratedJournals);

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
  }, [userId, isAuthenticated]); // Re-runs whenever the authenticated user changes

  const refreshCycle = async () => {
    try {
      const cycle = await FinancialCycleService.getActiveCycle(userId);
      if (cycle) {
        setActiveCycle(cycle);
      }
    } catch (err) {
      console.error("Error refreshing cycle:", err);
    }
  };

  const refreshSettings = async () => {
    try {
      const currentSettings = await FinancialSettingsService.getSettings(userId);
      if (currentSettings) {
        setSettings(currentSettings);
      }
    } catch (err) {
      console.error("Error refreshing settings:", err);
    }
  };

  const refreshCategories = async () => {
    try {
      const activeCategories = await CategoryService.getActiveCategories();
      setCategories(activeCategories);
    } catch (err) {
      console.error("Error refreshing categories:", err);
    }
  };

  const toggleCategoryVisibility = async (categoryId: string) => {
    if (!settings) return;
    const currentHidden = settings.hiddenCategoryIds || [];
    const isHidden = currentHidden.includes(categoryId);
    
    const newHidden = isHidden 
      ? currentHidden.filter(id => id !== categoryId) 
      : [...currentHidden, categoryId];

    try {
      await FinancialSettingsService.updateSettings(userId, { hiddenCategoryIds: newHidden });
      setSettings({ ...settings, hiddenCategoryIds: newHidden });
    } catch (err) {
      console.error("Error toggling category visibility:", err);
    }
  };

  const refreshTransactions = async () => {
    try {
      if (activeCycle) {
        const userTransactions = await TransactionService.getTransactionsForCycle(userId, activeCycle.cycleId);
        setTransactions(userTransactions);
        
        const userJournals = await DailyJournalService.getDailyJournalsForCycle(userId, activeCycle.cycleId);
        setDailyJournals(userJournals);
      }
    } catch (err) {
      console.error("Error refreshing transactions:", err);
    }
  };

  const refreshFastEntries = async () => {
    try {
      const userFastEntries = await FastEntryService.getFastEntries(userId);
      setFastEntries(userFastEntries);
    } catch (err) {
      console.error("Error refreshing fast entries:", err);
    }
  };



  const updateFastEntry = async (fastEntryId: string, updates: Partial<FastEntry>) => {
    try {
      await FastEntryService.updateFastEntry(userId, fastEntryId, updates);
      await refreshFastEntries();
    } catch (err) {
      console.error("Error updating fast entry:", err);
      throw err;
    }
  };

  const deleteFastEntry = async (fastEntryId: string) => {
    try {
      await FastEntryService.deleteFastEntry(userId, fastEntryId);
      await refreshFastEntries();
    } catch (err) {
      console.error("Error deleting fast entry:", err);
      throw err;
    }
  };

  return (
    <FinancialEngineContext.Provider value={{ 
      settings, activeCycle, categories, templates, fastEntries, transactions, dailyJournals, isLoading, error, userId: userId, 
      refreshCycle, refreshSettings, refreshCategories, refreshTransactions,
        refreshFastEntries,
        updateFastEntry,
        deleteFastEntry,
        toggleCategoryVisibility
      }}
    >
      {children}
    </FinancialEngineContext.Provider>
  );
};
