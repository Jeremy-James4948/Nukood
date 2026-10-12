import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, User, Users } from 'lucide-react';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { Group, GroupService } from '../../services/group.service';

export function ScopeSelector() {
  const { activeScope, setActiveScope, userId } = useFinancialEngine();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      GroupService.getUserGroups(userId).then(setGroups).catch(console.error);
    }
  }, [userId]);

  const activeName = activeScope.type === 'PERSONAL' 
    ? 'Personal' 
    : groups.find(g => g.groupId === activeScope.id)?.name || 'Group';

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-2xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.4)] border border-white/20 rounded-full text-sm font-bold tracking-wide transition-all"
      >
        {activeScope.type === 'PERSONAL' ? (
          <User size={16} className="text-accent" />
        ) : (
          <Users size={16} className="text-accent" />
        )}
        <span>{activeName}</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 w-48 bg-card/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-xl overflow-hidden z-50"
          >
            <div className="p-2 flex flex-col gap-1">
              <button
                onClick={() => {
                  setActiveScope({ type: 'PERSONAL', id: userId });
                  setIsOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeScope.type === 'PERSONAL' ? 'bg-accent/20 text-accent' : 'hover:bg-white/5'
                }`}
              >
                <User size={16} />
                Personal
              </button>
              
              {groups.length > 0 && (
                <>
                  <div className="h-px bg-white/10 my-1 mx-2" />
                  <div className="px-3 py-1 text-xs text-muted-foreground font-bold tracking-wider uppercase">
                    My Groups
                  </div>
                  {groups.map(group => (
                    <button
                      key={group.groupId}
                      onClick={() => {
                        setActiveScope({ type: 'GROUP', id: group.groupId });
                        setIsOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        activeScope.type === 'GROUP' && activeScope.id === group.groupId ? 'bg-accent/20 text-accent' : 'hover:bg-white/5'
                      }`}
                    >
                      <Users size={16} />
                      <span className="truncate">{group.name}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
