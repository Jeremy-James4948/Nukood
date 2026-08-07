import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Drawer } from 'vaul';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Zap
} from 'lucide-react';
import { FAST_ENTRIES } from '../../constants';
import { IconMap } from '../../constants/icons';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { Category } from '../../services/category.service';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { FastEntryService, FastEntry } from '../../services/fastEntry.service';
import { useCurrencyFormatter } from '../../utils/currency';

interface AddTransactionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialContext: { name?: string, category: string, icon?: string, price?: string, quantity?: string, unit?: string, notes?: string } | null;
  editTransaction?: Transaction | null;
  onSuccess?: () => void;
}

export function AddTransactionDrawer({
  isOpen,
  onClose,
  initialContext,
  editTransaction,
  onSuccess
}: AddTransactionDrawerProps) {
  const [step, setStep] = useState<'SELECT_CATEGORY' | 'FORM'>('SELECT_CATEGORY');
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveAsFastEntry, setSaveAsFastEntry] = useState(false);
  
  const { categories, templates, fastEntries, activeCycle, userId, refreshCycle, refreshTransactions, refreshFastEntries } = useFinancialEngine();
  const { currencySymbol } = useCurrencyFormatter();

  useEffect(() => {
    if (isOpen) {
      if (editTransaction) {
        const foundCat = categories.find(c => c.categoryId === editTransaction.categoryId);
        setActiveCategory(foundCat || null);
        setStep('FORM');
        setAmount(editTransaction.amount.toString());
        setNote(editTransaction.note || '');
        setDate(editTransaction.date ? new Date(editTransaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setFormData(editTransaction.categoryData || {});
        setSaveAsFastEntry(false);
      } else if (initialContext?.category) {
        const foundCat = categories.find(c => c.name === initialContext.category);
        setActiveCategory(foundCat || null);
        setStep('FORM');
        setAmount(initialContext.price || '');

        // Pre-fill the fast entry specific values into the category's form schema
        const mappedData: Record<string, string> = {};
        if (initialContext.name) mappedData['Item Name'] = initialContext.name;
        if (initialContext.name) mappedData['Transport Mode'] = initialContext.name;
        if (initialContext.name) mappedData['Activity'] = initialContext.name;
        if (initialContext.name) mappedData['Medicine'] = initialContext.name;
        if (initialContext.name) mappedData['Source'] = initialContext.name;
        if (initialContext.quantity) mappedData['Quantity'] = initialContext.quantity;
        if (initialContext.unit) mappedData['Unit'] = initialContext.unit;
        if (initialContext.notes) mappedData['Notes'] = initialContext.notes;

        setFormData(mappedData);
      } else {
        setStep('SELECT_CATEGORY');
        setActiveCategory(null);
        setAmount('');
        setNote('');
        setDate(new Date().toISOString().split('T')[0]);
        setFormData({});
        setSaveAsFastEntry(false);
      }
    }
  }, [isOpen, initialContext, editTransaction, categories]);

  const handleSelectCategory = (cat: Category) => {
    setActiveCategory(cat);
    setAmount('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setFormData({});
    setStep('FORM');
  };

  const handleSelectFastEntry = async (entry: FastEntry) => {
    if (!activeCycle) return;
    try {
      setIsSaving(true);
      // 1. Fetch the original historical transaction without duplicating data
      const sourceTx = await FastEntryService.getFastEntrySource(userId, entry.transactionId);
      if (!sourceTx) {
        setIsSaving(false);
        return;
      }

      // 2. Automatically create the new transaction using the historical data
      await TransactionService.createTransaction(
        userId,
        activeCycle.cycleId,
        {
          categoryId: sourceTx.categoryId,
          transactionType: sourceTx.transactionType,
          title: sourceTx.title,
          amount: sourceTx.amount,
          date: new Date(), // New date for today
          categoryData: sourceTx.categoryData
        },
        false // Do not save as fast entry again
      );

      // 3. Record that this shortcut was used
      await FastEntryService.recordUsage(userId, entry.fastEntryId);

      // 4. Refresh context and close
      await refreshCycle();
      await refreshTransactions();
      
      handleClose();
    } catch (err) {
      console.error("Failed to load fast entry:", err);
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep('SELECT_CATEGORY');
      setActiveCategory(null);
      setFormData({});
      setAmount('');
      setSaveAsFastEntry(false);
    }, 300);
  };

  const handleSave = async () => {
    if (!activeCategory || !activeCycle || !amount || isNaN(Number(amount))) return;
    
    try {
      setIsSaving(true);
      
      let finalAmount = Number(amount);
      
      // Auto-calculate for Groceries if quantity and pricePerUnit exist
      if (activeCategory.templateId === 'groceries_template') {
        const qty = Number(formData['quantity']);
        const price = Number(formData['pricePerUnit']);
        if (!isNaN(qty) && !isNaN(price) && qty > 0 && price > 0) {
           finalAmount = qty * price;
        }
      }

      let title = activeCategory.name;
      const template = templates.find(t => t.templateId === activeCategory.templateId);
      if (template) {
        const titleField = template.fields.find(f => f.setsTitle);
        if (titleField && formData[titleField.name]) {
          title = formData[titleField.name];
        } else if (Object.values(formData)[0]) {
          title = Object.values(formData)[0];
        }
      }

      const isIncome = activeCategory.templateId === 'balance_added_template';

      // Parse the date input correctly (using local timezone)
      const [year, month, day] = date.split('-').map(Number);
      const txDate = new Date();
      txDate.setFullYear(year, month - 1, day);
      
      if (editTransaction) {
        await TransactionService.updateTransaction(
          userId,
          editTransaction.cycleId || activeCycle.cycleId,
          editTransaction,
          {
            categoryId: activeCategory.categoryId,
            title,
            amount: finalAmount,
            date: txDate,
            note: note.trim() || undefined,
            categoryData: formData
          }
        );
      } else {
        await TransactionService.createTransaction(
          userId,
          activeCycle.cycleId,
          {
            categoryId: activeCategory.categoryId,
            transactionType: isIncome ? 'INCOME' : 'EXPENSE',
            title,
            amount: finalAmount,
            date: txDate,
            note: note.trim() || undefined,
            categoryData: formData
          },
          saveAsFastEntry
        );
      }
      
      // Refresh the context so the dashboard updates
      await refreshCycle();
      await refreshTransactions();
      if (saveAsFastEntry) {
        await refreshFastEntries();
      }
      
      if (onSuccess) onSuccess();
      handleClose();
    } catch (err) {
      console.error("Failed to save transaction:", err);
      // In a real app we'd show a toast here
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-[#355C7D]/20 backdrop-blur-md z-[200]" />
        <Drawer.Content className="bg-[#F9FAFB] flex flex-col rounded-t-[40px] mt-12 h-[95vh] fixed bottom-0 left-0 right-0 z-[201] max-w-[428px] mx-auto shadow-2xl outline-none">

          <div className="pt-6 pb-2 px-8 flex flex-col items-center shrink-0 relative bg-white rounded-t-[40px]">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-6" />

            {step === 'FORM' && !editTransaction && (
              <button
                onClick={() => setStep('SELECT_CATEGORY')}
                className="absolute top-6 left-6 p-2 bg-gray-50 rounded-full text-[#6C5B7B] hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <button
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full text-[#6C5B7B] hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>

            <Drawer.Title className="text-2xl font-bold text-[#355C7D] mb-4">
              {step === 'SELECT_CATEGORY' ? 'New Transaction' : (editTransaction ? `Edit ${activeCategory?.name}` : activeCategory?.name)}
            </Drawer.Title>
            <Drawer.Description className="sr-only">Add or edit a transaction</Drawer.Description>
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#F9FAFB]" data-vaul-no-drag>
            <AnimatePresence mode="wait">

              {/* STEP 1: CATEGORY SELECTION */}
              {step === 'SELECT_CATEGORY' && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 flex flex-col gap-8"
                >
                  {/* Fast Entries */}
                  {fastEntries.length > 0 && (
                    <div className="mb-8">
                      <span className="text-[11px] font-bold text-[#6C5B7B]/50 uppercase tracking-widest mb-4 block pl-2">Fast Entries</span>
                      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 px-1">
                        {fastEntries.map(entry => (
                          <button
                            key={entry.fastEntryId}
                            onClick={() => handleSelectFastEntry(entry)}
                            className="shrink-0 flex items-center gap-2.5 px-5 py-3.5 bg-white border border-[#355C7D]/10 rounded-[24px] shadow-sm hover:border-[#355C7D]/30 hover:scale-[0.98] transition-all"
                          >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#355C7D] to-[#2A4A65] flex items-center justify-center shadow-sm">
                              <Zap size={14} className="text-white fill-white/20" />
                            </div>
                            <span className="text-[15px] font-bold text-[#355C7D] whitespace-nowrap">{entry.displayName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Browse Categories */}
                  <div>
                    <span className="text-[11px] font-bold text-[#6C5B7B]/50 uppercase tracking-widest mb-4 block pl-2">Browse Categories</span>
                    <div className="bg-white rounded-[32px] p-2 shadow-sm border border-[#355C7D]/5">
                      {categories.map((cat, idx) => {
                        const Icon = IconMap[cat.icon as keyof typeof IconMap] || IconMap.Circle;
                        const isLast = idx === categories.length - 1;
                        
                        return (
                          <button
                            key={cat.categoryId}
                            onClick={() => handleSelectCategory(cat)}
                            className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${!isLast ? 'border-b border-gray-50' : ''} ${idx === 0 ? 'rounded-t-[24px]' : ''} ${isLast ? 'rounded-b-[24px]' : ''}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                                <Icon size={20} strokeWidth={2.5} />
                              </div>
                              <div className="flex flex-col items-start">
                                <span className="text-[16px] font-bold text-[#355C7D]">{cat.name}</span>
                                <span className="text-[12px] font-medium text-[#6C5B7B]/70">{cat.description}</span>
                              </div>
                            </div>
                            <ChevronRight size={20} className="text-[#6C5B7B]/30" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: DYNAMIC FORM */}
              {step === 'FORM' && activeCategory && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 flex flex-col gap-6 pb-32"
                >
                  {/* Amount Input */}
                  <div className="bg-white rounded-[32px] p-6 flex flex-col items-center justify-center shadow-sm border border-[#355C7D]/5">
                    <span className="text-[13px] font-bold text-[#6C5B7B]/60 uppercase tracking-widest mb-2">Amount</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[32px] font-bold text-[#355C7D]/40">{currencySymbol}</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        autoFocus
                        className="text-[48px] font-bold text-[#355C7D] bg-transparent outline-none w-[180px] text-center placeholder:text-[#355C7D]/20"
                      />
                    </div>
                  </div>

                  {/* Dynamic Fields based on Template */}
                  <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#355C7D]/5 flex flex-col gap-5">
                    {templates.find(t => t.templateId === activeCategory.templateId)?.fields.map(field => (
                      <div key={field.name} className="flex flex-col gap-2">
                        <label className="text-[13px] font-bold text-[#6C5B7B]/80 pl-1">{field.label}</label>
                        {field.type === 'dropdown' && field.options ? (
                          <div className="relative">
                            <select
                              value={formData[field.name] || ''}
                              onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                              className="w-full bg-gray-50 border border-gray-100 rounded-[16px] px-4 py-3.5 text-[15px] font-semibold text-[#355C7D] outline-none appearance-none focus:border-[#355C7D]/20 transition-colors"
                            >
                              <option value="">Select...</option>
                              {field.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6C5B7B]/50 pointer-events-none" />
                          </div>
                        ) : field.type === 'number' ? (
                           <input
                            type="number"
                            placeholder={field.placeholder}
                            value={formData[field.name] || ''}
                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-100 rounded-[16px] px-4 py-3.5 text-[15px] font-semibold text-[#355C7D] outline-none placeholder:text-[#6C5B7B]/40 focus:border-[#355C7D]/20 transition-colors"
                          />
                        ) : (
                          <input
                            type="text"
                            placeholder={field.placeholder}
                            value={formData[field.name] || ''}
                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-100 rounded-[16px] px-4 py-3.5 text-[15px] font-semibold text-[#355C7D] outline-none placeholder:text-[#6C5B7B]/40 focus:border-[#355C7D]/20 transition-colors"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Standard Form Fields */}
                  <div className="bg-white rounded-[32px] p-6 shadow-sm border border-[#355C7D]/5 flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-bold text-[#6C5B7B]/80 pl-1">Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-[16px] px-4 py-3.5 text-[15px] font-semibold text-[#355C7D] outline-none focus:border-[#355C7D]/20 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-bold text-[#6C5B7B]/80 pl-1">Note (Optional)</label>
                      <input
                        type="text"
                        placeholder="Add a memo..."
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-[16px] px-4 py-3.5 text-[15px] font-semibold text-[#355C7D] outline-none placeholder:text-[#6C5B7B]/40 focus:border-[#355C7D]/20 transition-colors"
                      />
                    </div>
                  </div>
                  
                  {/* Save as Fast Entry Toggle (Only when creating) */}
                  {!editTransaction && (
                    <div className="bg-white rounded-[24px] p-5 shadow-sm border border-[#355C7D]/5 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-[15px] font-bold text-[#355C7D]">Save as Fast Entry</span>
                        <span className="text-[12px] font-medium text-[#6C5B7B]/70">Quickly add this exact transaction later</span>
                      </div>
                      <button
                        onClick={() => setSaveAsFastEntry(!saveAsFastEntry)}
                        className={`w-14 h-8 rounded-full transition-colors relative flex items-center px-1 ${saveAsFastEntry ? 'bg-gradient-to-r from-[#355C7D] to-[#2A4A65]' : 'bg-gray-200'}`}
                      >
                        <motion.div
                          animate={{ x: saveAsFastEntry ? 24 : 0 }}
                          className="w-6 h-6 rounded-full bg-white shadow-sm"
                        />
                      </button>
                    </div>
                  )}

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !amount}
                    className="w-full mt-4 bg-gradient-to-r from-[#355C7D] to-[#2A4A65] text-white rounded-[20px] py-4 text-[16px] font-bold shadow-[0_8px_20px_-6px_rgba(53,92,125,0.4)] disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isSaving ? 'Saving...' : (editTransaction ? 'Save Changes' : 'Confirm & Save')}
                  </button>

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// Simple fallback chevron for select fields
const ChevronDown = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);
