import React from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Home, Archive as ArchiveIcon } from 'lucide-react';
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
    { id: 'Archive', icon: ArchiveIcon }
  ];

  return (
    <motion.div
      {...variants.slideUp}
      className="absolute top-8 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-1 p-1.5 bg-background shadow-neu-extrude border border-white/40 rounded-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={variants.hoverScale}
              whileTap={variants.tapScale}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold tracking-wide transition-colors duration-300 z-10 ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-accent'
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-background shadow-neu-inset rounded-full -z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-accent' : ''} />
              {tab.id}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
