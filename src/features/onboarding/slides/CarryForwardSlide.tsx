import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { SlideLayout } from '../components/SlideLayout';

interface CarryForwardSlideProps {
  value: boolean;
  onChange: (v: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

export const CarryForwardSlide: React.FC<CarryForwardSlideProps> = ({
  value,
  onChange,
  onNext,
  onBack,
}) => {
  const options: { label: string; sub: string; value: boolean }[] = [
    {
      value: true,
      label: 'Yes, carry it forward',
      sub: 'Unused budget rolls into the next cycle.',
    },
    {
      value: false,
      label: 'No, start fresh',
      sub: 'Each cycle starts with the same budget.',
    },
  ];

  return (
    <SlideLayout
      step={4}
      showBack
      onBack={onBack}
      primaryLabel="Continue"
      onPrimary={onNext}
    >
      <div className="flex flex-col gap-8 items-center text-center w-full max-w-sm mx-auto mt-4">
        {/* Question */}
        <div className="flex flex-col gap-3 items-center">
          <p className="text-[13px] font-bold text-accent uppercase tracking-[0.2em]">
            Unused budget
          </p>
          <h2 className="text-3xl font-semibold text-primary leading-snug tracking-wide" style={{ fontFamily: '"Playfair Display", serif' }}>
            Carry forward unused budget?
          </h2>
          <p className="text-[15px] text-muted-foreground font-medium leading-relaxed max-w-[280px]">
            Any money left over rolls into the next cycle. You can change this later.
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-4 w-full" role="radiogroup" aria-label="Carry forward preference">
          {options.map(opt => {
            const isSelected = value === opt.value;
            return (
              <motion.button
                key={String(opt.value)}
                whileTap={{ scale: 0.98 }}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange(opt.value)}
                className={`relative w-full rounded-2xl px-6 py-5 text-left transition-all duration-300
                            flex items-center justify-between gap-4 border
                            ${isSelected
                              ? 'bg-white shadow-md border-primary/20'
                              : 'bg-white/40 border-[var(--border)] hover:bg-white/70'
                            }`}
              >
                <div className="flex flex-col gap-1">
                  <span
                    className={`text-[17px] font-semibold transition-colors ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[13px] font-medium text-muted-foreground">
                    {opt.sub}
                  </span>
                </div>

                {/* Check indicator */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all border ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'bg-transparent border-[var(--border)]'
                  }`}
                >
                  <motion.div
                    initial={false}
                    animate={{ scale: isSelected ? 1 : 0, opacity: isSelected ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check size={14} className="text-white" strokeWidth={3} />
                  </motion.div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </SlideLayout>
  );
};
