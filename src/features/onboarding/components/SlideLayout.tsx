import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { OnboardingProgress } from './OnboardingProgress';

interface SlideLayoutProps {
  /** Which question step this slide is for (0-indexed, used for progress dots).
   *  Pass undefined for Welcome / Review / Confirm (no dots shown). */
  step?: number;
  /** Total question steps (5) — only used when step is defined. */
  totalSteps?: number;
  /** Whether a Back button should appear */
  showBack?: boolean;
  onBack?: () => void;
  /** Continue / primary action button */
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  /** Optional secondary action (e.g. "Start over") */
  secondaryLabel?: string;
  onSecondary?: () => void;
  children: React.ReactNode;
}

export const SlideLayout: React.FC<SlideLayoutProps> = ({
  step,
  totalSteps = 5,
  showBack = false,
  onBack,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryLoading = false,
  secondaryLabel,
  onSecondary,
  children,
}) => {
  return (
    <div className="flex flex-col h-full">

      {/* ── Header bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4 min-h-[64px]">
        {showBack ? (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onBack}
            aria-label="Go back"
            className="w-10 h-10 rounded-full bg-background shadow-neu-card
                       flex items-center justify-center text-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={20} />
          </motion.button>
        ) : (
          <div className="w-10" />
        )}

        {step !== undefined ? (
          <OnboardingProgress currentStep={step} totalSteps={totalSteps} />
        ) : (
          <div />
        )}

        {/* spacer to balance the back button */}
        <div className="w-10" />
      </div>

      {/* ── Slide content ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-6 overflow-y-auto">
        {children}
      </div>

      {/* ── Bottom actions ─────────────────────────────────────── */}
      {(primaryLabel || secondaryLabel) && (
        <div className="px-6 pb-10 pt-4 flex flex-col gap-3">
          {primaryLabel && (
            <motion.button
              whileTap={!primaryDisabled && !primaryLoading ? { scale: 0.97 } : {}}
              onClick={onPrimary}
              disabled={primaryDisabled || primaryLoading}
              aria-label={primaryLabel}
              className={`group relative w-full h-[60px] rounded-2xl bg-primary text-white text-[15px] tracking-widest font-bold
                          flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 overflow-hidden
                          shadow-lg
                          disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed`}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 flex items-center gap-2">
                {primaryLoading ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="20" height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Setting things up…
                  </>
                ) : (
                  primaryLabel.toUpperCase()
                )}
              </span>
            </motion.button>
          )}

          {secondaryLabel && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onSecondary}
              aria-label={secondaryLabel}
              className="w-full h-[48px] rounded-[20px] text-muted-foreground text-[14px] font-semibold
                         flex items-center justify-center transition-colors hover:text-foreground"
            >
              {secondaryLabel}
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
};
