import React, { useState, useEffect, useMemo } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { Drawer } from 'vaul';
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Edit2,
  Trash2,
  X,
  Copy,
  Receipt,
  Zap,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { TransactionService, Transaction } from '../../services/transaction.service';
import { FinancialCycleService, FinancialCycle } from '../../services/financialCycle.service';
import { CategoryService, Category } from '../../services/category.service';
import { useCurrencyFormatter } from '../../utils/currency';
import { AddTransactionDrawer } from '../transactions/AddTransactionDrawer';
import { ReceiptViewer } from '../../components/ui/ReceiptViewer';

const neuExtrude = "bg-card shadow-neu-extrude";
const neuExtrudeHover = "hover:shadow-neu-extrude hover:scale-[0.98] transition-all";
const neuIndent = "bg-card shadow-neu-extrude";

const TransactionItem = ({ tx, category, cycleName, onClick, onDelete, onEdit, delay }: { tx: Transaction, category?: Category, cycleName?: string, onClick: any, onDelete: any, onEdit: any, delay: number }) => {
  const controls = useAnimation();
  const { formatAmount } = useCurrencyFormatter();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDragEnd = async (event: any, info: any) => {
    const SWIPE_THRESHOLD = 80;

    if (info.offset.x < -SWIPE_THRESHOLD) {
      // Swiped left to delete
      controls.start({ x: -100 });
      setShowConfirm(true);
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      // Swiped right to edit
      controls.start({ x: 0 });
      onEdit();
    } else {
      // Snap back if not far enough
      controls.start({ x: 0 });
    }
  };

  const IconComponent = (category && (Icons as any)[category.icon]) || Icons.Circle;
  const color = category?.color || '#355C7D';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative rounded-[24px] overflow-hidden bg-transparent group"
    >
      {/* Background swipe actions */}
      <div className="absolute inset-0 flex items-center justify-between px-6">
        <div className="flex items-center gap-2 text-success">
          <Edit2 size={20} />
          <span className="text-[13px] font-bold uppercase tracking-wide">Edit</span>
        </div>
        <div className="flex items-center gap-2 text-error">
          <span className="text-[13px] font-bold uppercase tracking-wide">Delete</span>
          <Trash2 size={20} />
        </div>
      </div>

      {/* Foreground card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        animate={controls}
        onDragEnd={handleDragEnd}
        onClick={() => onClick({ tx, category })}
        whileTap={{ cursor: "grabbing" }}
        className={`relative p-4 rounded-[24px] flex items-center gap-4 cursor-grab z-10 ${neuExtrude} ${neuExtrudeHover}`}
      >
        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${neuIndent}`} style={{ color }}>
          <IconComponent size={18} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="text-[15px] font-bold text-foreground truncate mb-0.5 flex items-center gap-2">
            {tx.title}
            {tx.fastEntryId && <Zap size={12} className="text-warning" />}
            {tx.receiptUrl && <Receipt size={12} className="text-info" />}
          </h4>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            <span>{category?.name || 'Uncategorized'}</span>
            {cycleName && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                <span className="text-muted-foreground">{cycleName}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-lg font-bold tracking-tight ${tx.transactionType === 'INCOME' ? 'text-success' : 'text-foreground'}`}>
            {tx.transactionType === 'INCOME' ? '+' : ''}{formatAmount(tx.amount)}
          </span>
        </div>
      </motion.div>

      {/* Delete Confirmation Overlay */}
      {showConfirm && (
        <div className="absolute inset-0 z-20 bg-card/90 backdrop-blur-sm flex items-center justify-between px-6 rounded-[24px]">
          <span className="text-[13px] font-bold text-foreground uppercase tracking-wide">Delete this?</span>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setShowConfirm(false); controls.start({ x: 0 }); }}
              className={`px-4 py-2 rounded-full text-[13px] font-bold text-muted-foreground ${neuExtrude}`}
            >
              Cancel
            </button>
            <button 
              onClick={() => { setShowConfirm(false); onDelete(tx.transactionId); }}
              className={`px-4 py-2 rounded-full text-[13px] font-bold text-error ${neuIndent}`}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

interface HistoryFilters {
  type: 'ALL' | 'INCOME' | 'EXPENSE';
  categoryId: string | null;
  hasReceipt: boolean | null;
  isFastEntry: boolean | null;
}

export function HistoryView() {
  const { activeCycle, userId } = useFinancialEngine();
  const [cycles, setCycles] = useState<FinancialCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  const [filters, setFilters] = useState<HistoryFilters>({
    type: 'ALL',
    categoryId: null,
    hasReceipt: null,
    isFastEntry: null
  });
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  
  const [selectedTxInfo, setSelectedTxInfo] = useState<{tx: Transaction, category?: Category} | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [receiptViewerConfig, setReceiptViewerConfig] = useState<{ isOpen: boolean, storagePath: string, fileName: string, fileType: string } | null>(null);
  
  const { formatAmount } = useCurrencyFormatter();

  // Load Categories and Cycles
  useEffect(() => {
    if (!userId) return;
    
    CategoryService.getAllCategories().then(setCategories);
    FinancialCycleService.getAllCycles(userId).then((fetched) => {
      setCycles(fetched);
      if (activeCycle) {
        setSelectedCycleId(activeCycle.cycleId);
      } else if (fetched.length > 0) {
        setSelectedCycleId(fetched[0].cycleId);
      }
    });
  }, [userId, activeCycle]);

  // Load Transactions for Selected Cycle
  useEffect(() => {
    if (!userId || !selectedCycleId) return;
    
    TransactionService.getTransactionsForCycle(userId, selectedCycleId)
      .then(setTransactions);
  }, [userId, selectedCycleId]);

  const handleDelete = async (id: string) => {
    if (!userId || !selectedCycleId) return;
    const txToDelete = transactions.find(t => t.transactionId === id);
    if (!txToDelete) return;

    // Optimistic UI update
    setTransactions(prev => prev.filter(t => t.transactionId !== id));
    if (selectedTxInfo?.tx.transactionId === id) {
      setSelectedTxInfo(null);
    }
    
    // Backend deletion
    await TransactionService.deleteTransaction(userId, selectedCycleId, txToDelete);
  };

  // Filter & Group Transactions
  const filteredHistory = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return transactions.filter(tx => {
      // 1. Search Query
      if (q) {
        const cat = categories.find(c => c.categoryId === tx.categoryId);
        const matchesSearch = tx.title.toLowerCase().includes(q) || tx.note?.toLowerCase().includes(q) || cat?.name.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      
      // 2. Type Filter
      if (filters.type !== 'ALL' && tx.transactionType !== filters.type) return false;
      
      // 3. Category Filter
      if (filters.categoryId && tx.categoryId !== filters.categoryId) return false;
      
      // 4. Receipt Filter
      if (filters.hasReceipt !== null && !!tx.receiptUrl !== filters.hasReceipt) return false;
      
      // 5. Fast Entry Filter
      if (filters.isFastEntry !== null && !!tx.fastEntryId !== filters.isFastEntry) return false;
      
      return true;
    });
  }, [transactions, searchQuery, categories, filters]);

  const groupedHistory = useMemo(() => {
    return filteredHistory.reduce((acc, tx) => {
      const date = new Date(tx.date);
      // Format as "12 AUGUST" or "TODAY" for simplicity we'll just do local date string
      const dateStr = date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }).toUpperCase();
      
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(tx);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [filteredHistory]);

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.type !== 'ALL') count++;
    if (filters.categoryId) count++;
    if (filters.hasReceipt !== null) count++;
    if (filters.isFastEntry !== null) count++;
    return count;
  };

  const clearFilters = () => setFilters({
    type: 'ALL',
    categoryId: null,
    hasReceipt: null,
    isFastEntry: null
  });

  return (
    <div className="px-6 flex flex-col min-h-full pb-40 pt-4">
      {/* Page Header */}
      <div className="mb-8 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[32px] font-bold text-foreground tracking-tight leading-none">History</h2>
          
          {/* Cycle Selector */}
          <select 
            value={selectedCycleId || ''}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-bold text-foreground outline-none ${neuExtrude} appearance-none pr-8 relative bg-transparent`}
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236A6356%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
          >
            {cycles.map(c => (
              <option key={c.cycleId} value={c.cycleId}>{c.cycleName}</option>
            ))}
          </select>
        </div>

        {/* Controls Row: Search & Filter */}
        <div className="flex items-center justify-between mb-5 relative z-20">
          {/* Expandable Search */}
          <motion.div 
            initial={false}
            animate={{ width: isSearchExpanded ? '100%' : '48px' }}
            className={`relative h-12 flex items-center overflow-hidden rounded-[24px] ${isSearchExpanded ? neuIndent : neuExtrude}`}
          >
            <button 
              onClick={() => {
                if (isSearchExpanded && !searchQuery) setIsSearchExpanded(false);
                else if (!isSearchExpanded) setIsSearchExpanded(true);
              }}
              className="absolute left-0 w-12 h-12 flex items-center justify-center text-foreground z-10"
            >
              <Search size={18} />
            </button>
            
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onBlur={() => {
                if (!searchQuery) setIsSearchExpanded(false);
              }}
              className={`w-full h-full pl-12 pr-10 outline-none text-[15px] font-bold text-foreground placeholder:text-muted-foreground bg-transparent ${isSearchExpanded ? 'opacity-100' : 'opacity-0'}`}
              style={{ transition: 'opacity 0.2s' }}
            />
            
            <AnimatePresence>
              {isSearchExpanded && searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 p-1 rounded-full bg-border/50 text-foreground"
                >
                  <X size={14} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Filter Button */}
          <motion.button 
            animate={{ opacity: isSearchExpanded ? 0 : 1, x: isSearchExpanded ? 20 : 0 }}
            className={`ml-4 w-12 h-12 rounded-[24px] shrink-0 flex items-center justify-center text-foreground relative transition-colors ${getActiveFilterCount() > 0 ? neuIndent : neuExtrude}`}
            onClick={() => setIsFilterDrawerOpen(true)}
          >
            <SlidersHorizontal size={18} className={getActiveFilterCount() > 0 ? "text-foreground" : ""} />
            {getActiveFilterCount() > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-yellow-500 rounded-full border-2 border-[#F3F1EA]" />
            )}
          </motion.button>
        </div>

        {/* Filter Chips */}
        <AnimatePresence>
          {getActiveFilterCount() > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex overflow-x-auto hide-scrollbar gap-2.5 pb-4 -mx-6 px-6 snap-x"
            >
              <button onClick={clearFilters} className={`snap-start shrink-0 px-4 py-2 rounded-[16px] text-[12px] font-bold text-error ${neuExtrude}`}>
                Clear All
              </button>
              {filters.type !== 'ALL' && (
                <button onClick={() => setFilters(f => ({ ...f, type: 'ALL' }))} className={`snap-start shrink-0 px-4 py-2 rounded-[16px] text-[12px] font-bold text-foreground flex items-center gap-2 ${neuIndent}`}>
                  {filters.type} <X size={12} />
                </button>
              )}
              {filters.categoryId && (
                <button onClick={() => setFilters(f => ({ ...f, categoryId: null }))} className={`snap-start shrink-0 px-4 py-2 rounded-[16px] text-[12px] font-bold text-foreground flex items-center gap-2 ${neuIndent}`}>
                  {categories.find(c => c.categoryId === filters.categoryId)?.name || 'Category'} <X size={12} />
                </button>
              )}
              {filters.hasReceipt !== null && (
                <button onClick={() => setFilters(f => ({ ...f, hasReceipt: null }))} className={`snap-start shrink-0 px-4 py-2 rounded-[16px] text-[12px] font-bold text-foreground flex items-center gap-2 ${neuIndent}`}>
                  {filters.hasReceipt ? 'Has Receipt' : 'No Receipt'} <X size={12} />
                </button>
              )}
              {filters.isFastEntry !== null && (
                <button onClick={() => setFilters(f => ({ ...f, isFastEntry: null }))} className={`snap-start shrink-0 px-4 py-2 rounded-[16px] text-[12px] font-bold text-foreground flex items-center gap-2 ${neuIndent}`}>
                  {filters.isFastEntry ? 'Fast Entry' : 'Manual Entry'} <X size={12} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grouped Transaction Timeline */}
      <div className="flex flex-col gap-8">
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="text-center text-muted-foreground font-medium mt-10">No transactions found.</div>
        ) : (
          Object.entries(groupedHistory).map(([date, txs], groupIdx) => (
            <div key={date} className="flex flex-col gap-3">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest pl-2 block">
                {date}
              </span>

              <div className="flex flex-col gap-3">
                {txs.map((tx, i) => (
                  <TransactionItem
                    key={tx.transactionId}
                    tx={tx}
                    category={categories.find(c => c.categoryId === tx.categoryId)}
                    cycleName={cycles.find(c => c.cycleId === tx.cycleId)?.cycleName}
                    delay={(groupIdx * 0.1) + (i * 0.05)}
                    onClick={setSelectedTxInfo}
                    onDelete={handleDelete}
                    onEdit={() => {
                      setSelectedTxInfo({
                        tx,
                        category: categories.find(c => c.categoryId === tx.categoryId),
                        cycleName: cycles.find(c => c.cycleId === tx.cycleId)?.cycleName
                      });
                      setIsEditDrawerOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Transaction Detail Drawer */}
      <Drawer.Root open={selectedTxInfo !== null} onOpenChange={(open) => !open && setSelectedTxInfo(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[200]" />
          <Drawer.Content className={`bg-card flex flex-col rounded-t-[40px] mt-12 max-h-[90vh] fixed bottom-0 left-0 right-0 z-[201] max-w-[428px] mx-auto shadow-2xl outline-none`}>

            <div className={`pt-6 pb-2 px-8 flex flex-col items-center shrink-0 relative rounded-t-[40px]`}>
              <div className={`w-12 h-1.5 rounded-full mb-8 ${neuIndent}`} />

              <button
                onClick={() => setSelectedTxInfo(null)}
                className={`absolute top-6 right-6 p-2 rounded-full text-foreground ${neuExtrude}`}
              >
                <X size={20} />
              </button>

              {selectedTxInfo && (
                <div className="flex flex-col items-center w-full mb-6">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${neuIndent}`} style={{ color: selectedTxInfo.category?.color || '#355C7D' }}>
                    {(() => {
                      const IconComp = (selectedTxInfo.category && (Icons as any)[selectedTxInfo.category.icon]) || Icons.Circle;
                      return <IconComp size={28} strokeWidth={2.5} />
                    })()}
                  </div>
                  <span className={`text-[40px] font-bold tracking-tighter leading-none mb-2 ${selectedTxInfo.tx.transactionType === 'INCOME' ? 'text-success' : 'text-foreground'}`}>
                    {selectedTxInfo.tx.transactionType === 'INCOME' ? '+' : ''}{formatAmount(selectedTxInfo.tx.amount)}
                  </span>
                  <Drawer.Title className="text-[18px] font-bold text-foreground">{selectedTxInfo.tx.title}</Drawer.Title>
                  <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    {selectedTxInfo.category?.name || 'Uncategorized'} • {new Date(selectedTxInfo.tx.date).toLocaleDateString()}
                  </span>
                  <div className={`mt-4 px-4 py-1.5 rounded-full text-[11px] font-bold text-muted-foreground uppercase tracking-wider ${neuIndent}`}>
                    {cycles.find(c => c.cycleId === selectedTxInfo.tx.cycleId)?.cycleName || 'Unknown Cycle'}
                  </div>
                  <Drawer.Description className="sr-only">Transaction details</Drawer.Description>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar px-6 py-6 pb-32" data-vaul-no-drag>
              {selectedTxInfo && (
                <div className="flex flex-col gap-8">

                  {/* Metadata Block */}
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block pl-2">Transaction Details</span>
                    <div className={`rounded-[24px] flex flex-col p-3 gap-3 ${neuExtrude}`}>
                      <div className={`flex flex-col px-5 py-4 rounded-[16px] gap-1 ${neuIndent}`}>
                        <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Date & Time</span>
                        <span className="text-[15px] font-bold text-foreground">{new Date(selectedTxInfo.tx.date).toLocaleString()}</span>
                      </div>
                      
                      {selectedTxInfo.tx.note && (
                        <div className={`flex flex-col px-5 py-4 rounded-[16px] gap-1 ${neuIndent}`}>
                          <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Notes</span>
                          <span className="text-[15px] font-bold text-foreground">{selectedTxInfo.tx.note}</span>
                        </div>
                      )}

                      {/* Receipt Status & Action */}
                      {selectedTxInfo.tx.transactionDetails?.receipt?.attached && (
                        <div className={`flex flex-col px-5 py-4 rounded-[16px] gap-3 ${neuIndent}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Receipt</span>
                            <span className="text-[14px] font-bold text-foreground">Attached</span>
                          </div>
                          <button
                            onClick={() => setReceiptViewerConfig({
                              isOpen: true,
                              storagePath: selectedTxInfo.tx.transactionDetails.receipt.storagePath,
                              fileName: selectedTxInfo.tx.transactionDetails.receipt.fileName,
                              fileType: selectedTxInfo.tx.transactionDetails.receipt.fileType,
                            })}
                            className={`flex items-center justify-center gap-2 py-3 rounded-[12px] text-[14px] font-bold text-foreground transition-transform active:scale-[0.98] ${neuExtrude}`}
                          >
                            <ExternalLink size={16} />
                            View Receipt
                          </button>
                        </div>
                      )}
                      
                      {selectedTxInfo.tx.fastEntryId && (
                         <div className={`flex items-center justify-between px-5 py-4 rounded-[16px] ${neuIndent}`}>
                           <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Method</span>
                           <span className="text-[14px] font-bold text-yellow-600 flex items-center gap-1.5"><Zap size={14}/> Fast Entry</span>
                         </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Block */}
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block pl-2">Actions</span>
                    <div className={`rounded-[24px] flex flex-col p-3 gap-3 ${neuExtrude}`}>
                      <button 
                        onClick={() => setIsEditDrawerOpen(true)}
                        className={`flex items-center gap-3 px-5 py-4 rounded-[16px] text-left transition-transform active:scale-[0.98] ${neuIndent}`}
                      >
                        <Edit2 size={18} className="text-foreground" />
                        <span className="text-[15px] font-bold text-foreground">Edit Transaction</span>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this transaction? This will automatically update your budget and balances.")) {
                             handleDelete(selectedTxInfo.tx.transactionId);
                          }
                        }}
                        className={`flex items-center gap-3 px-5 py-4 rounded-[16px] text-left transition-transform active:scale-[0.98] ${neuIndent}`}
                      >
                        <Trash2 size={18} className="text-error" />
                        <span className="text-[15px] font-bold text-error">Delete</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Edit Drawer */}
      <AddTransactionDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        initialContext={null}
        editTransaction={selectedTxInfo?.tx || null}
        onSuccess={() => {
          if (userId && selectedCycleId) {
            TransactionService.getTransactionsForCycle(userId, selectedCycleId).then(newTxs => {
              setTransactions(newTxs);
              if (selectedTxInfo) {
                const updatedTx = newTxs.find(t => t.transactionId === selectedTxInfo.tx.transactionId);
                if (updatedTx) {
                  setSelectedTxInfo({ ...selectedTxInfo, tx: updatedTx });
                }
              }
            });
          }
        }}
      />

      {/* Filter Drawer */}
      <Drawer.Root open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[200]" />
          <Drawer.Content className={`bg-card flex flex-col rounded-t-[40px] mt-12 h-[80vh] fixed bottom-0 left-0 right-0 z-[201] max-w-[428px] mx-auto shadow-2xl outline-none`}>
            <div className="pt-6 pb-2 px-8 flex flex-col items-center shrink-0 relative rounded-t-[40px]">
              <div className={`w-12 h-1.5 rounded-full mb-6 ${neuIndent}`} />
              <Drawer.Title className="text-2xl font-bold text-foreground mb-4">Filters</Drawer.Title>
              <Drawer.Description className="sr-only">Filter transactions</Drawer.Description>
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className={`absolute top-6 right-6 p-2 rounded-full text-foreground ${neuExtrude}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar px-6 py-4 pb-32" data-vaul-no-drag>
              <div className="flex flex-col gap-8">
                
                {/* Type Filter */}
                <div>
                  <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block pl-2">Type</span>
                  <div className={`flex items-center p-1.5 rounded-[20px] ${neuExtrude}`}>
                    {['ALL', 'INCOME', 'EXPENSE'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setFilters({ ...filters, type: t as any })}
                        className={`flex-1 py-3 text-[13px] font-bold rounded-[16px] transition-all ${filters.type === t ? 'text-foreground ' + neuIndent : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories Filter */}
                <div>
                  <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block pl-2">Category</span>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setFilters({ ...filters, categoryId: null })}
                      className={`px-5 py-3 rounded-[20px] text-[13px] font-bold transition-all ${filters.categoryId === null ? 'text-foreground ' + neuIndent : 'text-muted-foreground ' + neuExtrude}`}
                    >
                      All Categories
                    </button>
                    {categories.map(cat => (
                      <button
                        key={cat.categoryId}
                        onClick={() => setFilters({ ...filters, categoryId: cat.categoryId })}
                        className={`px-5 py-3 rounded-[20px] text-[13px] font-bold transition-all ${filters.categoryId === cat.categoryId ? 'text-foreground ' + neuIndent : 'text-muted-foreground ' + neuExtrude}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Attributes Filter */}
                <div>
                  <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block pl-2">Attributes</span>
                  <div className={`flex flex-col p-3 rounded-[24px] gap-3 ${neuExtrude}`}>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[14px] font-bold text-foreground">Has Receipt</span>
                      <button 
                        onClick={() => setFilters({ ...filters, hasReceipt: filters.hasReceipt === true ? null : true })}
                        className={`w-12 h-6 rounded-full relative transition-all ${filters.hasReceipt ? neuIndent + ' bg-primary/10' : neuIndent}`}
                      >
                        <motion.div animate={{ x: filters.hasReceipt ? 24 : 4 }} className="w-4 h-4 rounded-full bg-primary absolute top-1" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-[14px] font-bold text-foreground">Fast Entry</span>
                      <button 
                        onClick={() => setFilters({ ...filters, isFastEntry: filters.isFastEntry === true ? null : true })}
                        className={`w-12 h-6 rounded-full relative transition-all ${filters.isFastEntry ? neuIndent + ' bg-yellow-500/10' : neuIndent}`}
                      >
                        <motion.div animate={{ x: filters.isFastEntry ? 24 : 4 }} className="w-4 h-4 rounded-full bg-yellow-500 absolute top-1" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Receipt Viewer */}
      {receiptViewerConfig && (
        <ReceiptViewer
          isOpen={receiptViewerConfig.isOpen}
          storagePath={receiptViewerConfig.storagePath}
          fileName={receiptViewerConfig.fileName}
          fileType={receiptViewerConfig.fileType}
          onClose={() => setReceiptViewerConfig({ ...receiptViewerConfig, isOpen: false })}
        />
      )}
    </div>
  );
}
