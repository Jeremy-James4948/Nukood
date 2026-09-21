import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar } from 'lucide-react';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { FinancialCycleService } from '../../services/financialCycle.service';

interface ActiveCycleEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActiveCycleEditorDrawer({ isOpen, onClose }: ActiveCycleEditorDrawerProps) {
  const { activeCycle, userId, settings, transactions, refreshCycle } = useFinancialEngine();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const [endDateValue, setEndDateValue] = useState(
    activeCycle ? formatDateForInput(new Date(activeCycle.endDate)) : ''
  );

  if (!activeCycle || !settings) return null;

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const newEndDate = new Date(endDateValue);
      newEndDate.setHours(23, 59, 59, 999);

      // If moving end date earlier and transactions exist beyond the new date,
      // split the cycle.
      if (newEndDate < new Date(activeCycle.endDate)) {
        const transactionsAfter = transactions.filter(tx => new Date(tx.date) > newEndDate);

        if (transactionsAfter.length > 0) {
          const newCycleName = new Date(newEndDate.getTime() + 24 * 60 * 60 * 1000)
            .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          const confirmed = window.confirm(
            `${transactionsAfter.length} transaction(s) after ${newEndDate.toLocaleDateString()} will be moved to a new cycle ("${newCycleName}") automatically. Continue?`
          );
          
          if (!confirmed) {
            setIsSubmitting(false);
            return;
          }
          
          await FinancialCycleService.splitCycleAtDate(
            userId,
            activeCycle,
            newEndDate,
            transactionsAfter,
            settings,
            newCycleName
          );
          
          window.location.reload();
          return;
        }
      }

      // If no split is needed (or we are stretching it), just update the active cycle directly
      await FinancialCycleService.updateCycleEndDate(userId, activeCycle.cycleId, newEndDate);
      await refreshCycle();
      onClose();

    } catch (e) {
      console.error(e);
      alert('Failed to update cycle end date.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 h-[50vh] bg-background shadow-neu-extrude rounded-t-[3rem] z-[70] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-8 py-6 pb-2">
              <h2 className="text-[24px] font-bold tracking-tight text-foreground">Edit Current Cycle</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-background shadow-neu-extrude active:shadow-neu-inset text-muted-foreground transition-all"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6">
              <p className="text-[13px] text-muted-foreground font-medium mb-8 leading-relaxed">
                You can shrink or stretch your current active cycle. Shortening it past existing transactions will automatically move them to a newly created cycle.
              </p>

              <div className="flex flex-col gap-2 mb-8">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-4">End Date</span>
                <div className="h-14 bg-background shadow-neu-inset rounded-full flex items-center px-6 relative overflow-hidden group focus-within:shadow-neu-inset-strong transition-all">
                  <Calendar size={18} className="text-muted-foreground mr-3" strokeWidth={2.5} />
                  <input
                    type="date"
                    value={endDateValue}
                    onChange={(e) => setEndDateValue(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-foreground w-full"
                  />
                </div>
              </div>
            </div>

            <div className="px-8 pb-8 pt-4">
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="w-full h-14 bg-foreground text-background rounded-full font-bold text-[15px] tracking-wide shadow-lg active:scale-95 transition-transform disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
