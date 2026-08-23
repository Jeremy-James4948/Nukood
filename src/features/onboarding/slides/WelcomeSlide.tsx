import React from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface WelcomeSlideProps {
  onBegin: () => void;
}

export const WelcomeSlide: React.FC<WelcomeSlideProps> = ({ onBegin }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 gap-10 text-center py-8">

      {/* Brand mark */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4"
      >
        <div
          className="w-20 h-20 rounded-[28px] bg-background
                     shadow-neu-card
                     flex items-center justify-center"
        >
          <Sparkles size={36} className="text-foreground" />
        </div>

        <h1 className="text-4xl font-black tracking-tight text-foreground leading-tight">
          Nukood
        </h1>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        className="flex flex-col items-center gap-3"
      >
        <p className="text-[28px] font-black text-foreground leading-snug tracking-tight">
          Let's make Nukood yours.
        </p>
        <p className="text-[16px] font-medium text-foreground leading-relaxed max-w-[300px]">
          A few quick choices and we'll set everything up around you.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
        className="w-full"
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onBegin}
          aria-label="Let's begin"
          className="w-full h-[64px] rounded-[24px] bg-primary text-white text-[18px] font-bold
                     flex items-center justify-center
                     shadow-[0_8px_20px_rgba(53,92,125,0.35)]"
        >
          Let's begin
        </motion.button>

        <p className="mt-4 text-[13px] text-[#A49F96] text-center font-medium">
          Takes less than a minute
        </p>
      </motion.div>
    </div>
  );
};
