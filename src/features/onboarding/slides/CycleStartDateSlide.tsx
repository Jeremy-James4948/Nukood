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
      <div className="flex flex-col gap-8">
        {/* Question */}
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold text-[#A49F96] uppercase tracking-widest">
            Cycle start date
          </p>
          <h2 className="text-[28px] font-black text-foreground leading-snug tracking-tight">
            When should your financial cycle begin?
          </h2>
          <p className="text-[15px] text-foreground font-medium leading-relaxed">
            Your cycle length is one calendar month.
          </p>
        </div>

        {/* Date picker */}
        <div className="flex flex-col gap-4">
          <div
            className={`relative flex items-center rounded-[20px] bg-background
                        shadow-neu-card
                        ${error ? 'ring-2 ring-red-300' : ''}`}
          >
            <CalendarDays
              size={20}
              className="absolute left-5 text-[#A49F96] pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="cycleStartDate" className="sr-only">
              Cycle start date
            </label>
            <input
              id="cycleStartDate"
              type="date"
              value={inputValue}
              onChange={handleChange}
              className="w-full h-[60px] bg-transparent pl-12 pr-5
                         text-[18px] font-semibold text-foreground
                         outline-none cursor-pointer"
            />
          </div>

          {/* Live cycle preview — uses calculateCycleEndDate from onboarding.service.ts */}
          <div
            className="rounded-[20px] bg-background
                       shadow-neu-card
                       px-5 py-4 flex flex-col gap-1"
          >
            <p className="text-[12px] font-bold text-[#A49F96] uppercase tracking-wider">
              Your cycle will run
            </p>
            <p className="text-[22px] font-black text-foreground tracking-tight">
              {startLabel}{' '}
              <span className="text-[#A9BDD0]">→</span>{' '}
              {endLabel}
            </p>
          </div>

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
