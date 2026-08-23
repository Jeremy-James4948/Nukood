import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, MoreHorizontal, Wallet, PieChart } from 'lucide-react';
import { CATEGORY_COLORS } from '../../constants';
import { BudgetHealthDrawer } from './BudgetHealthDrawer';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { FinancialEngine } from '../../utils/FinancialEngine';
import { Category } from '../../services/category.service';
import { IconMap } from '../../constants/icons';
import { useCurrencyFormatter } from '../../utils/currency';

export function SnapshotWidget() {
  const { formatAmount, formatNumber, currencySymbol } = useCurrencyFormatter();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const { activeCycle, settings, categories: dbCategories, isLoading, transactions } = useFinancialEngine();

  useEffect(() => {
    if (activeCategory) {
      const timer = setTimeout(() => setActiveCategory(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [activeCategory]);

  if (isLoading || !activeCycle || !settings) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <div className="animate-pulse w-12 h-12 rounded-full bg-[#E8D4C8] opacity-50" />
      </div>
    );
  }

  // Calculate category spending from the actual transactions
  const categories = dbCategories.map((cat) => {
    const catSpent = transactions
      .filter(t => t.categoryId === cat.categoryId && t.transactionType === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const percent = activeCycle.totalSpent > 0 ? (catSpent / activeCycle.totalSpent) * 100 : 0;

    return {
      name: cat.name,
      color: cat.color,
      amount: catSpent,
      percent: percent,
      icon: IconMap[cat.icon] || ShoppingBag
    };
  })
  .filter(c => c.amount > 0)
  .sort((a, b) => b.amount - a.amount);

  // --- Dynamic Budget Math ---
  const spentThisMonth = activeCycle.totalSpent;
  const availableBalance = activeCycle.budgetSnapshot.availableBalance;
  
  // Use the central FinancialEngine utility for all dynamic calculations
  const remainingBalance = FinancialEngine.calculateRemainingBalance(activeCycle);
  const dailyBudget = FinancialEngine.calculateDailyAvailableBudget(activeCycle);
  const avgSpending = FinancialEngine.calculateAverageDailySpending(activeCycle);
  const daysLeft = FinancialEngine.calculateRemainingDays(activeCycle);
  const healthStatus = FinancialEngine.calculateBudgetHealth(activeCycle, settings);

  let health = {
    title: 'Comfortable',
    color: 'bg-[#B9C9AF]',
    shadow: 'shadow-[0_0_8px_rgba(185,201,175,0.6)]',
    desc: 'You are spending comfortably below your daily target.'
  };

  if (healthStatus === 'Overspending') {
    health = { title: 'Overspending', color: 'bg-[#C98B71]', shadow: 'shadow-[0_0_8px_rgba(201,139,113,0.6)]', desc: 'At your current pace you may exceed your monthly allowance.' };
  } else if (healthStatus === 'Tight Budget') {
    health = { title: 'Tight Budget', color: 'bg-[#D8B4B1]', shadow: 'shadow-[0_0_8px_rgba(216,180,177,0.6)]', desc: 'You are spending faster than recommended and approaching your limit.' };
  } else if (healthStatus === 'On Track') {
    health = { title: 'On Track', color: 'bg-[#E5C07B]', shadow: 'shadow-[0_0_8px_rgba(229,192,123,0.6)]', desc: 'Your spending is close to your recommended pace.' };
  }

  const budgetStats = {
    availableBalance,
    remainingBalance,
    spentThisMonth,
    dailyBudget,
    avgSpending,
    daysLeft,
    health
  };

  // Neumorphic classes
  const neuExtrude = "bg-[#F5F2EC] shadow-[6px_6px_12px_#dfddd6,-6px_-6px_12px_#ffffff]";
  const neuIndent = "bg-[#F5F2EC] shadow-[inset_4px_4px_8px_#dfddd6,inset_-4px_-4px_8px_#ffffff]";

  return (
    <section className="relative w-full flex flex-col gap-10 pb-12 pt-4">
      
      {/* Top Section: Balance */}
      <div className="flex flex-col items-center relative mb-4">
        <span className="text-[13px] font-bold text-[#9B968B] uppercase tracking-[0.2em] mb-4">Remaining Balance</span>
        <div className="flex items-start text-[#6A6356]">
          <span className="text-[36px] font-semibold mt-1 mr-2 text-[#9B968B]">{currencySymbol}</span>
          <span className="text-[84px] font-bold tracking-tighter leading-none">
            {formatNumber(remainingBalance).split('.')[0]}
          </span>
          {formatNumber(remainingBalance).includes('.') && (
            <span className="text-[36px] font-semibold mt-1 text-[#9B968B]">
              .{formatNumber(remainingBalance).split('.')[1]}
            </span>
          )}
        </div>
      </div>

      {/* Row of Metric Cards */}
      <div className="flex gap-6 w-full px-6">
        {/* Spent This Month */}
        <div className={`flex-1 rounded-[32px] p-6 flex flex-col items-center justify-center text-center ${neuExtrude} min-h-[160px]`}>
          <div className="w-14 h-14 rounded-full bg-[#E8D4C8] shadow-inner flex items-center justify-center text-[#C98B71] shrink-0 mb-3">
            <Wallet size={22} strokeWidth={2.5} />
          </div>
          <span className="text-[11px] font-bold text-[#9B968B] uppercase tracking-widest leading-tight mb-1">
            Spent This Month
          </span>
          <span className="text-[24px] font-bold text-[#C98B71] tracking-tight">
            {formatAmount(spentThisMonth)}
          </span>
        </div>

        {/* Daily Budget */}
        <button 
          onClick={() => setIsHealthOpen(true)}
          className={`flex-1 rounded-[32px] p-6 flex flex-col items-center justify-center text-center ${neuExtrude} active:scale-95 transition-transform min-h-[160px]`}
        >
          <div className="w-14 h-14 rounded-full bg-[#D4DFE8] shadow-inner flex items-center justify-center text-[#A9BDD0] shrink-0 mb-3">
            <PieChart size={22} strokeWidth={2.5} />
          </div>
          <span className="text-[11px] font-bold text-[#9B968B] uppercase tracking-widest leading-tight mb-1">
            Daily Budget
          </span>
          <span className="text-[24px] font-bold text-[#6A6356] tracking-tight">
            {formatAmount(dailyBudget)}
          </span>
        </button>
      </div>

      {/* Concentric Ring Chart */}
      <div className="flex flex-col items-center relative w-full mt-6 gap-10">
        <div className="w-[320px] h-[320px] relative flex items-center justify-center">
          
          {/* Central Category Details Popup */}
          <AnimatePresence>
            {activeCategory && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20"
              >
                {(() => {
                  const selectedCat = categories.find(c => c.name === activeCategory);
                  if (!selectedCat) return null;
                  return (
                    <div className="flex flex-col items-center justify-center bg-white/95 backdrop-blur-md rounded-full w-[140px] h-[140px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1" style={{ backgroundColor: `${selectedCat.color}15`, color: selectedCat.color }}>
                        <selectedCat.icon size={20} strokeWidth={2.5} />
                      </div>
                      <span className="text-[10px] font-bold text-[#9B968B] uppercase tracking-[0.15em] mt-1">{selectedCat.name}</span>
                      <span className="text-[18px] font-bold text-[#6A6356] tracking-tight mt-0.5">{formatAmount(selectedCat.amount)}</span>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          <svg className="w-full h-full -rotate-90 drop-shadow-sm z-10" viewBox="0 0 300 300">
            <defs>
              <filter id="ring-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.08" />
              </filter>
            </defs>
            <g>
              {categories.map((cat, i) => {
                // Increased spacing and thickness to fill space
                const r = 130 - (i * 28); 
                const c = 2 * Math.PI * r;
                const offset = c - (c * (cat.percent / 100));
                
                // Opacity dimming if a category is selected
                const isActive = activeCategory === cat.name;
                const isFaded = activeCategory && !isActive;

                return (
                  <g
                    key={cat.name}
                    onClick={() => setActiveCategory(isActive ? null : cat.name)}
                    className="cursor-pointer transition-opacity duration-500 ease-out"
                    style={{ opacity: isFaded ? 0.3 : 1 }}
                  >
                    {/* Ring Background Track (Super subtle) */}
                    <circle cx="150" cy="150" r={r} fill="none" stroke={`${cat.color}20`} strokeWidth="18" strokeLinecap="round" />

                    {/* Animated Progress Ring */}
                    <motion.circle
                      initial={{ strokeDashoffset: c }}
                      animate={{ strokeDashoffset: offset }}
                      transition={{ duration: 1.8, delay: 0.1 + (i * 0.15), ease: [0.16, 1, 0.3, 1] }}
                      cx="150" cy="150" r={r} fill="none" stroke={cat.color} strokeWidth="18"
                      strokeDasharray={c} strokeLinecap="round" filter="url(#ring-shadow)"
                    />

                    {/* Invisible Hit Area for Reliable Taps */}
                    <circle cx="150" cy="150" r={r} fill="none" stroke="transparent" strokeWidth="28" />
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Floating Category Pill List */}
        <div className="grid grid-cols-2 gap-5 w-full px-4">
          {categories.map(cat => {
             const isActive = activeCategory === cat.name;
             return (
               <button
                 key={cat.name}
                 onClick={() => setActiveCategory(isActive ? null : cat.name)}
                 className={`flex items-center justify-center px-4 py-4 rounded-[20px] transition-all duration-300 ${
                   isActive 
                     ? `${neuIndent} border border-transparent` 
                     : `${neuExtrude} hover:scale-[0.98]`
                 } ${activeCategory && !isActive ? 'opacity-50 grayscale' : 'opacity-100'}`}
               >
                 <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                   <cat.icon size={18} className="text-[#9B968B]" />
                   <span className="text-[14px] font-bold text-[#6A6356]">{cat.name}</span>
                 </div>
               </button>
             );
          })}
        </div>
      </div>

      <BudgetHealthDrawer isOpen={isHealthOpen} onClose={() => setIsHealthOpen(false)} stats={budgetStats} />
    </section>
  );
}
