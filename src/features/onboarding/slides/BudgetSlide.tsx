import React, { useState } from 'react';
import { SlideLayout } from '../components/SlideLayout';

interface BudgetSlideProps {
  value: number;
  onChange: (v: number) => void;
  onNext: () => void;
  onBack: () => void;
}

/** Format a number as comma-separated (no decimals) for display */
function formatDisplay(n: number): string {
  if (!n && n !== 0) return '';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(n);
}

export const BudgetSlide: React.FC<BudgetSlideProps> = ({
  value,
  onChange,
  onNext,
  onBack,
}) => {
  // Raw string so the user can type freely; we parse on blur/next
  const [raw, setRaw] = useState<string>(value > 0 ? String(value) : '');
  const [error, setError] = useState<string | null>(null);

  const parsed = parseFloat(raw.replace(/,/g, '')) || 0;
  const displayFormatted = parsed > 0 ? formatDisplay(parsed) : '';

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits and one optional decimal
    const cleaned = e.target.value.replace(/[^0-9.]/g, '');
    setRaw(cleaned);
    setError(null);
  };

  const handleNext = () => {
    const numeric = parseFloat(raw.replace(/,/g, ''));
    if (!numeric || numeric <= 0 || !isFinite(numeric)) {
      setError('Please enter a budget greater than ₹0.');
      return;
    }
    onChange(numeric);
    onNext();
  };

  return (
    <SlideLayout
      step={1}
      showBack
      onBack={onBack}
      primaryLabel="Continue"
      onPrimary={handleNext}
    >
      <div className="flex flex-col gap-8">
        {/* Question */}
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold text-[#A49F96] uppercase tracking-widest">
            Monthly budget
          </p>
          <h2 className="text-[28px] font-black text-foreground leading-snug tracking-tight">
            How much would you like to budget for this cycle?
          </h2>
          <p className="text-[15px] text-foreground font-medium leading-relaxed">
            You can always adjust this later in settings.
          </p>
        </div>

        {/* Big currency input */}
        <div className="flex flex-col gap-3">
          <div
            className={`flex items-center gap-3 rounded-[24px] bg-background px-6
                        shadow-neu-card
                        ${error ? 'ring-2 ring-red-300' : ''}`}
          >
            <span className="text-[32px] font-black text-[#A49F96] select-none">₹</span>
            <label htmlFor="monthlyBudget" className="sr-only">
              Monthly budget in rupees
            </label>
            <input
              id="monthlyBudget"
              type="text"
              inputMode="numeric"
              value={raw}
              onChange={handleInput}
              onFocus={() => setError(null)}
              placeholder="15,000"
              autoFocus
              className="flex-1 h-[72px] bg-transparent
                         text-[32px] font-black text-foreground placeholder-[#D1CDC7]
                         outline-none"
            />
          </div>

          {/* Live formatted preview */}
          {displayFormatted && (
            <p className="text-[15px] text-[#A49F96] font-semibold pl-2">
              ₹{displayFormatted} per cycle
            </p>
          )}

          {/* Validation error */}
          {error && (
            <p role="alert" className="text-[14px] text-error font-semibold pl-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </SlideLayout>
  );
};
