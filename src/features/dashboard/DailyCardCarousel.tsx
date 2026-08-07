import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Plus, X } from 'lucide-react';
import { AddTransactionDrawer } from '../transactions/AddTransactionDrawer';
import { SettingsDrawer } from '../settings/SettingsDrawer';
import { useCurrencyFormatter } from '../../utils/currency';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { IconMap } from '../../constants/icons';
export function DailyCardCarousel() {
  const { formatAmount, formatNumber, currencySymbol } = useCurrencyFormatter();
  const { transactions, categories, dailyJournals } = useFinancialEngine();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fastEntryContext, setFastEntryContext] = useState<{name?: string, category: string, icon?: string, price?: string, quantity?: string, unit?: string, notes?: string} | null>(null);

  const handleOpenAddTx = (fastEntry: {name?: string, category: string, icon?: string, price?: string, quantity?: string, unit?: string, notes?: string} | null = null) => {
    setFastEntryContext(fastEntry);
    setIsAddTxOpen(true);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDayLabel = (date: Date, offset: number) => {
    if (offset === 0) return 'Today';
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  const getMonthShort = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[date.getMonth()];
  };

  const cards = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const todayJournalId = `journal_${todayStr.replace(/-/g, '_')}`;

    let journalsToRender = [...dailyJournals];

    // Ensure Today's journal exists visually even if not in DB
    const hasToday = journalsToRender.some(j => j.journalId === todayJournalId);
    if (!hasToday) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      journalsToRender.push({
        journalId: todayJournalId,
        cycleId: '', // placeholder
        date: today,
        dayName: days[today.getDay()],
        dayNumber: today.getDate(),
        transactionCount: 0,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Sort ascending by date so older days are on the left
    journalsToRender.sort((a, b) => a.date.getTime() - b.date.getTime());

    return journalsToRender.map((journal) => {
      const isToday = journal.journalId === todayJournalId;
      const type = isToday ? 'today' : 'past';

      // For recent transactions, filter by journalId
      const dayTx = transactions.filter(tx => tx.journalId === journal.journalId);
      
      const recent = dayTx.map(tx => {
        const cat = categories.find(c => c.categoryId === tx.categoryId);
        const IconComponent = cat ? (IconMap[cat.icon] || ShoppingBag) : ShoppingBag;
        
        const txDate = new Date(tx.date);
        const time = txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return {
          id: tx.transactionId,
          name: tx.title,
          price: formatAmount(tx.amount),
          icon: <IconComponent size={20} className="text-[#9B968B]" />,
          time
        };
      });

      // Generate Category Chips
      const catSummary = journal.categorySummary || {};
      const categoryChips = Object.entries(catSummary)
        .filter(([_, data]) => data.totalSpent > 0)
        .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
        .map(([catId, data]) => {
          const cat = categories.find(c => c.categoryId === catId);
          const IconComponent = cat ? (IconMap[cat.icon] || ShoppingBag) : ShoppingBag;
          return {
            id: catId,
            name: cat?.name || 'Unknown',
            color: cat?.color || '#355C7D',
            spent: formatAmount(data.totalSpent),
            icon: <IconComponent size={14} className="text-white" />
          };
        });

      return {
        id: journal.journalId,
        date: journal.date.getDate().toString(),
        month: getMonthShort(journal.date),
        day: journal.dayName,
        spent: journal.totalSpent,
        transactions: journal.transactionCount,
        type,
        recent,
        categoryChips
      };
    });
  }, [dailyJournals, transactions, categories, formatAmount]);

  // Auto-center today's card on mount
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const todayCard = container.querySelector('[data-today="true"]') as HTMLElement;
      if (todayCard) {
        // Calculate the exact scroll position to center the active card
        const scrollLeft = todayCard.offsetLeft - (container.clientWidth / 2) + (todayCard.clientWidth / 2);
        // Timeout ensures rendering layout shifts are settled
        setTimeout(() => {
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }, 100);
      }
    }
  }, []);

  // Neumorphic utility classes
  const bgBase = "bg-[#F3F1EA]";
  const textPrimary = "text-[#6A6356]";
  const textSecondary = "text-[#9B968B]";
  
  const neuCard = "bg-[#F3F1EA] shadow-[12px_12px_24px_#e3e0d8,-12px_-12px_24px_#ffffff]";
  const neuExtrude = "bg-[#F3F1EA] shadow-[6px_6px_12px_#e3e0d8,-6px_-6px_12px_#ffffff]";
  const neuExtrudeHover = "hover:shadow-[4px_4px_8px_#e3e0d8,-4px_-4px_8px_#ffffff] hover:scale-[0.98] transition-all";
  const neuIndent = "bg-[#F3F1EA] shadow-[inset_4px_4px_8px_#e3e0d8,inset_-4px_-4px_8px_#ffffff]";

  return (
    <>
      <div className={`relative w-full min-h-[700px] flex items-center`}>
        <div 
          ref={scrollRef} 
          className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory px-[12vw] gap-8 pb-12 pt-6 items-center w-full"
        >
          {cards.map((card) => {
            const isToday = card.type === 'today';
            return (
              <motion.div
                key={card.id}
                data-today={isToday}
                onClick={() => (isToday || card.type === 'past') && setSelectedCard(card.id)}
                className={`relative snap-center shrink-0 flex flex-col p-7 rounded-[40px] transition-all duration-700 ${isToday || card.type === 'past' ? 'cursor-pointer' : ''} ${
                  isToday
                    ? `w-[85vw] max-w-[360px] h-[560px] ${neuCard}`
                    : `w-[75vw] max-w-[300px] h-[460px] ${neuCard} opacity-70 scale-90`
                }`}
                layoutId={`card-${card.id}`}
              >
                {/* Top Header */}
                <div className="flex justify-between items-start mb-10 w-full">
                  <div className={`flex flex-col rounded-[20px] px-5 py-3 ${neuExtrude}`}>
                    <span className={`text-[11px] font-medium tracking-widest uppercase mb-0.5 ${textSecondary}`}>
                      {isToday ? `${card.month} ${card.date}` : card.day}
                    </span>
                    <span className={`text-[22px] font-semibold tracking-tight ${textPrimary}`}>
                      {isToday ? 'Today' : `${card.month} ${card.date}`}
                    </span>
                  </div>
                  
                  {isToday && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(true); }}
                      className="flex items-center gap-4 mt-4 mr-2 group cursor-pointer"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-[#B9C9AF] shadow-[0_0_10px_#B9C9AF,inset_1px_1px_2px_rgba(255,255,255,0.8)]" />
                      <div className={`text-[#9B968B] transition-transform duration-300 group-hover:rotate-45 group-hover:text-[#6A6356]`}>
                         {/* Settings Icon SVG */}
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                         </svg>
                      </div>
                    </button>
                  )}
                </div>

                {/* Typography-focused middle section */}
                <div className="flex flex-col items-center justify-center mb-auto mt-4">
                  <span className={`text-[13px] font-medium tracking-[0.1em] uppercase mb-4 ${textSecondary}`}>
                    Total Spent
                  </span>
                  <div className={`flex items-start justify-center ${textPrimary}`}>
                    {card.spent !== null ? (
                      <>
                        <span className={`text-[32px] font-medium mt-2 mr-1 ${textSecondary}`}>{currencySymbol}</span>
                        <span className="text-[88px] font-medium tracking-tighter leading-none">
                          {formatNumber(card.spent).split('.')[0]}
                        </span>
                        {formatNumber(card.spent).includes('.') && (
                          <span className={`text-[32px] font-medium mt-2 ${textSecondary}`}>
                            .{formatNumber(card.spent).split('.')[1]}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[88px] font-medium tracking-tighter leading-none">-</span>
                    )}
                  </div>
                </div>

                {/* Minimalist bottom section */}
                <div className="mt-auto w-full flex flex-col gap-4">
                  {isToday ? (
                    <div className="w-full flex flex-col gap-3">
                      {card.recent?.slice(0, 2).map((item, idx) => (
                        <div key={idx} className={`flex items-center justify-between px-4 py-3.5 rounded-[16px] ${neuExtrude}`}>
                          <div className="flex items-center gap-3.5">
                            <div className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-full ${neuIndent}`}>
                              {item.icon}
                            </div>
                            <span className={`text-[15px] font-medium ${textPrimary} truncate max-w-[120px]`}>{item.name}</span>
                          </div>
                          <span className={`text-[15px] font-medium ${textPrimary}`}>{item.price}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-2 pt-2">
                      <span className={`text-[13px] font-medium uppercase tracking-widest ${textSecondary}`}>Transactions</span>
                      <span className={`text-xl font-semibold ${textPrimary}`}>{card.transactions}</span>
                    </div>
                  )}

                  {/* Bottom Action Buttons */}
                  {isToday && (
                    <div className="flex justify-center items-center mt-3 px-1 w-full">
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95, boxShadow: "inset 4px 4px 8px #e3e0d8, inset -4px -4px 8px #ffffff" }}
                        onClick={(e) => { e.stopPropagation(); handleOpenAddTx(); }}
                        className={`w-full h-16 rounded-[20px] flex items-center justify-center gap-3 ${neuExtrude} text-[#6A6356] font-semibold tracking-wide shadow-[6px_6px_12px_#e3e0d8,-6px_-6px_12px_#ffffff]`}
                      >
                        <motion.div
                          animate={{ rotate: [0, 90, 0] }}
                          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", repeatDelay: 2 }}
                        >
                          <Plus size={26} strokeWidth={2.5} className="text-[#A9BDD0]" />
                        </motion.div>
                        Add Transaction
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedCard !== null && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCard(null)}
              className="absolute inset-0 bg-[#355C7D]/20 backdrop-blur-sm cursor-pointer"
            />
            
            {(() => {
              const activeData = cards.find(c => c.id === selectedCard);
              if (!activeData) return null;

              return (
                <motion.div
                  layoutId={`card-${activeData.id}`}
                  className="relative w-[90vw] max-w-[400px] h-[80vh] max-h-[800px] bg-[#F3F1EA] rounded-[40px] shadow-2xl z-[201] flex flex-col p-8 overflow-hidden"
                >
                  <button 
                    onClick={() => setSelectedCard(null)}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 transition-colors z-10"
                  >
                    <X size={24} className="text-[#6A6356]" />
                  </button>

                  <div className="flex flex-col mb-8 mt-2 shrink-0">
                    <span className={`text-[13px] font-medium tracking-widest uppercase mb-1 ${textSecondary}`}>
                      {activeData.type === 'today' ? `${activeData.month} ${activeData.date}` : activeData.day}
                    </span>
                    <span className={`text-[32px] font-semibold tracking-tight ${textPrimary}`}>
                      {activeData.type === 'today' ? 'Today' : `${activeData.month} ${activeData.date}`}
                    </span>
                    
                    <div className="flex items-baseline gap-1 mt-6">
                      <span className={`text-xl font-medium ${textSecondary}`}>{currencySymbol}</span>
                      <span className={`text-5xl font-bold tracking-tighter ${textPrimary}`}>
                        {formatNumber(activeData.spent || 0)}
                      </span>
                    </div>
                    <span className={`text-[13px] font-medium uppercase tracking-widest mt-2 ${textSecondary}`}>Total Spent</span>
                  </div>

                  {activeData.categoryChips && activeData.categoryChips.length > 0 && (
                    <div className="mb-6 flex flex-col shrink-0">
                      <span className={`text-[12px] font-bold uppercase tracking-[0.15em] mb-4 ${textSecondary}`}>Category Breakdown</span>
                      <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 snap-x">
                        {activeData.categoryChips.map((chip, idx) => (
                          <div key={idx} className={`snap-start shrink-0 flex items-center gap-3 p-3 pr-5 rounded-[24px] ${neuExtrude}`}>
                             <div 
                               className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-transparent`}
                               style={{ backgroundColor: chip.color }}
                             >
                               {React.cloneElement(chip.icon as React.ReactElement, { size: 16 })}
                             </div>
                             <div className="flex flex-col">
                               <span className={`text-[13px] font-bold ${textPrimary}`}>{chip.name}</span>
                               <span className={`text-[12px] font-semibold ${textSecondary}`}>{currencySymbol}{chip.spent}</span>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="w-full h-[1px] bg-[#9B968B]/20 mb-6 shrink-0" />

                  <div className="flex flex-col shrink-0 mb-3">
                     <span className={`text-[12px] font-bold uppercase tracking-[0.15em] ${textSecondary}`}>Transactions</span>
                  </div>

                  <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-3 -mx-2 px-2 pb-6">
                    {activeData.recent.map((item, idx) => (
                      <div key={item.id || idx} className={`group flex items-center justify-between p-4 rounded-[24px] ${neuExtrude} ${neuExtrudeHover}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${neuIndent}`}>
                            {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-[15px] font-bold ${textPrimary} truncate max-w-[150px]`}>{item.name}</span>
                            <span className={`text-[11px] font-semibold tracking-wider uppercase ${textSecondary}`}>{item.time}</span>
                          </div>
                        </div>
                        <span className={`text-[16px] font-bold tracking-tight ${textPrimary}`}>{item.price}</span>
                      </div>
                    ))}
                    
                    {activeData.recent.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center py-10">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${neuIndent}`}>
                          <ShoppingBag size={24} className="text-[#9B968B] opacity-50" />
                        </div>
                        <span className={`text-[14px] font-semibold ${textSecondary}`}>No transactions yet</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>

      <AddTransactionDrawer 
        isOpen={isAddTxOpen} 
        onClose={() => setIsAddTxOpen(false)} 
        initialContext={fastEntryContext} 
      />
      <SettingsDrawer 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  );
}
