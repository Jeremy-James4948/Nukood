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
            className="absolute inset-0 bg-[#355C7D]/20 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-[90%] max-w-[340px] bg-[#F3F1EA] rounded-[32px] p-6 shadow-[12px_12px_24px_#e3e0d8,-12px_-12px_24px_#ffffff] border border-white/40 flex flex-col gap-6"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <h3 className="text-xl font-bold text-[#355C7D]">{title}</h3>
                {description && <span className="text-xs font-medium text-[#6C5B7B] mt-1">{description}</span>}
              </div>
              <button onPointerDown={handleClose} onClick={handleClose} className="p-2 bg-gray-100 rounded-full text-[#6C5B7B] hover:bg-gray-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {type === 'toggle' ? (
                <div 
                  className={`w-14 h-8 rounded-full relative cursor-pointer transition-colors self-center ${value ? 'bg-[#355C7D]' : 'bg-gray-200 shadow-inner'}`}
                  onClick={() => setValue(!value)}
                >
                  <motion.div 
                    className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm" 
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
                          ? 'bg-[#355C7D] border-[#355C7D] text-white'
                          : 'bg-white border-gray-100 text-[#355C7D] hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-bold">{opt.label}</span>
                      {opt.description && (
                        <span className={`text-xs mt-0.5 ${value === opt.value ? 'text-white/80' : 'text-[#6C5B7B]'}`}>
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
                  className="w-full bg-[#F3F1EA] shadow-[inset_4px_4px_8px_#e3e0d8,inset_-4px_-4px_8px_#ffffff] rounded-[20px] px-6 py-4 text-[#355C7D] font-semibold text-lg outline-none"
                  autoFocus
                />
              )}
            </div>

            <button
              onClick={handleSave}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full py-4 bg-[#355C7D] text-white rounded-[20px] text-[15px] font-bold shadow-[0_8px_24px_rgba(53,92,125,0.25)] hover:bg-[#2a4a65] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} /> Save Changes
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
