import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Home, Archive as ArchiveIcon, Users } from 'lucide-react';
import { useThemeMotion } from '../../hooks/useThemeMotion';

interface FloatingNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function FloatingNavigation({ activeTab, setActiveTab }: FloatingNavigationProps) {
  const { variants } = useThemeMotion();
  const tabs = [
    { id: 'History', icon: RotateCcw },
    { id: 'Journal', icon: Home },
    { id: 'Splits', icon: Users },
    { id: 'Archive', icon: ArchiveIcon }
  ];

  return (
    <motion.div
      {...variants.slideUp}
      className="absolute top-8 left-1/2 -translate-x-1/2 z-50 flex justify-center"
    >
      <div className="flex items-center p-1.5 h-[56px] bg-card/80 backdrop-blur-2xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.4)] border border-white/20 rounded-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={variants.hoverScale}
              whileTap={variants.tapScale}
              className={`relative flex items-center justify-center gap-1.5 h-full rounded-full text-[13px] font-bold tracking-wide transition-all duration-300 z-10 ${
                isActive ? 'px-4 text-foreground shadow-sm' : 'px-3 text-muted-foreground hover:text-accent'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-background shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-white/10 rounded-full -z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-accent shrink-0' : 'shrink-0'} />
              <AnimatePresence mode="popLayout">
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, width: 0, scale: 0.8 }}
                    animate={{ opacity: 1, width: 'auto', scale: 1 }}
                    exit={{ opacity: 0, width: 0, scale: 0.8 }}
                    transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {tab.id}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
