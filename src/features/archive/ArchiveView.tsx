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
import { createMockArchive } from './mockArchive';

const IconMap: Record<string, any> = {
  ShoppingBag, Coffee, Film, Train
};

export function ArchiveView() {
  const { formatAmount, formatNumber, currencySymbol } = useCurrencyFormatter();
  const { userId, categories: globalCategories } = useFinancialEngine();
  
  const [completedCycles, setCompletedCycles] = useState<FinancialCycle[]>([]);
  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);
  const [dailyJournals, setDailyJournals] = useState<DailyJournal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isDetailedOpen, setIsDetailedOpen] = useState(false);
  
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
        <div className="w-24 h-24 bg-[#355C7D]/5 rounded-full flex items-center justify-center mb-6">
          <Check size={40} className="text-[#355C7D]/30" />
        </div>
        <h2 className="text-2xl font-bold text-[#355C7D] mb-2">No Archived Cycles</h2>
        <p className="text-[#6C5B7B] mb-8 max-w-[250px]">
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
          className="px-6 py-3 bg-[#355C7D] text-white rounded-2xl font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all text-sm">
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

  // Categories map for drawer
  const drawerCategories = Object.keys(cycle.categorySummary || {})
    .filter(catId => cycle.categorySummary![catId].totalSpent > 0)
    .map(catId => {
      const summary = cycle.categorySummary![catId];
      const globalCat = globalCategories.find(c => c.categoryId === catId);
      
      const color = globalCat ? globalCat.color : '#8D99AE';
      const name = globalCat ? globalCat.name : 'Unknown';
      const iconStr = globalCat ? globalCat.icon : 'ShoppingBag';
      
      return {
        name,
        color,
        amount: summary.totalSpent,
        percent: cycleTotalExpenses > 0 ? (summary.totalSpent / cycleTotalExpenses) * 100 : 0,
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
            className={`w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 text-[#6C5B7B] transition-all ${currentCycleIndex === completedCycles.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}>
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
                  className="text-[22px] font-bold text-[#355C7D] tracking-tight leading-none text-center bg-transparent border-b-2 border-[#355C7D] focus:outline-none w-48"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[22px] font-bold text-[#355C7D] tracking-tight leading-none">{cycle.cycleName || "Budget Cycle"}</h2>
                <button 
                  onClick={() => {
                    setEditNameValue(cycle.cycleName || "Budget Cycle");
                    setIsEditingName(true);
                  }}
                  className="text-[#6C5B7B]/50 hover:text-[#355C7D] transition-colors"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
            <span className="text-[11px] font-bold text-[#6C5B7B]/60 uppercase tracking-widest">
              {cycleStartFormatted} <span className="mx-1.5 font-normal opacity-50">→</span> {cycleEndFormatted}
            </span>
          </div>

          <button 
            onClick={() => setCurrentCycleIndex(Math.max(currentCycleIndex - 1, 0))}
            disabled={currentCycleIndex === 0}
            className={`w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 text-[#6C5B7B] transition-all ${currentCycleIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}>
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="bg-white rounded-[32px] p-7 shadow-[0_12px_40px_-12px_rgba(53,92,125,0.08)] border border-gray-50 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F8B195]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

          {/* Header Row */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <span className="text-[11px] font-bold text-[#6C5B7B]/50 uppercase tracking-[0.15em]">Remaining Balance</span>
            <div className="bg-[#355C7D]/5 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-[#355C7D]/10">
              <span className="text-[10px] font-bold text-[#355C7D] uppercase tracking-widest">{recordedDaysCount} Days Logged</span>
            </div>
          </div>

          {/* Hero Balance */}
          <div className="mb-8 relative z-10">
            <span className={`text-[56px] font-bold leading-none tracking-tighter flex items-start ${cycleRemaining >= 0 ? 'text-[#355C7D]' : 'text-red-500'}`}>
              <span className="text-[28px] mt-1.5 mr-1 opacity-50 font-semibold">{currencySymbol}</span>
              {formatNumber(cycleRemaining).split('.')[0]}
              {formatNumber(cycleRemaining).includes('.') && (
                <span className="text-[28px] mt-1.5 opacity-40 font-semibold">.{formatNumber(cycleRemaining).split('.')[1]}</span>
              )}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-5 relative z-10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((cycleTotalExpenses / cycleBudget) * 100, 100)}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
              className={`h-full rounded-full ${cycleRemaining < 0 ? 'bg-red-500' : 'bg-[#F67280]'}`}
            />
          </div>

          {/* Stats Footer */}
          <div className="flex justify-between items-center relative z-10">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#6C5B7B]/50 uppercase tracking-widest mb-1">Total Spent</span>
              <span className="text-[16px] font-bold text-[#F67280] tracking-tight">{formatAmount(cycleTotalExpenses)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-[#6C5B7B]/50 uppercase tracking-widest mb-1">Cycle Budget</span>
              <span className="text-[16px] font-bold text-[#355C7D] tracking-tight">{formatAmount(cycleBudget)}</span>
            </div>
          </div>
        </div>

        <p className="text-[13px] font-medium text-[#6C5B7B] text-center px-4 -mt-2">Select one or more days to generate a cycle summary.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {dailyJournals.map((journal) => {
          const formattedDate = formatJournalDate(journal.date);
          const isSelected = selectedDates.includes(formattedDate.fullDate);

          let intensityClass = 'bg-white';
          let textClass = 'text-[#355C7D]';
          let borderClass = 'border-transparent shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)]';

          if (journal.totalSpent > 500) {
            intensityClass = 'bg-[#F67280]/15';
            textClass = 'text-[#C06C84]';
          } else if (journal.totalSpent > 200) {
            intensityClass = 'bg-[#F8B195]/20';
            textClass = 'text-[#F67280]';
          } else if (journal.totalSpent > 0) {
            intensityClass = 'bg-[#355C7D]/5';
            textClass = 'text-[#355C7D]';
          } else {
            intensityClass = 'bg-gray-50/50 opacity-60';
            textClass = 'text-gray-400';
            borderClass = 'border-transparent shadow-none';
          }

          if (isSelected) {
            intensityClass = 'bg-[#355C7D]';
            textClass = 'text-white';
            borderClass = 'border-[#F8B195]/30 shadow-[0_16px_32px_-8px_rgba(53,92,125,0.4)] ring-2 ring-[#355C7D]/20';
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
            className="fixed bottom-24 left-6 right-6 z-40"
          >
            <Drawer.Root>
              <Drawer.Trigger asChild>
                <button
                  className="w-full bg-[#355C7D] text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-between shadow-[0_8px_32px_-8px_rgba(53,92,125,0.5)] hover:bg-[#2A4A65] active:scale-[0.98] transition-all"
                >
                  <span className="flex items-center gap-2">
                    <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm">
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
                <Drawer.Overlay className="fixed inset-0 bg-[#355C7D]/20 backdrop-blur-sm z-50" />
                <Drawer.Content className="bg-gray-50 flex flex-col rounded-t-[32px] h-[85vh] mt-24 fixed bottom-0 left-0 right-0 z-50">
                  <div className="p-4 bg-white rounded-t-[32px] flex-shrink-0 border-b border-gray-100">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-200 mb-6" />
                    <div className="flex items-center justify-between px-2">
                      <Drawer.Title className="text-xl font-bold text-[#355C7D]">Expense Summary</Drawer.Title>
                      <Drawer.Close asChild>
                        <button className="p-2 bg-gray-100 rounded-full text-[#6C5B7B]">
                          <X size={20} />
                        </button>
                      </Drawer.Close>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto hide-scrollbar pb-10">
                    <div className="px-6 pt-2 pb-6 bg-white border-b border-gray-100 flex flex-wrap gap-2">
                      {selectedDates.map(dateStr => {
                        const d = new Date(`${dateStr}T12:00:00Z`);
                        return (
                          <div key={dateStr} className="px-3 py-1 bg-[#F9FAFB] border border-gray-200 rounded-lg text-[13px] font-medium text-[#6C5B7B]">
                            {formatJournalDate(d).date} {formatJournalDate(d).month}
                          </div>
                        );
                      })}
                    </div>

                    <div className="px-6 py-10 flex flex-col items-center justify-center text-center bg-white rounded-b-[32px] shadow-[0_12px_32px_-12px_rgba(108,91,123,0.08)] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#F8B195]/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
                      <span className="text-sm font-semibold text-[#6C5B7B] uppercase tracking-wider mb-3">Total Spent</span>
                      <span className="text-6xl font-bold text-[#F67280] tracking-tight mb-2">
                        {currencySymbol}{formatNumber(totalCombinedSpending).split('.')[0]}
                        {formatNumber(totalCombinedSpending).includes('.') && (
                          <span className="text-3xl text-[#F67280]/60">.{formatNumber(totalCombinedSpending).split('.')[1]}</span>
                        )}
                      </span>
                    </div>

                    <div className="px-6 py-8">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex flex-col">
                          <span className="text-xs font-medium text-[#6C5B7B] mb-1">Transactions</span>
                          <span className="text-xl font-bold text-[#355C7D]">
                            {selectedDaysData.reduce((acc, j) => acc + j.transactionCount, 0)}
                          </span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex flex-col">
                          <span className="text-xs font-medium text-[#6C5B7B] mb-1">Days Included</span>
                          <span className="text-xl font-bold text-[#355C7D]">{selectedDates.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 pb-8">
                      <h3 className="text-lg font-bold text-[#355C7D] mb-6">Spending Distribution</h3>

                      <div className="h-4 w-full rounded-full flex overflow-hidden mb-6 shadow-inner">
                        {drawerCategories.map((cat, i) => (
                          <div key={i} style={{ width: `${cat.percent}%`, backgroundColor: cat.color }} className="h-full" />
                        ))}
                      </div>

                      <div className="flex flex-col gap-4">
                        {drawerCategories.map((cat, i) => (
                          <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 relative overflow-hidden">
                            <div className="flex items-center gap-4 mb-3 relative z-10">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                                <cat.icon size={18} strokeWidth={2.5} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[15px] font-semibold text-[#355C7D]">{cat.name}</h4>
                                <span className="text-[12px] font-semibold" style={{ color: cat.color }}>{cat.percent.toFixed(1)}%</span>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-semibold text-[#355C7D] text-lg">{formatAmount(cat.amount)}</span>
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 h-1 bg-gray-100 w-full">
                              <div className="h-full rounded-r-full" style={{ width: `${cat.percent}%`, backgroundColor: cat.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
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
