import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Drawer } from 'vaul';
import { X, Users, Receipt, ExternalLink } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { SplitExpenseService, SplitExpense } from '../../services/splitExpense.service';
import { CategoryService, Category } from '../../services/category.service';
import { useCurrencyFormatter } from '../../utils/currency';

const neuExtrude = "bg-card shadow-neu-extrude";
const neuExtrudeHover = "hover:shadow-neu-extrude hover:scale-[0.98] transition-all";
const neuIndent = "bg-card shadow-[inset_4px_4px_10px_rgba(0,0,0,0.05),inset_-4px_-4px_10px_rgba(255,255,255,0.8)]";

export function SplitExpensesView() {
  const { userId } = useFinancialEngine();
  const [splits, setSplits] = useState<SplitExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSplit, setSelectedSplit] = useState<SplitExpense | null>(null);
  const [receiptViewerConfig, setReceiptViewerConfig] = useState<{ isOpen: boolean, storagePath: string, fileName: string, fileType: string } | null>(null);
  
  const { formatAmount } = useCurrencyFormatter();

  useEffect(() => {
    CategoryService.getAllCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    SplitExpenseService.getUserSplitExpenses(userId)
      .then(setSplits)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  // Derived State
  const totalOwedToMe = splits.reduce((acc, split) => {
    if (split.creatorId === userId) {
      const outstanding = split.participants
        .filter(p => p.paymentStatus !== 'PAID' && p.userId !== userId)
        .reduce((sum, p) => sum + p.shareAmount, 0);
      return acc + outstanding;
    }
    return acc;
  }, 0);

  const totalIOwe = splits.reduce((acc, split) => {
    if (split.creatorId !== userId) {
      const myParticipant = split.participants.find(p => p.userId === userId);
      if (myParticipant && myParticipant.paymentStatus !== 'PAID') {
        return acc + myParticipant.shareAmount;
      }
    }
    return acc;
  }, 0);

  // Group by Month & Year
  const groupedSplits = splits.reduce((acc, split) => {
    const date = new Date(split.date);
    const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(split);
    return acc;
  }, {} as Record<string, SplitExpense[]>);
  
  // Sort keys descending
  const sortedKeys = Object.keys(groupedSplits).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="px-6 flex flex-col min-h-full pb-40 pt-4">
      {/* Page Header */}
      <div className="mb-6 flex flex-col pt-2">
        <h2 className="text-[32px] font-bold text-foreground tracking-tight leading-none">Split Bills!</h2>
      </div>

      {/* Summary Cards */}
      <div className="flex gap-4 mb-8">
        <div className={`flex-1 flex flex-col p-5 rounded-[24px] ${neuExtrude}`}>
          <div className="flex items-center gap-2 mb-2 text-success">
            <Icons.ArrowDownLeft size={16} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Owed to you</span>
          </div>
          <span className="text-[24px] font-bold text-foreground tracking-tight">{formatAmount(totalOwedToMe)}</span>
        </div>
        <div className={`flex-1 flex flex-col p-5 rounded-[24px] ${neuExtrude}`}>
          <div className="flex items-center gap-2 mb-2 text-error">
            <Icons.ArrowUpRight size={16} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">You owe</span>
          </div>
          <span className="text-[24px] font-bold text-foreground tracking-tight">{formatAmount(totalIOwe)}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-muted-foreground/30 border-t-foreground animate-spin" />
        </div>
      ) : splits.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center mt-12 px-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 text-muted-foreground/40 ${neuIndent}`}>
            <Users size={40} strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            No split expenses
          </h3>
          <p className="text-[14px] font-medium text-muted-foreground max-w-[260px]">
            When you split a transaction with others, it will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {sortedKeys.map(monthYear => (
            <div key={monthYear} className="flex flex-col">
              <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest pl-2 mb-4 block">
                {monthYear}
              </span>
              
              <div className="flex flex-col gap-4">
                {groupedSplits[monthYear].map(split => {
                  const category = categories.find(c => c.categoryId === split.categoryId);
                  const IconComponent = (category && (Icons as any)[category.icon]) || Icons.Circle;
                  const color = category?.color || '#355C7D';
                  
                  const isCreator = split.creatorId === userId;
                  const paidCount = split.participants.filter(p => p.paymentStatus === 'PAID' || p.userId === split.creatorId).length;
                  const totalParticipants = split.participants.length;
                  const isFullySettled = paidCount === totalParticipants;

                  return (
                    <div
                      key={split.splitExpenseId}
                      onClick={() => setSelectedSplit(split)}
                      className={`p-4 rounded-[24px] cursor-pointer flex items-center justify-between gap-4 ${neuExtrude} ${neuExtrudeHover}`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${neuIndent}`} style={{ color }}>
                          <IconComponent size={20} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <h4 className="text-[15px] font-bold text-foreground truncate mb-1">
                            {split.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                            <span>{category?.name || 'Uncategorized'}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <span className={isFullySettled ? "text-success" : (isCreator ? "text-warning" : "text-foreground")}>
                              {isFullySettled ? "Settled" : `${paidCount}/${totalParticipants} Paid`}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[15px] font-bold tracking-tight text-foreground">
                          {formatAmount(split.totalAmount)}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                          Total
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Split Detail Drawer */}
      <Drawer.Root open={selectedSplit !== null} onOpenChange={(open) => !open && setSelectedSplit(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-[200]" />
          <Drawer.Content className={`bg-card flex flex-col rounded-t-[40px] mt-12 h-[92vh] fixed bottom-0 left-0 right-0 z-[201] max-w-[428px] mx-auto shadow-2xl outline-none`}>
            {selectedSplit && (() => {
              const category = categories.find(c => c.categoryId === selectedSplit.categoryId);
              const userShare = selectedSplit.participants.find(p => p.userId === userId)?.shareAmount || 0;
              const IconComp = (category && (Icons as any)[category.icon]) || Icons.Circle;

              return (
                <>
                  <div className={`pt-6 pb-2 px-8 flex flex-col items-center shrink-0 relative rounded-t-[40px]`}>
                    <div className="w-12 h-1.5 bg-border rounded-full mb-6" />

                    <button
                      onClick={() => setSelectedSplit(null)}
                      className={`absolute top-6 right-6 p-2 bg-muted rounded-full text-muted-foreground hover:bg-muted transition-colors`}
                    >
                      <X size={20} />
                    </button>

                    <div className="flex flex-col items-center w-full mb-6 text-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${neuIndent}`} style={{ color: category?.color || '#355C7D' }}>
                        <IconComp size={32} strokeWidth={2.5} />
                      </div>
                      <Drawer.Title className="text-[24px] font-bold text-foreground mb-1">
                        {selectedSplit.title}
                      </Drawer.Title>
                      <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        {category?.name || 'Uncategorized'} • {new Date(selectedSplit.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <Drawer.Description className="sr-only">Split details</Drawer.Description>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto hide-scrollbar px-6 py-6 pb-32" data-vaul-no-drag>
                    <div className="flex flex-col gap-8">
                      
                      {/* Amounts */}
                      <div className="flex gap-4">
                        <div className={`flex-1 flex flex-col px-5 py-5 rounded-[24px] gap-1 ${neuIndent}`}>
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Bill</span>
                          <span className="text-[24px] font-bold text-foreground tracking-tight">{formatAmount(selectedSplit.totalAmount)}</span>
                        </div>
                        <div className={`flex-1 flex flex-col px-5 py-5 rounded-[24px] gap-1 ${neuIndent}`}>
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Your Share</span>
                          <span className="text-[24px] font-bold text-error tracking-tight">{formatAmount(userShare)}</span>
                        </div>
                      </div>

                      {/* Participants */}
                      <div>
                        <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block pl-2">
                          Payment Status
                        </span>
                        <div className={`rounded-[32px] flex flex-col p-2 gap-2 border border-primary/5 ${neuExtrude}`}>
                          {(() => {
                            const isCreator = selectedSplit.creatorId === userId;
                            const creatorParticipant = selectedSplit.participants.find(p => p.userId === selectedSplit.creatorId);
                            const creatorName = creatorParticipant?.username || 'Creator';
                            
                            const outstanding = selectedSplit.participants
                              .filter(p => p.paymentStatus !== 'PAID' && p.userId !== selectedSplit.creatorId)
                              .reduce((sum, p) => sum + p.shareAmount, 0);

                            const isFullySettled = outstanding === 0;

                            const handleTogglePayment = async (participantUserId: string, currentStatus: "PAID" | "UNPAID") => {
                              if (!isCreator || participantUserId === selectedSplit.creatorId) return;
                              
                              const newStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
                              
                              // Optimistically update UI
                              const updatedSplits = splits.map(s => {
                                if (s.splitExpenseId === selectedSplit.splitExpenseId) {
                                  return {
                                    ...s,
                                    participants: s.participants.map(p => 
                                      p.userId === participantUserId ? { ...p, paymentStatus: newStatus } : p
                                    )
                                  };
                                }
                                return s;
                              });
                              setSplits(updatedSplits);
                              setSelectedSplit(updatedSplits.find(s => s.splitExpenseId === selectedSplit.splitExpenseId) || null);

                              try {
                                await SplitExpenseService.updateSplitPaymentStatus({
                                  splitExpenseId: selectedSplit.splitExpenseId,
                                  participantUserId,
                                  paymentStatus: newStatus
                                });
                              } catch (e) {
                                // Revert on failure
                                SplitExpenseService.getUserSplitExpenses(userId)
                                  .then(setSplits)
                                  .catch(console.error);
                              }
                            };

                            return (
                              <>
                                {/* Status Header */}
                                <div className={`flex flex-col px-6 py-5 rounded-[24px] mb-2 ${neuIndent}`}>
                                  {isCreator ? (
                                    isFullySettled ? (
                                      <span className="text-[15px] font-bold text-success flex items-center gap-2"><Icons.CheckCircle2 size={18} /> Fully settled</span>
                                    ) : (
                                      <>
                                        <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Still owed to you</span>
                                        <span className="text-[24px] font-bold text-warning tracking-tight">{formatAmount(outstanding)}</span>
                                      </>
                                    )
                                  ) : (
                                    (() => {
                                      const myParticipant = selectedSplit.participants.find(p => p.userId === userId);
                                      const myStatus = myParticipant?.paymentStatus === 'PAID' || isCreator ? 'PAID' : 'UNPAID';
                                      if (myStatus === 'PAID') {
                                        return <span className="text-[15px] font-bold text-success flex items-center gap-2"><Icons.CheckCircle2 size={18} /> Your share is settled</span>;
                                      } else {
                                        return (
                                          <>
                                            <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-1">You owe {creatorName}</span>
                                            <span className="text-[24px] font-bold text-warning tracking-tight">{formatAmount(userShare)}</span>
                                          </>
                                        );
                                      }
                                    })()
                                  )}
                                </div>

                                {/* Participant List */}
                                {selectedSplit.participants.map(p => {
                                  const isUserCreator = p.userId === selectedSplit.creatorId;
                                  const status = p.paymentStatus === 'PAID' || isUserCreator ? 'PAID' : 'UNPAID';
                                  const interactive = isCreator && !isUserCreator;
                                  
                                  return (
                                    <div 
                                      key={p.userId} 
                                      className={`flex items-center justify-between px-6 py-4 rounded-[20px] ${p.userId === userId ? neuIndent : 'bg-transparent'} ${interactive ? 'cursor-pointer hover:bg-black/5 active:scale-[0.98] transition-all' : ''}`}
                                      onClick={() => interactive && handleTogglePayment(p.userId, status)}
                                    >
                                      <div className="flex items-center gap-4">
                                        {status === 'PAID' ? (
                                          <div className="text-success"><Icons.CheckCircle2 size={24} /></div>
                                        ) : (
                                          <div className="text-muted-foreground/30"><Icons.Circle size={24} /></div>
                                        )}
                                        <div className="flex flex-col">
                                          <span className={`text-[15px] font-bold ${p.userId === userId ? 'text-foreground' : 'text-foreground/80'}`}>
                                            {p.userId === userId ? 'You' : p.username} {isUserCreator && <span className="text-[10px] uppercase ml-1 opacity-60">(Payer)</span>}
                                          </span>
                                          <span className={`text-[12px] font-bold ${status === 'PAID' ? 'text-success' : 'text-muted-foreground/60'}`}>
                                            {status === 'PAID' ? 'Paid' : 'Not paid'}
                                          </span>
                                        </div>
                                      </div>
                                      <span className={`text-[16px] font-bold tracking-tight ${p.userId === userId ? 'text-foreground' : 'text-foreground/80'}`}>
                                        {formatAmount(p.shareAmount)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Details */}
                      <div>
                        <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mb-4 block pl-2">Extra Details</span>
                        <div className={`rounded-[32px] flex flex-col p-3 gap-3 border border-primary/5 ${neuExtrude}`}>
                          {selectedSplit.notes && (
                            <div className={`flex flex-col px-6 py-5 rounded-[24px] gap-1.5 ${neuIndent}`}>
                              <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Notes</span>
                              <span className="text-[15px] font-bold text-foreground leading-relaxed">{selectedSplit.notes}</span>
                            </div>
                          )}

                          {selectedSplit.receiptUrl && (
                            <div className={`flex flex-col px-6 py-5 rounded-[24px] gap-4 ${neuIndent}`}>
                              <div className="flex items-center justify-between">
                                <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Receipt</span>
                                <span className="text-[14px] font-bold text-foreground bg-foreground/5 px-3 py-1 rounded-full">Attached</span>
                              </div>
                              <button
                                onClick={() => setReceiptViewerConfig({
                                  isOpen: true,
                                  storagePath: '',
                                  fileName: 'Receipt',
                                  fileType: 'image/jpeg'
                                })}
                                className="flex items-center justify-center gap-2 py-3.5 rounded-[16px] text-[14px] font-bold text-white bg-gradient-to-r from-[#355C7D] to-[#2A4A65] shadow-lg transition-transform active:scale-[0.98]"
                              >
                                <ExternalLink size={16} />
                                View Receipt Image
                              </button>
                            </div>
                          )}
                          
                          {!selectedSplit.notes && !selectedSplit.receiptUrl && (
                            <div className="py-6 text-center text-[13px] font-bold text-muted-foreground uppercase tracking-widest">
                              No extra details
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </>
              );
            })()}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
      
      {/* Fallback for receipt viewer since we only have a direct URL */}
      {receiptViewerConfig && selectedSplit?.receiptUrl && (
         <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[300] flex flex-col">
            <div className="p-6 flex justify-end">
              <button onClick={() => setReceiptViewerConfig(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <img src={selectedSplit.receiptUrl} alt="Receipt" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
            </div>
         </div>
      )}
    </div>
  );
}
