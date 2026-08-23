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
      <div className="flex flex-col gap-8">
        {/* Question */}
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold text-[#A49F96] uppercase tracking-widest">
            Unused budget
          </p>
          <h2 className="text-[28px] font-black text-foreground leading-snug tracking-tight">
            Would you like unused budget to carry into your next cycle?
          </h2>
          <p className="text-[15px] text-foreground font-medium leading-relaxed">
            You can change this any time in settings.
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Carry forward preference">
          {options.map(opt => {
            const isSelected = value === opt.value;
            return (
              <motion.button
                key={String(opt.value)}
                whileTap={{ scale: 0.98 }}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange(opt.value)}
                className={`relative w-full rounded-[24px] px-6 py-5 text-left transition-all
                            flex items-center justify-between gap-4
                            ${isSelected
                              ? 'shadow-neu-strong bg-background'
                              : 'shadow-neu-card bg-background hover:shadow-neu-card'
                            }`}
              >
                <div className="flex flex-col gap-1">
                  <span
                    className={`text-[17px] font-bold transition-colors ${
                      isSelected ? 'text-foreground' : 'text-foreground'
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[13px] font-medium text-[#A49F96]">
                    {opt.sub}
                  </span>
                </div>

                {/* Check indicator */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? 'bg-primary'
                      : 'bg-background shadow-neu-card'
                  }`}
                >
                  {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </SlideLayout>
  );
};
