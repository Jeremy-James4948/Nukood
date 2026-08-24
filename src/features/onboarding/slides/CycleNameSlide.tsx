import React, { useState } from 'react';
import { SlideLayout } from '../components/SlideLayout';

interface CycleNameSlideProps {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const MAX_LENGTH = 30;
const DEFAULT_PLACEHOLDER = 'e.g. August, Semester Start';

export const CycleNameSlide: React.FC<CycleNameSlideProps> = ({
  value,
  onChange,
  onNext,
  onBack,
}) => {
  const [touched, setTouched] = useState(false);

  const trimmed = value.trim();
  const isInvalid = touched && trimmed.length === 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length > MAX_LENGTH) return;
    onChange(e.target.value);
  };

  const handleNext = () => {
    setTouched(true);
    if (trimmed.length === 0) return;
    onChange(trimmed); // store trimmed value
    onNext();
  };

  return (
    <SlideLayout
      step={3}
      showBack
      onBack={onBack}
      primaryLabel="Continue"
      onPrimary={handleNext}
      primaryDisabled={touched && trimmed.length === 0}
    >
      <div className="flex flex-col gap-8 items-center text-center w-full max-w-sm mx-auto mt-4">
        {/* Question */}
        <div className="flex flex-col gap-3 items-center">
          <p className="text-[13px] font-bold text-accent uppercase tracking-[0.2em]">
            Cycle name
          </p>
          <h2 className="text-3xl font-semibold text-primary leading-snug tracking-wide" style={{ fontFamily: '"Playfair Display", serif' }}>
            What should we call this cycle?
          </h2>
          <p className="text-[15px] text-muted-foreground font-medium leading-relaxed max-w-[280px]">
            Give it a name that makes sense to you.
          </p>
        </div>

        {/* Input */}
        <div className="flex flex-col gap-2 relative group w-full">
          <label htmlFor="cycleName" className="sr-only">
            Cycle name
          </label>
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary text-muted-foreground z-10 h-[60px]">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
               <polyline points="7 10 12 15 17 10"></polyline>
               <line x1="12" y1="15" x2="12" y2="3"></line>
             </svg>
          </div>
          <input
            id="cycleName"
            type="text"
            value={value}
            onChange={handleChange}
            onBlur={() => setTouched(true)}
            placeholder={DEFAULT_PLACEHOLDER}
            autoFocus
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? 'cycleName-error' : undefined}
            className={`w-full h-[60px] rounded-2xl bg-white/50 border px-12
                       text-[16px] font-medium text-foreground placeholder:text-muted-foreground/60
                       outline-none focus:bg-white focus:shadow-md transition-all duration-300 relative z-0 text-center
                       ${isInvalid ? 'border-error/50 bg-error/5' : ''}`}
            style={{ borderColor: isInvalid ? undefined : 'var(--border)' }}
          />
          <div className="flex justify-between px-2 mt-1">
            {isInvalid ? (
              <p id="cycleName-error" role="alert" className="text-[12px] text-error font-medium">
                Please enter a name for your cycle.
              </p>
            ) : (
              <span />
            )}
            <p className="text-[12px] text-muted-foreground font-medium">
              {value.length}/{MAX_LENGTH}
            </p>
          </div>
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {['August', 'September', 'Monthly', 'First Cycle'].map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                onChange(suggestion);
                setTouched(false);
              }}
              className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-primary
                         bg-white/40 border transition-all active:scale-95 hover:bg-white hover:shadow-sm"
              style={{ borderColor: 'var(--border)' }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
};
