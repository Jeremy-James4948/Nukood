import React from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Home, Archive as ArchiveIcon } from 'lucide-react';

interface FloatingNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function FloatingNavigation({ activeTab, setActiveTab }: FloatingNavigationProps) {
  const tabs = [
    { id: 'History', icon: RotateCcw },
    { id: 'Journal', icon: Home },
    { id: 'Archive', icon: ArchiveIcon }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      className="absolute top-8 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-1 p-1.5 bg-[#F5F2EC] shadow-[8px_8px_16px_#dfddd6,-8px_-8px_16px_#ffffff] border border-white/40 rounded-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold tracking-wide transition-colors duration-300 z-10 ${isActive ? 'text-[#6A6356]' : 'text-[#9B968B] hover:text-[#A9BDD0]'
                }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-[#F5F2EC] shadow-[inset_4px_4px_8px_#dfddd6,inset_-4px_-4px_8px_#ffffff] rounded-full -z-10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#A9BDD0]' : ''} />
              {tab.id}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
