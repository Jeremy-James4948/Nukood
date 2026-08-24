/**
 * OnboardingPage — Phase 5
 *
 * Replaces OnboardingPlaceholder.tsx at the /onboarding route.
 *
 * Responsibilities:
 *  - Own the single OnboardingDraft state object.
 *  - Own the currentSlide index.
 *  - Animate between slides using AnimatePresence (motion/react).
 *  - On final confirm: call OnboardingService.completeOnboarding() then markAsOnboarded().
 *
 * Does NOT:
 *  - Write to Firestore directly.
 *  - Modify FinancialEngine, Transactions, Journals, etc.
 *  - Duplicate backend validation logic.
 *
 * Slide sequence:
 *   0 — WELCOME        (no data, no progress dots)
 *   1 — DISPLAY_NAME   (Q1, step 0)
 *   2 — BUDGET         (Q2, step 1)
 *   3 — CYCLE_DATE     (Q3, step 2)
 *   4 — CYCLE_NAME     (Q4, step 3)
 *   5 — CARRY_FORWARD  (Q5, step 4)
 *   6 — REVIEW         (no progress dots)
 *   7 — CONFIRM        (no progress dots)
 */

import React, { useState, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useInitialization } from '../../context/InitializationContext';
import { OnboardingService } from '../../services/onboarding.service';

import { WelcomeSlide }       from './slides/WelcomeSlide';
import { DisplayNameSlide }   from './slides/DisplayNameSlide';
import { BudgetSlide }        from './slides/BudgetSlide';
import { CycleStartDateSlide } from './slides/CycleStartDateSlide';
import { CycleNameSlide }     from './slides/CycleNameSlide';
import { CarryForwardSlide }  from './slides/CarryForwardSlide';
import { ReviewSlide }        from './slides/ReviewSlide';
import { ConfirmSlide }       from './slides/ConfirmSlide';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The single temporary onboarding state — exact Phase 2 contract */
export interface OnboardingDraft {
  profileName?: string;         // → FinancialSettings.profileName (optional)
  monthlyBudget: number;        // → FinancialSettings.monthlyBudget
  cycleStartDate: Date;         // → cycleConfiguration.startDate + Cycle.startDate
  cycleName: string;            // → Cycle.cycleName
  carryForwardEnabled: boolean; // → FinancialSettings.carryForwardEnabled
}

type SlideId =
  | 'WELCOME'
  | 'DISPLAY_NAME'
  | 'BUDGET'
  | 'CYCLE_DATE'
  | 'CYCLE_NAME'
  | 'CARRY_FORWARD'
  | 'REVIEW'
  | 'CONFIRM';

const SLIDE_ORDER: SlideId[] = [
  'WELCOME',
  'DISPLAY_NAME',
  'BUDGET',
  'CYCLE_DATE',
  'CYCLE_NAME',
  'CARRY_FORWARD',
  'REVIEW',
  'CONFIRM',
];

// ---------------------------------------------------------------------------
// Default draft
// ---------------------------------------------------------------------------

function buildDefaultDraft(): OnboardingDraft {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    profileName:        undefined,
    monthlyBudget:      0,
    cycleStartDate:     today,
    cycleName:          'Current Cycle',
    carryForwardEnabled: true,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const OnboardingPage: React.FC = () => {
  // Strip any global themes (dark mode, awesome mode) on mount so entry stays isolated
  React.useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark', 'light', 'awesome');
  }, []);

  const { user }            = useAuth();
  const { markAsOnboarded } = useInitialization();
  const shouldReduceMotion  = useReducedMotion();

  const [draft, setDraft]           = useState<OnboardingDraft>(buildDefaultDraft);
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection]   = useState<1 | -1>(1); // 1 = forward, -1 = back

  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [submitError, setSubmitError]     = useState<string | null>(null);
  const submittingRef                     = useRef(false); // guard against double-click

  const currentSlide: SlideId = SLIDE_ORDER[slideIndex];

  // ── Navigation helpers ────────────────────────────────────────────────────

  const goForward = () => {
    setDirection(1);
    setSlideIndex(i => Math.min(i + 1, SLIDE_ORDER.length - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setSlideIndex(i => Math.max(i - 1, 0));
  };

  const restart = () => {
    setDirection(-1);
    setDraft(buildDefaultDraft());
    setSubmitError(null);
    setSlideIndex(0); // back to WELCOME
  };

  // ── Final submission ──────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (submittingRef.current) return; // prevent double-submit
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await OnboardingService.completeOnboarding(user!.userId, {
        profileName:        draft.profileName,
        monthlyBudget:      draft.monthlyBudget,
        cycleStartDate:     draft.cycleStartDate,
        cycleName:          draft.cycleName,
        carryForwardEnabled: draft.carryForwardEnabled,
      });

      // Update in-memory initialization state — routing layer handles redirect to /
      markAsOnboarded();
    } catch (err: any) {
      setSubmitError(
        err?.message
          ?? 'Something went wrong while setting up your account.'
      );
      setIsSubmitting(false);
      submittingRef.current = false;
    }
    // NOTE: no finally setIsSubmitting(false) on success —
    // the component will unmount when the route changes, so no state update needed.
  };

  // ── Animation variants ────────────────────────────────────────────────────

  const slideVariants = {
    enter:  (dir: number) => ({
      x:       shouldReduceMotion ? 0 : dir * 40,
      opacity: 0,
    }),
    center: {
      x:       0,
      opacity: 1,
    },
    exit:   (dir: number) => ({
      x:       shouldReduceMotion ? 0 : dir * -40,
      opacity: 0,
    }),
  };

  const transition = {
    duration: shouldReduceMotion ? 0.01 : 0.3,
    ease: 'easeInOut' as const,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex items-center justify-center font-sans antialiased">
      {/* Mobile-width container matching the rest of the app */}
      <div
        className="w-full max-w-[428px] h-screen sm:h-[812px]
                   bg-background sm:rounded-[3rem]
                   sm:shadow-neu-outer
                   relative overflow-hidden flex flex-col"
      >
        <AnimatePresence
          mode="wait"
          custom={direction}
          initial={false}
        >
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
            style={{ pointerEvents: 'auto' }}
            className="absolute inset-0 flex flex-col"
          >
            {currentSlide === 'WELCOME' && (
              <WelcomeSlide onBegin={goForward} />
            )}

            {currentSlide === 'DISPLAY_NAME' && (
              <DisplayNameSlide
                value={draft.profileName}
                onChange={v => setDraft(d => ({ ...d, profileName: v }))}
                onNext={goForward}
                onBack={goBack}
              />
            )}

            {currentSlide === 'BUDGET' && (
              <BudgetSlide
                value={draft.monthlyBudget}
                onChange={v => setDraft(d => ({ ...d, monthlyBudget: v }))}
                onNext={goForward}
                onBack={goBack}
              />
            )}

            {currentSlide === 'CYCLE_DATE' && (
              <CycleStartDateSlide
                value={draft.cycleStartDate}
                onChange={v => setDraft(d => ({ ...d, cycleStartDate: v }))}
                onNext={goForward}
                onBack={goBack}
              />
            )}

            {currentSlide === 'CYCLE_NAME' && (
              <CycleNameSlide
                value={draft.cycleName}
                onChange={v => setDraft(d => ({ ...d, cycleName: v }))}
                onNext={goForward}
                onBack={goBack}
              />
            )}

            {currentSlide === 'CARRY_FORWARD' && (
              <CarryForwardSlide
                value={draft.carryForwardEnabled}
                onChange={v => setDraft(d => ({ ...d, carryForwardEnabled: v }))}
                onNext={goForward}
                onBack={goBack}
              />
            )}

            {currentSlide === 'REVIEW' && (
              <ReviewSlide
                draft={draft}
                onConfirm={goForward}
                onRestart={restart}
                onBack={goBack}
              />
            )}

            {currentSlide === 'CONFIRM' && (
              <ConfirmSlide
                isSubmitting={isSubmitting}
                submitError={submitError}
                onConfirm={handleSubmit}
                onBack={goBack}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
