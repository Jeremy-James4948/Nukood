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
      <div className="flex flex-col gap-8 items-center text-center w-full max-w-sm mx-auto mt-4">
        <div className="flex flex-col gap-3 items-center">
          <p className="text-[13px] font-bold text-accent uppercase tracking-[0.2em]">
            Your Identity
          </p>
          <h2 className="text-3xl font-semibold text-primary leading-snug tracking-wide" style={{ fontFamily: '"Playfair Display", serif' }}>
            What should we call you?
          </h2>
          <p className="text-[15px] text-muted-foreground font-medium leading-relaxed max-w-[280px]">
            Optional — you can always change this later.
          </p>
        </div>

        {/* Input */}
        <div className="flex flex-col gap-2 relative group w-full">
          <label htmlFor="displayName" className="sr-only">
            Your name
          </label>
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary text-muted-foreground z-10 h-[60px]">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
               <circle cx="12" cy="7" r="4"></circle>
             </svg>
          </div>
          <input
            id="displayName"
            type="text"
            value={displayValue}
            onChange={handleChange}
            onBlur={() => setTouched(true)}
            placeholder="e.g. James"
            autoComplete="given-name"
            autoFocus
            className="w-full h-[60px] rounded-2xl bg-white/50 border px-12
                       text-[16px] font-medium text-foreground placeholder:text-muted-foreground/60
                       outline-none focus:bg-white focus:shadow-md transition-all duration-300 relative z-0 text-center"
            style={{ borderColor: 'var(--border)' }}
          />
          <p className="text-[12px] text-muted-foreground font-medium mt-1">
            {displayValue.length}/{MAX_LENGTH}
          </p>
        </div>

        {/* Skip hint */}
        <p className="text-[13px] text-muted-foreground font-medium text-center opacity-80 mt-2">
          This field is optional — tap{' '}
          <span className="font-bold text-primary">Continue</span> to skip.
        </p>
      </div>
    </SlideLayout>
  );
};
