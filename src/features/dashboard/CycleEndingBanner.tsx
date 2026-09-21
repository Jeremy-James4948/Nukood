import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Settings2 } from 'lucide-react';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { FinancialEngine } from '../../utils/FinancialEngine';
import { SettingsDrawer } from '../settings/SettingsDrawer';

export function CycleEndingBanner() {
  const { activeCycle, settings } = useFinancialEngine();
  const [isVisible, setIsVisible] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [nextDates, setNextDates] = useState<{ start: string, end: string } | null>(null);

  useEffect(() => {
    if (!activeCycle || !settings) return;

    const remaining = FinancialEngine.calculateRemainingDays(activeCycle);
    
    // Only show if 2 or fewer days remaining, but not if cycle is deeply negative (should have auto-closed)
    if (remaining <= 2 && remaining >= 0) {
      // Check if user dismissed this specific warning
      const dismissKey = `cycle_dismiss_${activeCycle.cycleId}_${remaining}`;
      const hasDismissed = localStorage.getItem(dismissKey);

      if (!hasDismissed) {
        setDaysLeft(remaining);
        setIsVisible(true);

        // Calculate predicted next cycle dates
        const configuredStart = new Date(settings.cycleConfiguration.startDate);
        configuredStart.setHours(0, 0, 0, 0);
        const chainedStart = new Date(activeCycle.endDate.getTime() + 24 * 60 * 60 * 1000);
        chainedStart.setHours(0, 0, 0, 0);

        const nextStart = configuredStart > activeCycle.endDate ? configuredStart : chainedStart;
        
        const nextEnd = new Date(nextStart);
        nextEnd.setDate(nextStart.getDate() + settings.cycleConfiguration.cycleLengthDays - 1);

        setNextDates({
          start: nextStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          end: nextEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
    }
  }, [activeCycle, settings]);

  const handleDismiss = () => {
    if (!activeCycle || daysLeft === null) return;
    const dismissKey = `cycle_dismiss_${activeCycle.cycleId}_${daysLeft}`;
    localStorage.setItem(dismissKey, 'true');
    setIsVisible(false);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  if (!isVisible || !nextDates) return (
    <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
  );

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          className="w-full px-6 mb-2 overflow-hidden"
        >
          <div className="bg-[#E5C07B]/10 border border-[#E5C07B]/30 rounded-2xl p-4 flex flex-col gap-3 relative">
            <button 
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-[#E5C07B] hover:bg-[#E5C07B]/20 p-1 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-start gap-3 pr-6">
              <AlertCircle className="text-[#E5C07B] shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-[14px] font-bold text-foreground mb-1">
                  Cycle Ends {daysLeft === 0 ? 'Today' : `in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}`}
                </h4>
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Your next cycle will automatically run from <strong className="text-foreground">{nextDates.start}</strong> to <strong className="text-foreground">{nextDates.end}</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button 
                onClick={handleDismiss}
                className="flex-1 py-2 rounded-xl text-[12px] font-bold text-[#E5C07B] bg-[#E5C07B]/10 hover:bg-[#E5C07B]/20 transition-colors"
              >
                Proceed as Normal
              </button>
              <button 
                onClick={handleOpenSettings}
                className="flex-[1.5] py-2 rounded-xl text-[12px] font-bold text-background bg-[#E5C07B] hover:bg-[#E5C07B]/90 transition-colors flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(229,192,123,0.3)]"
              >
                <Settings2 size={14} /> Plan Next Cycle
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <SettingsDrawer isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
