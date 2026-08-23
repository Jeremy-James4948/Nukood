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
  ChevronDown
} from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_DEF } from '../../constants';
import { useCurrencyFormatter } from '../../utils/currency';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { FinancialCycleService, FinancialCycle } from '../../services/financialCycle.service';
import { DailyJournalService, DailyJournal } from '../../services/dailyJournal.service';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { createMockArchive } from './mockArchive';

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

export function ArchiveView() {
  const { formatAmount, formatNumber, currencySymbol } = useCurrencyFormatter();
  const { userId, categories: globalCategories } = useFinancialEngine();
  
  const [completedCycles, setCompletedCycles] = useState<FinancialCycle[]>([]);
  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);
  const [dailyJournals, setDailyJournals] = useState<DailyJournal[]>([]);
  const [cycleTransactions, setCycleTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isDetailedOpen, setIsDetailedOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isFetchingTxs, setIsFetchingTxs] = useState(false);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  // Fetch cycles on mount
  useEffect(() => {
    async function loadCycles() {
      setIsLoading(true);
      try {
        const cycles = await FinancialCycleService.getAllCycles(userId);
        setCompletedCycles(cycles);
      } catch (err) {
        console.error("Error loading completed cycles:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCycles();
  }, [userId]);

  // Fetch journals when cycle changes
  useEffect(() => {
    async function loadJournals() {
      if (completedCycles.length === 0) return;
      const cycle = completedCycles[currentCycleIndex];
      try {
        const journals = await DailyJournalService.getDailyJournalsForCycle(userId, cycle.cycleId);
        setDailyJournals(journals);
        setCycleTransactions([]); // clear previous cycle's transactions
        setSelectedDates([]); // clear selection
      } catch (err) {
        console.error("Error loading daily journals:", err);
      }
    }
    loadJournals();
  }, [userId, currentCycleIndex, completedCycles]);

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
        <button 
          onClick={async () => {
             setIsLoading(true);
             await createMockArchive(userId);
             const cycles = await FinancialCycleService.getAllCycles(userId);
             setCompletedCycles(cycles);
             setIsLoading(false);
          }}
          className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-neu-extrude hover:opacity-90 active:scale-95 transition-all text-sm">
          Generate Mock Cycle (Debug)
        </button>
      </div>
    );
  }

  const cycle = completedCycles[currentCycleIndex];

  // Helper to format dates like "15 Jul"
  const formatDateHeader = (d: Date) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  };

  // Helper to format journal cards
  const formatJournalDate = (d: Date) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return {
      date: d.getDate().toString().padStart(2, '0'),
      month: months[d.getMonth()],
      fullDate: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    };
  };

  const cycleStartFormatted = formatDateHeader(cycle.startDate);
  const cycleEndFormatted = formatDateHeader(cycle.endDate);

  const handleToggleDate = (fullDate: string) => {
    setSelectedDates(prev =>
      prev.includes(fullDate)
        ? prev.filter(d => d !== fullDate)
        : [...prev, fullDate].sort()
    );
  };

  const selectedDaysData = dailyJournals.filter(j => {
    const fd = formatJournalDate(j.date).fullDate;
    return selectedDates.includes(fd);
  });
  
  const totalCombinedSpending = selectedDaysData.reduce((sum, j) => sum + j.totalSpent, 0);
  const recordedDaysCount = dailyJournals.length;

  const cycleBudget = cycle.budgetSnapshot.monthlyBudget;
  const cycleTotalExpenses = cycle.totalSpent;
  const cycleRemaining = cycleBudget - cycleTotalExpenses;

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
                      await FinancialCycleService.updateCycleName(userId, cycle.cycleId, editNameValue.trim());
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
            <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              {cycleStartFormatted} <span className="mx-1.5 font-normal opacity-50">→</span> {cycleEndFormatted}
            </span>
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
              animate={{ width: `${Math.min((cycleTotalExpenses / cycleBudget) * 100, 100)}%` }}
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
              <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">Cycle Budget</span>
              <span className="text-[16px] font-bold text-foreground tracking-tight">{formatAmount(cycleBudget)}</span>
            </div>
          </div>
        </div>

        <p className="text-[13px] font-medium text-muted-foreground text-center px-4 -mt-2">Select one or more days to generate a cycle summary.</p>
      </div>

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
              onOpenChange={async (open) => {
                setIsDrawerOpen(open);
                if (open) {
                  // Fetch transactions specifically for selected journals
                  setIsFetchingTxs(true);
                  try {
                    const journalIds = selectedDaysData.map(j => j.journalId);
                    const txs = await TransactionService.getTransactionsForJournals(userId, journalIds);
                    setCycleTransactions(txs);
                  } catch (err) {
                    console.error("Error fetching selected transactions:", err);
                  } finally {
                    setIsFetchingTxs(false);
                  }
                } else {
                  setIsDetailedOpen(false);
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
                                    <div className="flex flex-col gap-3 pl-2 border-l-2" style={{ borderColor: `${cat.color}30` }}>
                                      {catTxs.map(tx => (
                                        <div key={tx.transactionId} className="flex justify-between items-start pl-2 gap-2">
                                          <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-sm font-semibold text-foreground leading-tight truncate">{tx.title}</span>
                                            <span className="text-[11px] text-muted-foreground mt-0.5">
                                              {tx.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
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
                                        </div>
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
    </div>
  );
}
