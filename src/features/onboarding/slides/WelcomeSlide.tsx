import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

interface WelcomeSlideProps {
  onBegin: () => void;
}

export const WelcomeSlide: React.FC<WelcomeSlideProps> = ({ onBegin }) => {
  const { logout } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 gap-10 text-center py-8">

      {/* Brand mark */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-6"
        style={{ isolation: 'isolate' }}
      >
        <img 
          src="/nukood-logo.png" 
          alt="Nukood Logo" 
          className="w-40 object-contain"
        />

        <h1 className="text-4xl font-semibold tracking-wide text-primary leading-tight" style={{ fontFamily: '"Playfair Display", serif' }}>
          Welcome to Nukood
        </h1>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="flex flex-col items-center gap-4"
      >
        <p className="text-[22px] font-medium text-foreground leading-snug tracking-tight">
          Let's make it yours.
        </p>
        <p className="text-[15px] font-medium text-muted-foreground leading-relaxed max-w-[300px]">
          A few quick choices and we'll set everything up around you.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
        className="w-full mt-4 flex flex-col items-center"
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onBegin}
          aria-label="Let's begin"
          className="group relative w-full h-[60px] rounded-2xl bg-primary text-white text-[15px] tracking-widest font-bold
                     flex items-center justify-center overflow-hidden
                     shadow-lg transition-transform hover:-translate-y-0.5"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative z-10">LET'S BEGIN</span>
        </motion.button>

        <button 
          onClick={logout}
          className="mt-6 text-[13px] text-muted-foreground font-medium hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          Actually, I want to sign out
        </button>
      </motion.div>
    </div>
  );
};
