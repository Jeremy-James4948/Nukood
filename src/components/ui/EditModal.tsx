import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (val: any) => void;
  title: string;
  type: 'text' | 'number' | 'toggle' | 'date' | 'select';
  initialValue: any;
  description?: string;
  options?: { label: string; value: any; description?: string }[];
}

export function EditModal({ isOpen, onClose, onSave, title, type, initialValue, description, options }: EditModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  const handleSave = (e?: React.MouseEvent | React.PointerEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    onSave(value);
    onClose();
  };

  const handleClose = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={handleClose}
            className="absolute inset-0 bg-primary/20 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-[90%] max-w-[340px] bg-card rounded-[32px] p-6 shadow-neu-extrude border border-white/40 flex flex-col gap-6"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <h3 className="text-xl font-bold text-foreground">{title}</h3>
                {description && <span className="text-xs font-medium text-muted-foreground mt-1">{description}</span>}
              </div>
              <button onPointerDown={handleClose} onClick={handleClose} className="p-2 bg-muted rounded-full text-muted-foreground hover:bg-border transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {type === 'toggle' ? (
                <div 
                  className={`w-14 h-8 rounded-full relative cursor-pointer transition-colors self-center ${value ? 'bg-primary' : 'bg-border shadow-inner'}`}
                  onClick={() => setValue(!value)}
                >
                  <motion.div 
                    className="absolute top-1 w-6 h-6 bg-card rounded-full shadow-sm" 
                    animate={{ left: value ? '30px' : '4px' }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              ) : type === 'select' && options ? (
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto hide-scrollbar">
                  {options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        setValue(opt.value);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={`flex flex-col text-left px-5 py-3 rounded-[20px] transition-colors border ${
                        value === opt.value
                          ? 'bg-primary border-primary text-white'
                          : 'bg-card border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="font-bold">{opt.label}</span>
                      {opt.description && (
                        <span className={`text-xs mt-0.5 ${value === opt.value ? 'text-white/80' : 'text-muted-foreground'}`}>
                          {opt.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type={type}
                  value={value}
                  onChange={(e) => setValue(type === 'number' ? Number(e.target.value) : e.target.value)}
                  className="w-full bg-card shadow-neu-extrude rounded-[20px] px-6 py-4 text-foreground font-semibold text-lg outline-none"
                  autoFocus
                />
              )}
            </div>

            <button
              onClick={handleSave}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full py-4 bg-primary text-white rounded-[20px] text-[15px] font-bold shadow-neu-card hover:bg-[#2a4a65] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} /> Save Changes
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
