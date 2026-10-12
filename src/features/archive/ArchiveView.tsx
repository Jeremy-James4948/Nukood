import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Drawer } from 'vaul';
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  X,
  ShoppingBag,
  Coffee,
  Film,
  Train,
  ChevronDown,
  Receipt
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CATEGORY_COLORS, CATEGORY_DEF } from '../../constants';
import { useCurrencyFormatter } from '../../utils/currency';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { FinancialCycleService, FinancialCycle } from '../../services/financialCycle.service';
import { DailyJournalService, DailyJournal } from '../../services/dailyJournal.service';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { Category } from '../../services/category.service';
import { FinancialScope, getScopePath } from '../../types/FinancialScope';
import { TransactionDetailDrawer } from '../transactions/TransactionDetailDrawer';

const IconMap: Record<string, any> = {
  ShoppingBag, Coffee, Film, Train
};

function AnimatedCounter({ value, symbol }: { value: number, symbol: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1000; // 1 second
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function (easeOutQuart)
      const ease = 1 - Math.pow(1 - progress, 4);
      
      setDisplayValue(value * ease);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [value]);
  
  const formatted = displayValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [intPart, decimalPart] = formatted.split('.');
  
  return (
    <div className="flex flex-wrap justify-center items-baseline px-2">
      <span className="text-4xl md:text-5xl font-bold text-accent-warm tracking-tighter mb-2 tabular-nums break-all">
        {symbol}{intPart}
        <span className="text-2xl md:text-3xl text-accent-warm/60">.{decimalPart}</span>
      </span>
    </div>
  );
}

interface ArchiveViewProps {
  scope?: FinancialScope;
}

export function ArchiveView({ scope }: ArchiveViewProps = {}) {
  const { formatAmount, formatNumber, currencySymbol } = useCurrencyFormatter();
  const { activeScope, userId, categories: globalCategories } = useFinancialEngine();
  const currentScope: FinancialScope = scope || activeScope || { type: 'PERSONAL', id: userId };
  
  const [completedCycles, setCompletedCycles] = useState<FinancialCycle[]>([]);
  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);
  const [dailyJournals, setDailyJournals] = useState<DailyJournal[]>([]);
  const [cycleTransactions, setCycleTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJournalsLoading, setIsJournalsLoading] = useState(false);
  
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isDetailedOpen, setIsDetailedOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFetchingTxs, setIsFetchingTxs] = useState(false);
  const [selectedTxInfo, setSelectedTxInfo] = useState<{
    tx: Transaction;
    category?: Category;
    cycleName?: string;
  } | null>(null);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editStartValue, setEditStartValue] = useState('');
  const [editEndValue, setEditEndValue] = useState('');
  const [showDateConfirm, setShowDateConfirm] = useState(false);

  // Real-time synchronization of transactions and cycles for currentScope
  useEffect(() => {
    let isCurrent = true;

    // Immediately reset state on scope switch to prevent data leakage/stale rendering
    setCompletedCycles([]);
    setCurrentCycleIndex(0);
    setDailyJournals([]);
    setCycleTransactions([]);
    setSelectedDates([]);
    setSelectedTxInfo(null);
    setIsDrawerOpen(false);
    setIsDetailedOpen(false);

    if (!currentScope.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const scopePath = getScopePath(currentScope);
    const txsRef = collection(db, ...scopePath, 'transactions');
    const cyclesRef = collection(db, ...scopePath, 'financialCycles');

    let allRawTransactions: Transaction[] = [];
    let allRawCycles: FinancialCycle[] = [];
    let txsReceived = false;
    let cyclesReceived = false;

    const computeLiveCycles = () => {
      if (!isCurrent || !txsReceived || !cyclesReceived) return;

      // Group transactions by cycleId
      const cycleTxCounts = new Map<string, number>();
      for (const tx of allRawTransactions) {
        if (tx.cycleId) {
          cycleTxCounts.set(tx.cycleId, (cycleTxCounts.get(tx.cycleId) || 0) + 1);
        }
      }

      // Filter: cycle must contain at least 1 actual transaction (whether ACTIVE, COMPLETED, or ARCHIVED)
      const eligible = allRawCycles
        .filter(c => (cycleTxCounts.get(c.cycleId) || 0) > 0)
        .sort((a, b) => b.endDate.getTime() - a.endDate.getTime());

      setCompletedCycles(eligible);
      setCurrentCycleIndex(prev => (prev >= eligible.length ? Math.max(0, eligible.length - 1) : prev));
      setIsLoading(false);
    };

    // 1. Subscribe to all transactions in this scope
    const unsubTxs = onSnapshot(txsRef, (snap) => {
      if (!isCurrent) return;
      allRawTransactions = snap.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          transactionId: data.transactionId || doc.id,
          date: data.date?.toDate ? data.date.toDate() : (data.date ? new Date(data.date) : new Date()),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
        } as Transaction;
      });
      txsReceived = true;
      computeLiveCycles();
    }, (err) => {
      console.error("Error listening to transactions:", err);
      if (isCurrent) setIsLoading(false);
    });

    // 2. Subscribe to all financial cycles in this scope
    const unsubCycles = onSnapshot(cyclesRef, (snap) => {
      if (!isCurrent) return;
      allRawCycles = snap.docs.map(doc => FinancialCycleService.mapToCycle(doc.id, doc.data()));
      cyclesReceived = true;
      computeLiveCycles();
    }, (err) => {
      console.error("Error listening to financial cycles:", err);
      if (isCurrent) setIsLoading(false);
    });

    return () => {
      isCurrent = false;
      unsubTxs();
      unsubCycles();
    };
  }, [currentScope.type, currentScope.id]);

  // Real-time synchronization of journals for the currently selected cycle
  useEffect(() => {
    let isCurrent = true;

    // Clear journal and date state when cycle changes
    setDailyJournals([]);
    setCycleTransactions([]);
    setSelectedDates([]);
    setSelectedTxInfo(null);
    setIsDrawerOpen(false);
    setIsDetailedOpen(false);

    if (completedCycles.length === 0 || !currentScope.id) {
      setIsJournalsLoading(false);
      return;
    }

    const currentCycle = completedCycles[currentCycleIndex];
    if (!currentCycle) {
      setIsJournalsLoading(false);
      return;
    }

    setIsJournalsLoading(true);

    const scopePath = getScopePath(currentScope);
    const journalsRef = collection(db, ...scopePath, 'financialCycles', currentCycle.cycleId, 'dailyJournals');

    const unsubJournals = onSnapshot(journalsRef, (snap) => {
      if (!isCurrent) return;
      const journals = snap.docs
        .map(doc => {
          const data = doc.data();
          return {
            ...data,
            journalId: data.journalId || doc.id,
            date: data.date?.toDate ? data.date.toDate() : (data.date ? new Date(data.date) : new Date()),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
          } as DailyJournal;
        })
        // Only display journals that contain at least one transaction
        .filter(j => j.transactionCount > 0)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      setDailyJournals(journals);
      setIsJournalsLoading(false);

      // Clean up selectedDates that no longer exist among the journals
      const availableFullDates = new Set(journals.map(j => formatJournalDate(j.date).fullDate));
      setSelectedDates(prev => prev.filter(d => availableFullDates.has(d)));
    }, (err) => {
      console.error("Error listening to daily journals:", err);
      if (isCurrent) setIsJournalsLoading(false);
    });

    return () => {
      isCurrent = false;
      unsubJournals();
    };
  }, [currentScope.type, currentScope.id, currentCycleIndex, completedCycles]);

  // Real-time synchronization of transactions for selected journals when Drawer is open
  useEffect(() => {
    if (!isDrawerOpen || selectedDates.length === 0 || !currentScope.id) {
      return;
    }

    const journalIds = Array.from(new Set(selectedDaysData.map(j => j.journalId)));
    if (journalIds.length === 0) {
      setCycleTransactions([]);
      return;
    }

    const scopePath = getScopePath(currentScope);
    const txsRef = collection(db, ...scopePath, 'transactions');
    const journalIdSet = new Set(journalIds);

    setIsFetchingTxs(true);
    const unsubSelectedTxs = onSnapshot(txsRef, (snap) => {
      const txs = snap.docs
        .map(doc => {
          const data = doc.data();
          return {
            ...data,
            transactionId: data.transactionId || doc.id,
            date: data.date?.toDate ? data.date.toDate() : (data.date ? new Date(data.date) : new Date()),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
          } as Transaction;
        })
        .filter(tx => journalIdSet.has(tx.journalId))
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      setCycleTransactions(txs);
      setIsFetchingTxs(false);

      // If a currently selected transaction was deleted, close or reset detail drawer
      setSelectedTxInfo(prev => {
        if (!prev) return null;
        const exists = txs.find(t => t.transactionId === prev.tx.transactionId);
        return exists ? { ...prev, tx: exists } : null;
      });
    }, (err) => {
      console.error("Error listening to drawer transactions:", err);
      setIsFetchingTxs(false);
    });

    return () => {
      unsubSelectedTxs();
    };
  }, [isDrawerOpen, selectedDates, currentScope.type, currentScope.id]);

  // Reset edit state when navigating between cycles
  useEffect(() => {
    setIsEditingDates(false);
    setShowDateConfirm(false);
  }, [currentCycleIndex]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (completedCycles.length === 0) {
    return (
      <div className="px-6 flex flex-col items-center justify-center min-h-[70vh] pb-10 pt-20 text-center">
        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
          <Check size={40} className="text-foreground/30" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">No Archived Cycles</h2>
        <p className="text-muted-foreground mb-8 max-w-[250px]">
          When your current budget cycle ends, all your daily journals will be beautifully archived here.
        </p>
      </div>
    );
  }

  const cycle = completedCycles[currentCycleIndex];

  // Helper to format dates like "15 Jul"
  const formatDateHeader = (d?: Date) => {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '—';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  // Helper to format journal cards
  const formatJournalDate = (d?: Date) => {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
      return { date: '—', month: '—', fullDate: '' };
    }
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return {
      date: d.getDate().toString().padStart(2, '0'),
      month: months[d.getMonth()],
      fullDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    };
  };

  const cycleStartFormatted = formatDateHeader(cycle.startDate);
  const cycleEndFormatted = formatDateHeader(cycle.endDate);

  // Format Date → "YYYY-MM-DD" for <input type="date">
  const formatDateForInput = (d?: Date) => {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleToggleDate = (fullDate: string) => {
    if (!fullDate) return;
    setSelectedDates(prev =>
      prev.includes(fullDate)
        ? prev.filter(d => d !== fullDate)
        : [...prev, fullDate].sort()
    );
  };

  const selectedDaysData = dailyJournals.filter(j => {
    const fd = formatJournalDate(j.date).fullDate;
    return fd && selectedDates.includes(fd);
  });
  
  const totalCombinedSpending = selectedDaysData.reduce((sum, j) => sum + (j.totalSpent ?? 0), 0);
  const recordedDaysCount = dailyJournals.length;

  // Historical cycle budget definitions:
  // availableBalance represents the true spending power (monthlyBudget + carryForward + income).
  // If availableBalance is missing (legacy snapshot), fall back to monthlyBudget.
  const cycleAvailableBalance = cycle.budgetSnapshot?.availableBalance ?? cycle.budgetSnapshot?.monthlyBudget ?? 0;
  const cycleBudget = cycle.budgetSnapshot?.monthlyBudget ?? 0;
  const cycleTotalExpenses = cycle.totalSpent ?? 0;
  const cycleRemaining = cycleAvailableBalance - cycleTotalExpenses;
  const progressPercent = cycleAvailableBalance > 0
    ? Math.min((cycleTotalExpenses / cycleAvailableBalance) * 100, 100)
    : (cycleTotalExpenses > 0 ? 100 : 0);

  // Selected Transactions (only used for detailed breakdown now)
  const selectedTransactions = cycleTransactions; // We already filtered from backend!

  // Aggregate dynamically from selected journals (Backend Math)
  const aggregatedSummary: Record<string, { totalSpent: number, count: number }> = {};
  selectedDaysData.forEach(journal => {
    if (journal.categorySummary) {
      Object.keys(journal.categorySummary).forEach(catId => {
        if (!aggregatedSummary[catId]) {
          aggregatedSummary[catId] = { totalSpent: 0, count: 0 };
        }
        aggregatedSummary[catId].totalSpent += journal.categorySummary![catId].totalSpent;
        aggregatedSummary[catId].count += journal.categorySummary![catId].transactionCount;
      });
    }
  });

  // Categories map for drawer
  const drawerCategories = Object.keys(aggregatedSummary)
    .filter(catId => aggregatedSummary[catId].totalSpent > 0)
    .map(catId => {
      const summary = aggregatedSummary[catId];
      const globalCat = globalCategories.find(c => c.categoryId === catId);
      
      const color = globalCat ? globalCat.color : '#8D99AE';
      const name = globalCat ? globalCat.name : 'Unknown';
      const iconStr = globalCat ? globalCat.icon : 'ShoppingBag';
      
      return {
        categoryId: catId,
        name,
        color,
        amount: summary.totalSpent,
        percent: totalCombinedSpending > 0 ? (summary.totalSpent / totalCombinedSpending) * 100 : 0,
        icon: IconMap[iconStr] || ShoppingBag
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="px-6 flex flex-col min-h-full pb-10 pt-4">
      {/* Financial Cycle Header */}
      <div className="mb-8 flex flex-col gap-6">
        <div className="flex items-center justify-between px-1">
          <button 
            onClick={() => setCurrentCycleIndex(Math.min(currentCycleIndex + 1, completedCycles.length - 1))}
            disabled={currentCycleIndex === completedCycles.length - 1}
            className={`w-10 h-10 bg-card rounded-full flex items-center justify-center shadow-neu-extrude border border-border text-muted-foreground transition-all ${currentCycleIndex === completedCycles.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}>
            <ChevronLeft size={20} />
          </button>

          <div className="flex flex-col items-center text-center mt-1">
            {isEditingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input 
                  type="text" 
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && editNameValue.trim()) {
                      await FinancialCycleService.updateCycleName(currentScope, cycle.cycleId, editNameValue.trim());
                      const updated = [...completedCycles];
                      updated[currentCycleIndex] = { ...cycle, cycleName: editNameValue.trim() };
                      setCompletedCycles(updated);
                      setIsEditingName(false);
                    } else if (e.key === 'Escape') {
                      setIsEditingName(false);
                    }
                  }}
                  autoFocus
                  onBlur={() => setIsEditingName(false)}
                  className="text-[22px] font-bold text-foreground tracking-tight leading-none text-center bg-transparent border-b-2 border-primary focus:outline-none w-48"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[22px] font-bold text-foreground tracking-tight leading-none">{cycle.cycleName || "Budget Cycle"}</h2>
                <button 
                  onClick={() => {
                    setEditNameValue(cycle.cycleName || "Budget Cycle");
                    setIsEditingName(true);
                  }}
                  className="text-muted-foreground/50 hover:text-foreground transition-colors"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
            {/* Date Range — editable */}
            {isEditingDates ? (
              <div className="flex flex-col items-center gap-2 mt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={editStartValue}
                    onChange={e => setEditStartValue(e.target.value)}
                    className="text-xs font-bold text-foreground bg-transparent border-b border-primary focus:outline-none text-center"
                  />
                  <span className="text-muted-foreground/50 font-normal text-xs">→</span>
                  <input
                    type="date"
                    value={editEndValue}
                    onChange={e => setEditEndValue(e.target.value)}
                    className="text-xs font-bold text-foreground bg-transparent border-b border-primary focus:outline-none text-center"
                  />
                </div>
                {showDateConfirm ? (
                  <div className="flex flex-col items-center gap-2 mt-1">
                    <p className="text-[10px] text-muted-foreground text-center max-w-[220px]">
                      Update <strong>{cycle.cycleName}</strong> to {formatDateHeader(new Date(editStartValue))} → {formatDateHeader(new Date(editEndValue))}? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          setIsLoading(true); // Rebalance might take a couple seconds
                          await FinancialCycleService.rebalanceCyclesAfterDateChange(currentScope, cycle.cycleId, new Date(editStartValue), new Date(editEndValue));
                          // Fetch everything fresh since totals and carry-forwards changed
                          const cycles = await FinancialCycleService.getAllCycles(currentScope);
                          setCompletedCycles(cycles.filter(c => c.status === 'COMPLETED' || c.status === 'ARCHIVED'));
                          setIsEditingDates(false);
                          setShowDateConfirm(false);
                          setIsLoading(false);
                        }}
                        className="px-3 py-1 bg-primary text-white text-[11px] font-bold rounded-full"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => { setShowDateConfirm(false); setIsEditingDates(false); }}
                        className="px-3 py-1 bg-muted text-muted-foreground text-[11px] font-bold rounded-full"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (editStartValue && editEndValue && new Date(editStartValue) <= new Date(editEndValue)) {
                          setShowDateConfirm(true);
                        }
                      }}
                      className="px-3 py-1 bg-primary text-white text-[11px] font-bold rounded-full"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingDates(false)}
                      className="px-3 py-1 bg-muted text-muted-foreground text-[11px] font-bold rounded-full"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                  {cycleStartFormatted} <span className="mx-1.5 font-normal opacity-50">→</span> {cycleEndFormatted}
                </span>
                <button
                  onClick={() => {
                    setEditStartValue(formatDateForInput(cycle.startDate));
                    setEditEndValue(formatDateForInput(cycle.endDate));
                    setIsEditingDates(true);
                  }}
                  className="text-muted-foreground/40 hover:text-foreground transition-colors"
                >
                  <Edit2 size={11} />
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => setCurrentCycleIndex(Math.max(currentCycleIndex - 1, 0))}
            disabled={currentCycleIndex === 0}
            className={`w-10 h-10 bg-card rounded-full flex items-center justify-center shadow-neu-extrude border border-border text-muted-foreground transition-all ${currentCycleIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="bg-card rounded-[32px] p-7 shadow-neu-outer border border-border flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-soft/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

          {/* Header Row */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em]">Remaining Balance</span>
            <div className="bg-primary/5 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-primary/10">
              <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">{recordedDaysCount} Days Logged</span>
            </div>
          </div>

          {/* Hero Balance */}
          <div className="mb-8 relative z-10">
            <span className={`text-[56px] font-bold leading-none tracking-tighter flex items-start ${cycleRemaining >= 0 ? 'text-foreground' : 'text-error'}`}>
              <span className="text-[28px] mt-1.5 mr-1 opacity-50 font-semibold">{currencySymbol}</span>
              {formatNumber(cycleRemaining).split('.')[0]}
              {formatNumber(cycleRemaining).includes('.') && (
                <span className="text-[28px] mt-1.5 opacity-40 font-semibold">.{formatNumber(cycleRemaining).split('.')[1]}</span>
              )}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-5 relative z-10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
              className={`h-full rounded-full ${cycleRemaining < 0 ? 'bg-red-500' : 'bg-accent-warm'}`}
            />
          </div>

          {/* Stats Footer */}
          <div className="flex justify-between items-center relative z-10">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">Total Spent</span>
              <span className="text-[16px] font-bold text-accent-warm tracking-tight">{formatAmount(cycleTotalExpenses)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">
                {(cycle.budgetSnapshot?.carryForward && cycle.budgetSnapshot.carryForward > 0) ? 'Available Budget' : 'Cycle Budget'}
              </span>
              <span className="text-[16px] font-bold text-foreground tracking-tight">
                {formatAmount(cycleAvailableBalance)}
              </span>
            </div>
          </div>
        </div>

        <p className="text-[13px] font-medium text-muted-foreground text-center px-4 -mt-2">Select one or more days to generate a cycle summary.</p>
      </div>

      {isJournalsLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-semibold">Loading daily journals...</span>
        </div>
      ) : dailyJournals.length === 0 ? (
        <div className="bg-card rounded-2xl p-6 text-center shadow-neu-outer border border-border">
          <p className="text-sm font-medium text-muted-foreground">No daily journals recorded for this cycle.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {dailyJournals.map((journal) => {
            const formattedDate = formatJournalDate(journal.date);
            const isSelected = selectedDates.includes(formattedDate.fullDate);

            let intensityClass = 'bg-card';
            let textClass = 'text-foreground';
            let borderClass = 'border-transparent shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)]';

            if (journal.totalSpent > 500) {
              intensityClass = 'bg-accent-warm/15';
              textClass = 'text-accent-deep';
            } else if (journal.totalSpent > 200) {
              intensityClass = 'bg-accent-soft/20';
              textClass = 'text-accent-warm';
            } else if (journal.totalSpent > 0) {
              intensityClass = 'bg-primary/5';
              textClass = 'text-foreground';
            } else {
              intensityClass = 'bg-muted/50 opacity-60';
              textClass = 'text-gray-400';
              borderClass = 'border-transparent shadow-none';
            }

            if (isSelected) {
              intensityClass = 'bg-primary';
              textClass = 'text-white';
              borderClass = 'border-accent-soft/30 shadow-neu-card ring-2 ring-primary/20';
            }

            return (
              <motion.button
                key={journal.journalId}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleToggleDate(formattedDate.fullDate)}
                className={`
                  aspect-square rounded-[24px] flex flex-col items-center justify-center
                  transition-all duration-300 relative border overflow-hidden
                  ${intensityClass} ${textClass} ${borderClass}
                `}
              >
                <span className="text-[28px] font-bold tracking-tighter leading-none mb-1">
                  {formattedDate.date}
                </span>
                <span className={`text-[11px] font-bold uppercase tracking-widest ${isSelected ? 'text-white/60' : 'opacity-50'}`}>
                  {formattedDate.month}
                </span>

                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Floating Generate Summary Button */}
      <AnimatePresence>
        {selectedDates.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md z-40"
          >
            <Drawer.Root
              open={isDrawerOpen}
              onOpenChange={(open) => {
                setIsDrawerOpen(open);
                if (!open) {
                  setIsDetailedOpen(false);
                  setSelectedTxInfo(null);
                }
              }}
            >
              <Drawer.Trigger asChild>
                <button
                  className="w-full bg-accent text-accent-foreground py-4 px-6 rounded-2xl font-bold flex items-center justify-between shadow-neu-extrude hover:scale-[0.98] active:scale-[0.95] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <span className="bg-card/20 px-2.5 py-0.5 rounded-full text-sm">
                      {selectedDates.length} {selectedDates.length === 1 ? 'day' : 'days'}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{formatAmount(totalCombinedSpending)}</span>
                    <ChevronRight size={18} className="opacity-70" />
                  </div>
                </button>
              </Drawer.Trigger>

              <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-50" />
                <Drawer.Content className="bg-muted flex flex-col rounded-t-[32px] max-h-[85vh] h-auto mt-24 fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
                  <div className="p-4 bg-card rounded-t-[32px] flex-shrink-0 border-b border-border relative">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-border mb-6" />
                    <div className="flex items-center justify-between px-2">
                      <div className="w-8" /> {/* Placeholder for balance */}
                      <Drawer.Title className="text-xl font-bold text-foreground absolute left-1/2 -translate-x-1/2">Expense Summary</Drawer.Title>
                      <Drawer.Close asChild>
                        <button className="p-2 bg-muted hover:bg-muted rounded-full text-muted-foreground transition-colors">
                          <X size={20} />
                        </button>
                      </Drawer.Close>
                    </div>
                  </div>

                  <div className="overflow-y-auto hide-scrollbar pb-10">
                    <div className="px-6 pt-2 pb-5 bg-card border-b border-border flex flex-wrap gap-2 justify-center">
                      {selectedDates.map(dateStr => {
                        const d = new Date(`${dateStr}T12:00:00Z`);
                        return (
                          <div key={dateStr} className="px-3.5 py-1.5 bg-card border border-border rounded-full text-[13px] font-semibold text-muted-foreground shadow-neu-extrude">
                            {formatJournalDate(d).date} {formatJournalDate(d).month}
                          </div>
                        );
                      })}
                    </div>

                    <div className="px-6 py-8 flex flex-col items-center justify-center text-center bg-card rounded-b-[32px] shadow-neu-card relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-accent-soft/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
                      <span className="text-xs font-bold text-muted-foreground/70 uppercase tracking-[0.2em] mb-2">Total Spent</span>
                      <AnimatedCounter value={totalCombinedSpending} symbol={currencySymbol} />
                    </div>

                    <div className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-card p-3 rounded-2xl shadow-neu-extrude border border-border flex flex-col items-center text-center hover:shadow-md transition-shadow">
                          <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-1">Transactions</span>
                          <span className="text-xl font-bold text-foreground">
                            {selectedDaysData.reduce((acc, j) => acc + j.transactionCount, 0)}
                          </span>
                        </div>
                        <div className="bg-card p-3 rounded-2xl shadow-neu-extrude border border-border flex flex-col items-center text-center hover:shadow-md transition-shadow">
                          <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-1">Days</span>
                          <span className="text-xl font-bold text-foreground">{selectedDates.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 pb-8">
                      <h3 className="text-lg font-bold text-foreground mb-6">Spending Distribution</h3>

                      <div className="h-4 w-full rounded-full flex overflow-hidden mb-6 shadow-inner">
                        {drawerCategories.map((cat, i) => (
                          <div key={i} style={{ width: `${cat.percent}%`, backgroundColor: cat.color }} className="h-full" />
                        ))}
                      </div>

                      <div className="flex flex-col gap-4">
                        {drawerCategories.map((cat, i) => (
                          <div key={i} className="bg-card p-4 rounded-2xl shadow-neu-extrude border border-border relative overflow-hidden">
                            <div className="flex items-center gap-4 mb-3 relative z-10">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                                <cat.icon size={18} strokeWidth={2.5} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[15px] font-semibold text-foreground">{cat.name}</h4>
                                <span className="text-[12px] font-semibold" style={{ color: cat.color }}>{cat.percent.toFixed(1)}%</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-semibold text-foreground text-lg">{formatAmount(cat.amount)}</span>
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 h-1 bg-muted w-full">
                              <div className="h-full rounded-r-full" style={{ width: `${cat.percent}%`, backgroundColor: cat.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="px-6 pb-12 mt-4">
                      <button 
                        onClick={() => setIsDetailedOpen(!isDetailedOpen)}
                        className="w-full flex items-center justify-between p-4 bg-card rounded-2xl shadow-neu-extrude border border-border active:scale-[0.99] transition-transform"
                      >
                        <span className="font-bold text-foreground">Detailed Breakdown</span>
                        <ChevronDown 
                          size={20} 
                          className={`text-muted-foreground transition-transform duration-300 ${isDetailedOpen ? 'rotate-180' : ''}`} 
                        />
                      </button>

                      <AnimatePresence>
                        {isDetailedOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-4"
                          >
                            {isFetchingTxs ? (
                              <div className="flex justify-center items-center py-8">
                                <span className="text-muted-foreground font-medium text-sm">Loading transactions...</span>
                              </div>
                            ) : selectedTransactions.length === 0 ? (
                              <div className="flex justify-center items-center py-8">
                                <span className="text-muted-foreground font-medium text-sm">No transactions recorded for the selected dates.</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-6">
                                {drawerCategories.map((cat) => {
                                  const catTxs = selectedTransactions.filter(t => t.categoryId === cat.categoryId && t.transactionType === 'EXPENSE');
                                  if (catTxs.length === 0) return null;

                                  return (
                                    <div key={cat.categoryId} className="flex flex-col">
                                      <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
                                        <div className="flex items-center gap-2">
                                          <cat.icon size={16} style={{ color: cat.color }} />
                                          <span className="font-bold text-sm text-foreground">{cat.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs text-muted-foreground">{catTxs.length} txs</span>
                                          <span className="font-bold text-sm" style={{ color: cat.color }}>{formatAmount(cat.amount)}</span>
                                        </div>
                                      </div>
                                      <div className="flex flex-col gap-2 pl-2 border-l-2" style={{ borderColor: `${cat.color}30` }}>
                                        {catTxs.map(tx => (
                                          <button
                                            key={tx.transactionId}
                                            onClick={() => setSelectedTxInfo({
                                              tx,
                                              category: globalCategories.find(c => c.categoryId === tx.categoryId),
                                              cycleName: cycle.cycleName
                                            })}
                                            className="flex justify-between items-start pl-2 pr-2 py-1.5 rounded-xl gap-2 w-full text-left hover:bg-muted/40 transition-colors group active:scale-[0.99]"
                                          >
                                            <div className="flex flex-col min-w-0 flex-1">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-semibold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                                                  {tx.title}
                                                </span>
                                                {(tx.receiptUrl || tx.transactionDetails?.receipt?.attached) && (
                                                  <span title="Receipt attached" className="shrink-0 text-muted-foreground/70">
                                                    <Receipt size={12} />
                                                  </span>
                                                )}
                                              </div>
                                              <span className="text-[11px] text-muted-foreground mt-0.5">
                                                {(tx.date instanceof Date ? tx.date : new Date(tx.date)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                {tx.transactionDetails && tx.transactionDetails.quantity && (
                                                  <span className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[9px] uppercase tracking-wider">
                                                    Qty: {tx.transactionDetails.quantity}
                                                  </span>
                                                )}
                                              </span>
                                            </div>
                                            <span className="font-bold text-sm text-accent-warm whitespace-nowrap flex-shrink-0">
                                              {formatAmount(tx.amount)}
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </Drawer.Content>
              </Drawer.Portal>
            </Drawer.Root>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Detail Drawer */}
      <TransactionDetailDrawer
        isOpen={selectedTxInfo !== null}
        onClose={() => setSelectedTxInfo(null)}
        txInfo={selectedTxInfo}
        activeScope={currentScope}
      />
    </div>
  );
}
