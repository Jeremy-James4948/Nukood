import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Rocket } from 'lucide-react';
import { SlideLayout } from '../components/SlideLayout';

interface ConfirmSlideProps {
  isSubmitting: boolean;
  submitError: string | null;
  onConfirm: () => void;
  onBack: () => void;
}

export const ConfirmSlide: React.FC<ConfirmSlideProps> = ({
  isSubmitting,
  submitError,
  onConfirm,
  onBack,
}) => {
  return (
    <SlideLayout
      showBack={!isSubmitting}
      onBack={onBack}
      primaryLabel={submitError ? 'Try again' : "Let's begin"}
      onPrimary={onConfirm}
      primaryLoading={isSubmitting}
      primaryDisabled={isSubmitting}
    >
      <div className="flex flex-col items-center gap-8 text-center">

        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-24 h-24 rounded-[32px] bg-background
                     shadow-neu-card
                     flex items-center justify-center"
        >
          <Rocket size={40} className="text-foreground" />
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
          className="flex flex-col gap-3"
        >
          <h2 className="text-[30px] font-black text-foreground tracking-tight leading-snug">
            Let's begin your journey?
          </h2>
          <p className="text-[15px] font-medium text-foreground leading-relaxed max-w-[300px]">
            Nukood will set up your account now. This only takes a moment.
          </p>
        </motion.div>

        {/* Error state */}
        {submitError && !isSubmitting && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex items-start gap-3 p-4 rounded-[20px]
                       bg-red-50 border border-red-100 text-left"
            role="alert"
          >
            <AlertCircle
              size={18}
              className="text-error shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="flex flex-col gap-1">
              <p className="text-[14px] font-bold text-red-700">
                Something went wrong
              </p>
              <p className="text-[13px] font-medium text-error leading-relaxed">
                {submitError} Your answers are still here — please try again.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </SlideLayout>
  );
};
