import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Settings } from 'lucide-react';
import { ProfileDrawer } from './ProfileDrawer';
export function FloatingUtilities() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        className="absolute top-8 right-6 z-40 flex flex-col gap-4"
      >
        <button
          onClick={() => setIsProfileOpen(true)}
          className="w-[52px] h-[52px] flex items-center justify-center bg-[#F5F2EC] shadow-[6px_6px_12px_#dfddd6,-6px_-6px_12px_#ffffff] border border-white/40 rounded-full text-[#9B968B] transition-all hover:shadow-[4px_4px_8px_#dfddd6,-4px_-4px_8px_#ffffff] hover:scale-[0.98] active:shadow-[inset_4px_4px_8px_#dfddd6,inset_-4px_-4px_8px_#ffffff]"
        >
          <User size={22} strokeWidth={2.5} />
        </button>
      </motion.div>

      <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
