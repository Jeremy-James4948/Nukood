import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { SlideLayout } from '../components/SlideLayout';
import { calculateCycleEndDate } from '../../../services/onboarding.service';

interface CycleStartDateSlideProps {
  value: Date;
  onChange: (v: Date) => void;
  onNext: () => void;
  onBack: () => void;
}

/** Convert a Date to yyyy-MM-dd (the value format for <input type="date">) */
function toInputValue(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export const CycleStartDateSlide: React.FC<CycleStartDateSlideProps> = ({
  value,
  onChange,
  onNext,
  onBack,
}) => {
  const [error, setError] = useState<string | null>(null);
  const inputValue = toInputValue(value);

  const endDate = useMemo(() => calculateCycleEndDate(value), [value]);

  const startLabel = format(value,   'd MMM');
  const endLabel   = format(endDate, 'd MMM');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw) return;
    const parsed = new Date(raw + 'T00:00:00'); // force local midnight
    if (isNaN(parsed.getTime())) return;
    onChange(parsed);
    setError(null);
  };

  const handleNext = () => {
    if (!value || isNaN(value.getTime())) {
      setError('Please choose a valid start date.');
      return;
    }
    onNext();
  };

  return (
    <SlideLayout
      step={2}
      showBack
      onBack={onBack}
      primaryLabel="Continue"
      onPrimary={handleNext}
    >
      <div className="flex flex-col gap-8 items-center text-center w-full max-w-sm mx-auto mt-4">
        {/* Question */}
        <div className="flex flex-col gap-3 items-center">
          <p className="text-[13px] font-bold text-accent uppercase tracking-[0.2em]">
            Cycle start date
          </p>
          <h2 className="text-3xl font-semibold text-primary leading-snug tracking-wide" style={{ fontFamily: '"Playfair Display", serif' }}>
            When should your cycle begin?
          </h2>
          <p className="text-[15px] text-muted-foreground font-medium leading-relaxed max-w-[280px]">
            Your cycle length is exactly one calendar month.
          </p>
        </div>

        {/* Date picker */}
        <div className="flex flex-col gap-4 w-full">
          <label htmlFor="cycleStartDate" className="sr-only">
            Cycle start date
          </label>
          
          {/* Custom Date Input Wrapper */}
          <div
            className={`relative flex items-center justify-center w-full h-[64px] rounded-2xl bg-white/50 border
                        transition-all duration-300 focus-within:bg-white focus-within:shadow-md
                        hover:bg-white/70 overflow-hidden
                        ${error ? 'border-error/50 bg-error/5' : ''}`}
            style={{ borderColor: error ? undefined : 'var(--border)' }}
          >
            <CalendarDays 
              size={18} 
              strokeWidth={2} 
              className="absolute left-5 text-muted-foreground transition-colors pointer-events-none" 
            />
            
            {/* The visually perfect date text */}
            <span className="text-[17px] font-semibold text-primary pointer-events-none tracking-wide">
              {format(value, 'MMMM d, yyyy')}
            </span>
            
            {/* The invisible native date picker that intercepts clicks */}
            <input
              id="cycleStartDate"
              type="date"
              value={inputValue}
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Live cycle preview */}
          <div
            className="rounded-2xl bg-white/40 border
                       px-5 py-4 flex flex-col gap-1 items-center justify-center mt-2 shadow-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest opacity-80">
              Your cycle will run
            </p>
            <p className="text-xl font-bold text-primary tracking-tight mt-1">
              {startLabel}{' '}
              <span className="text-accent mx-2">&rarr;</span>{' '}
              {endLabel}
            </p>
          </div>

          {error && (
            <p role="alert" className="text-[13px] text-error font-medium mt-1">
              {error}
            </p>
          )}
        </div>
      </div>
    </SlideLayout>
  );
};
