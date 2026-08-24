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
      <div className="flex flex-col gap-8 items-center text-center w-full max-w-sm mx-auto mt-4">
        {/* Question */}
        <div className="flex flex-col gap-3 items-center">
          <p className="text-[13px] font-bold text-accent uppercase tracking-[0.2em]">
            Monthly budget
          </p>
          <h2 className="text-3xl font-semibold text-primary leading-snug tracking-wide" style={{ fontFamily: '"Playfair Display", serif' }}>
            What is your spending limit?
          </h2>
          <p className="text-[15px] text-muted-foreground font-medium leading-relaxed max-w-[280px]">
            You can always adjust this later.
          </p>
        </div>

        {/* Big currency input */}
        <div className="flex flex-col gap-2 relative w-full">
          <label htmlFor="monthlyBudget" className="sr-only">
            Monthly budget in rupees
          </label>
          <div
            className={`flex items-center justify-center gap-2 h-[80px] rounded-3xl bg-white/50 border
                        transition-all duration-300 relative z-0 focus-within:bg-white focus-within:shadow-md
                        ${error ? 'border-error/50 bg-error/5' : ''}`}
            style={{ borderColor: error ? undefined : 'var(--border)' }}
          >
            <span className="text-4xl font-light text-muted-foreground select-none mt-1">₹</span>
            
            <input
              id="monthlyBudget"
              type="text"
              inputMode="numeric"
              value={raw}
              onChange={handleInput}
              onFocus={() => setError(null)}
              placeholder="15,000"
              autoFocus
              className="w-[180px] h-full bg-transparent text-center
                         text-5xl font-semibold text-foreground placeholder:text-muted-foreground/30
                         outline-none tracking-tight"
            />
          </div>

          {/* Live formatted preview */}
          {displayFormatted && !error && (
            <p className="text-[13px] text-muted-foreground font-medium mt-2 opacity-80">
              ₹{displayFormatted} per cycle
            </p>
          )}

          {/* Validation error */}
          {error && (
            <p role="alert" className="text-[13px] text-error font-medium mt-2">
              {error}
            </p>
          )}
        </div>
      </div>
    </SlideLayout>
  );
};
