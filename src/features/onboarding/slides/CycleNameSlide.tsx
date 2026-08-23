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
      <div className="flex flex-col gap-8">
        {/* Question */}
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold text-[#A49F96] uppercase tracking-widest">
            Cycle name
          </p>
          <h2 className="text-[28px] font-black text-foreground leading-snug tracking-tight">
            What would you like to call this cycle?
          </h2>
          <p className="text-[15px] text-foreground font-medium leading-relaxed">
            Give it a name that makes sense to you.
          </p>
        </div>

        {/* Input */}
        <div className="flex flex-col gap-2">
          <label htmlFor="cycleName" className="sr-only">
            Cycle name
          </label>
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
            className={`w-full h-[60px] rounded-[20px] bg-background px-6
                        text-[18px] font-semibold text-foreground placeholder-[#C9C4BC]
                        outline-none transition-all
                        shadow-neu-card
                        focus:ring-2 focus:ring-[#355C7D]/20
                        ${isInvalid ? 'ring-2 ring-red-300' : ''}`}
          />
          <div className="flex justify-between px-1">
            {isInvalid ? (
              <p id="cycleName-error" role="alert" className="text-[13px] text-error font-semibold">
                Please enter a name for your cycle.
              </p>
            ) : (
              <span />
            )}
            <p className="text-[12px] text-[#A49F96] font-medium ml-auto">
              {value.length}/{MAX_LENGTH}
            </p>
          </div>
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap gap-2">
          {['August', 'September', 'Monthly', 'First Cycle'].map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                onChange(suggestion);
                setTouched(false);
              }}
              className="px-4 py-2 rounded-full text-[13px] font-semibold text-foreground
                         bg-background shadow-neu-card
                         hover:shadow-neu-card
                         transition-all active:scale-95"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
};
