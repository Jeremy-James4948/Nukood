import React, { useState } from 'react';
import { SlideLayout } from '../components/SlideLayout';

interface DisplayNameSlideProps {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  onNext: () => void;
  onBack: () => void;
}

const MAX_LENGTH = 50;

export const DisplayNameSlide: React.FC<DisplayNameSlideProps> = ({
  value,
  onChange,
  onNext,
  onBack,
}) => {
  const [touched, setTouched] = useState(false);
  const displayValue = value ?? '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.length > MAX_LENGTH) return;
    onChange(raw.length > 0 ? raw : undefined);
  };

  const handleNext = () => {
    setTouched(true);
    // Trim whitespace before advancing
    const trimmed = displayValue.trim();
    onChange(trimmed.length > 0 ? trimmed : undefined);
    onNext();
  };

  return (
    <SlideLayout
      step={0}
      showBack
      onBack={onBack}
      primaryLabel="Continue"
      onPrimary={handleNext}
    >
      {/* Question */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold text-[#A49F96] uppercase tracking-widest">
            Your name
          </p>
          <h2 className="text-[28px] font-black text-foreground leading-snug tracking-tight">
            What should we call you?
          </h2>
          <p className="text-[15px] text-foreground font-medium leading-relaxed">
            Optional — you can always change this later in settings.
          </p>
        </div>

        {/* Input */}
        <div className="flex flex-col gap-2">
          <label htmlFor="displayName" className="sr-only">
            Your name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayValue}
            onChange={handleChange}
            onBlur={() => setTouched(true)}
            placeholder="e.g. James"
            autoComplete="given-name"
            autoFocus
            className="w-full h-[60px] rounded-[20px] bg-background px-6
                       text-[18px] font-semibold text-foreground placeholder-[#C9C4BC]
                       outline-none focus:ring-2 focus:ring-[#355C7D]/20 transition-all
                       shadow-neu-card"
          />
          <p className="text-right text-[12px] text-[#A49F96] font-medium pr-1">
            {displayValue.length}/{MAX_LENGTH}
          </p>
        </div>

        {/* Skip hint */}
        <p className="text-[13px] text-[#A49F96] font-medium text-center">
          This field is optional — tap{' '}
          <span className="font-bold text-foreground">Continue</span> to skip.
        </p>
      </div>
    </SlideLayout>
  );
};
