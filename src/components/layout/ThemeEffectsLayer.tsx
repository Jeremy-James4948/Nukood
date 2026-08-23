import React from 'react';
import { useTheme } from 'next-themes';
import { useReducedMotion, motion, AnimatePresence } from 'motion/react';

export function ThemeEffectsLayer() {
  const { theme } = useTheme();
  const prefersReducedMotion = useReducedMotion();

  // If accessibility requires reduced motion, render nothing extra
  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <AnimatePresence mode="wait">
        {theme === 'awesome' && (
          <motion.div
            key="awesome-effects"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            {/* 
              Phase 3 Placeholder: 
              We are establishing the architecture here. 
              The complex particles and floating shapes for Awesome Mode will be added in a future phase. 
              For now, we demonstrate the global theme effect layer with a slow moving, glowing gradient.
            */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-background to-accent/10"
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{ backgroundSize: '200% 200%' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
