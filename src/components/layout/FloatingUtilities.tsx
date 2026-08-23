import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Settings } from 'lucide-react';
import { ProfileDrawer } from './ProfileDrawer';
import { useThemeMotion } from '../../hooks/useThemeMotion';
export function FloatingUtilities() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { variants } = useThemeMotion();
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        className="absolute top-8 right-6 z-40 flex flex-col gap-4"
      >
        <motion.button
          onClick={() => setIsProfileOpen(true)}
          whileHover={variants.hoverScale}
          whileTap={variants.tapScale}
          className="w-[52px] h-[52px] flex items-center justify-center bg-background shadow-neu-extrude border border-white/40 rounded-full text-muted-foreground transition-all active:shadow-neu-inset"
        >
          <User size={22} strokeWidth={2.5} />
        </motion.button>
      </motion.div>

      <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
