import React from 'react';
import { motion } from 'motion/react';

interface OnboardingProgressProps {
  /** Current question index (0 = Q_DISPLAY_NAME, 4 = Q_CARRY_FORWARD) */
  currentStep: number;
  /** Total number of question slides (5) */
  totalSteps: number;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  totalSteps,
}) => {
  return (
    <div
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
      className="flex items-center justify-center gap-2"
    >
      {Array.from({ length: totalSteps }).map((_, i) => {
        const isPast    = i < currentStep;
        const isCurrent = i === currentStep;

        return (
          <motion.div
            key={i}
            initial={false}
            animate={{
              width:           isCurrent ? 24 : 8,
              backgroundColor: isCurrent
                ? '#355C7D'
                : isPast
                ? '#A9BDD0'
                : '#D1CDC7',
              opacity: isCurrent ? 1 : isPast ? 0.8 : 0.45,
            }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="h-2 rounded-full"
          />
        );
      })}
    </div>
  );
};
