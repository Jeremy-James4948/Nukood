import React from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';
import { useCurrencyFormatter } from '../../utils/currency';

export function BudgetHealthDrawer({ isOpen, onClose, stats }: { isOpen: boolean; onClose: () => void; stats: any }) {
  const { formatAmount } = useCurrencyFormatter();
  if (!stats) return null;

  const LEGEND = [
    { color: 'bg-green-400', shadow: 'shadow-[0_0_8px_rgba(74,222,128,0.6)]', title: 'Comfortable', desc: 'You are spending comfortably below your daily target.' },
    { color: 'bg-yellow-400', shadow: 'shadow-[0_0_8px_rgba(250,204,21,0.6)]', title: 'On Track', desc: 'Your spending is close to your recommended pace.' },
    { color: 'bg-orange-400', shadow: 'shadow-[0_0_8px_rgba(251,146,60,0.6)]', title: 'Caution', desc: 'You are spending slightly faster than recommended.' },
    { color: 'bg-red-500', shadow: 'shadow-[0_0_8px_rgba(239,68,68,0.6)]', title: 'Overspending', desc: 'At your current pace you may exceed your monthly allowance.' },
  ];

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-[#355C7D]/20 backdrop-blur-md z-[200]" />
        <Drawer.Content className="bg-[#F9FAFB] flex flex-col rounded-t-[40px] mt-12 max-h-[90vh] fixed bottom-0 left-0 right-0 z-[201] max-w-[428px] mx-auto shadow-2xl outline-none">

          <div className="pt-6 pb-2 px-8 flex flex-col items-center shrink-0 relative bg-white rounded-t-[40px]">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-6" />
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full text-[#6C5B7B] hover:bg-gray-100 transition-colors">
              <X size={20} />
            </button>
            <Drawer.Title className="text-2xl font-bold text-[#355C7D] mb-4">Budget Health</Drawer.Title>
            <Drawer.Description className="sr-only">Detailed breakdown of your daily budget health</Drawer.Description>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#F9FAFB] p-6 pb-12 flex flex-col gap-8">

            {/* Current Status */}
            <div className="flex flex-col items-center bg-white rounded-[32px] p-8 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.05)] border border-gray-50">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${stats.health.color.replace('bg-', '').replace('-400', '').replace('-500', '')}20` }}>
                <div className={`w-8 h-8 rounded-full ${stats.health.color} ${stats.health.shadow}`} />
              </div>
              <h3 className="text-2xl font-bold text-[#355C7D] mb-2">{stats.health.title}</h3>
              <p className="text-[14px] font-medium text-[#6C5B7B] text-center px-4">{stats.health.desc}</p>
            </div>

            {/* 4 Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-50 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#6C5B7B]/70 uppercase tracking-widest">Recommended</span>
                <span className="text-xl font-bold text-[#355C7D]">{formatAmount(stats.dailyBudget)}<span className="text-[12px] text-[#6C5B7B] font-semibold">/day</span></span>
              </div>
              <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-50 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#6C5B7B]/70 uppercase tracking-widest">Avg Spending</span>
                <span className="text-xl font-bold text-[#355C7D]">{formatAmount(stats.avgSpending)}<span className="text-[12px] text-[#6C5B7B] font-semibold">/day</span></span>
              </div>
              <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-50 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#6C5B7B]/70 uppercase tracking-widest">Remaining Bal</span>
                <span className="text-xl font-bold text-[#355C7D]">{formatAmount(stats.availableBalance)}</span>
              </div>
              <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-50 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#6C5B7B]/70 uppercase tracking-widest">Remaining Days</span>
                <span className="text-xl font-bold text-[#355C7D]">{stats.daysLeft}</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-bold text-[#6C5B7B]/50 uppercase tracking-widest pl-2 block">Indicators</span>
              <div className="bg-white rounded-[24px] shadow-sm border border-gray-50 overflow-hidden flex flex-col">
                {LEGEND.map((item, i) => (
                  <div key={i} className={`flex gap-4 p-5 ${i !== LEGEND.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className="mt-1 shrink-0">
                      <div className={`w-3.5 h-3.5 rounded-full ${item.color} ${item.shadow}`} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[15px] font-bold text-[#355C7D] leading-none">{item.title}</span>
                      <span className="text-[13px] font-medium text-[#6C5B7B] leading-tight pr-2">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
