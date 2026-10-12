import React, { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import { X, Edit2, Trash2, Zap, ExternalLink } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Transaction } from '../../services/transaction.service';
import { Category } from '../../services/category.service';
import { useCurrencyFormatter } from '../../utils/currency';
import { ReceiptViewer } from '../../components/ui/ReceiptViewer';
import { TemplateService } from '../../services/template.service';
import { TransactionTemplate } from '../../constants/templates';
import { useAuth } from '../../context/AuthContext';
import { GroupService } from '../../services/group.service';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useUserDisplayName } from '../../utils/userResolver';

const neuExtrude = "bg-card shadow-neu-extrude";
const neuIndent = "bg-card shadow-neu-inset";

interface TransactionDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  txInfo: {
    tx: Transaction;
    category?: Category;
    cycleName?: string;
  } | null;
  activeScope: { type: 'PERSONAL' | 'GROUP'; id: string };
  onEdit?: () => void;
  onDelete?: (id: string) => void;
}

export function TransactionDetailDrawer({ isOpen, onClose, txInfo, activeScope, onEdit, onDelete }: TransactionDetailDrawerProps) {
  const { formatAmount } = useCurrencyFormatter();
  const { user } = useAuth();
  const { refreshTransactions } = useFinancialEngine();
  const [receiptViewerConfig, setReceiptViewerConfig] = useState<{ isOpen: boolean, storagePath: string, fileName: string, fileType: string } | null>(null);
  const [template, setTemplate] = useState<TransactionTemplate | null>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { displayName: creatorDisplayName } = useUserDisplayName(txInfo?.tx.createdBy);

  useEffect(() => {
    async function checkAdmin() {
      if (activeScope.type === 'GROUP' && user && isOpen) {
         try {
           const group = await GroupService.getGroup(activeScope.id);
           setIsAdmin(group?.createdBy === user.userId);
         } catch (e) {
           console.error("Failed to fetch group admin status", e);
         }
      } else if (activeScope.type === 'PERSONAL') {
         setIsAdmin(true);
      }
    }
    checkAdmin();
    
    if (isOpen) {
      setDeleteError(null);
      setIsDeleting(false);
    } else {
      setReceiptViewerConfig(null);
    }
  }, [activeScope, isOpen, user]);

  useEffect(() => {
    if (txInfo?.tx.templateId) {
      TemplateService.getTemplateById(txInfo.tx.templateId).then(setTemplate);
    } else {
      setTemplate(null);
    }
  }, [txInfo]);

  if (!txInfo) {
    return (
      <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[200]" />
          <Drawer.Content className={`bg-card flex flex-col rounded-t-[40px] mt-12 max-h-[90vh] fixed bottom-0 left-0 right-0 z-[201] max-w-[428px] mx-auto shadow-2xl outline-none`} />
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  const { tx, category, cycleName } = txInfo;

  // Extract dynamic details, excluding 'receipt' and any undefined values
  const dynamicDetails: Record<string, any> = {};
  if (tx.transactionDetails) {
    Object.entries(tx.transactionDetails).forEach(([key, value]) => {
      if (key !== 'receipt' && value !== undefined && value !== null && value !== '') {
        dynamicDetails[key] = value;
      }
    });
  }

  return (
    <>
      <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[200]" />
          <Drawer.Content className={`bg-card flex flex-col rounded-t-[40px] mt-12 max-h-[90vh] fixed bottom-0 left-0 right-0 z-[201] max-w-[428px] mx-auto shadow-2xl outline-none`}>

            <div className={`pt-6 pb-2 px-8 flex flex-col items-center shrink-0 relative rounded-t-[40px]`}>
              <div className={`w-12 h-1.5 rounded-full mb-8 ${neuIndent}`} />

              <button
                onClick={onClose}
                className={`absolute top-6 right-6 p-2 rounded-full text-foreground ${neuExtrude}`}
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center w-full mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${neuIndent}`} style={{ color: category?.color || '#355C7D' }}>
                  {(() => {
                    const IconComp = (category && (Icons as any)[category.icon]) || Icons.Circle;
                    return <IconComp size={28} strokeWidth={2.5} />
                  })()}
                </div>
                <span className={`text-[40px] font-bold tracking-tighter leading-none mb-2 ${tx.transactionType === 'INCOME' ? 'text-success' : 'text-foreground'}`}>
                  {tx.transactionType === 'INCOME' ? '+' : ''}{formatAmount(tx.amount)}
                </span>
                <Drawer.Title className="text-[18px] font-bold text-foreground">{tx.title}</Drawer.Title>
                <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                  {category?.name || 'Uncategorized'} • {new Date(tx.date).toLocaleDateString()}
                </span>
                {cycleName && (
                  <div className={`mt-4 px-4 py-1.5 rounded-full text-[11px] font-bold text-muted-foreground uppercase tracking-wider ${neuIndent}`}>
                    {cycleName}
                  </div>
                )}
                {/* Display creator if it's a group transaction */}
                {activeScope.type === 'GROUP' && tx.createdBy && (
                  <div className={`mt-2 px-4 py-1.5 rounded-full text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-primary/5 border border-primary/10`}>
                    Added by: {tx.createdBy === user?.userId ? 'You' : (creatorDisplayName || 'Member')}
                  </div>
                )}
                <Drawer.Description className="sr-only">Transaction details</Drawer.Description>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar px-6 py-6 pb-32" data-vaul-no-drag>
              <div className="flex flex-col gap-8">

                {/* Metadata Block */}
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block pl-2">Transaction Details</span>
                  <div className={`rounded-[24px] flex flex-col p-3 gap-3 ${neuExtrude}`}>
                    <div className={`flex flex-col px-5 py-4 rounded-[16px] gap-1 ${neuIndent}`}>
                      <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Date & Time</span>
                      <span className="text-[15px] font-bold text-foreground">{new Date(tx.date).toLocaleString()}</span>
                    </div>
                    
                    {tx.note && (
                      <div className={`flex flex-col px-5 py-4 rounded-[16px] gap-1 ${neuIndent}`}>
                        <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Notes</span>
                        <span className="text-[15px] font-bold text-foreground">{tx.note}</span>
                      </div>
                    )}

                    {/* Dynamic Details */}
                    {Object.keys(dynamicDetails).length > 0 && (
                      <div className={`flex flex-col px-5 py-4 rounded-[16px] gap-3 ${neuIndent}`}>
                        {Object.entries(dynamicDetails).map(([key, value]) => {
                          const fieldMeta = template?.fields.find(f => f.fieldId === key);
                          const label = fieldMeta ? fieldMeta.label : key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                          return (
                            <div key={key} className="flex flex-col gap-0.5">
                              <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
                              <span className="text-[15px] font-bold text-foreground">{String(value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Receipt Status & Action */}
                    {(tx.transactionDetails?.receipt?.attached || !!tx.receiptUrl) && (
                      <div className={`flex flex-col px-5 py-4 rounded-[16px] gap-3 ${neuIndent}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Receipt</span>
                          <span className="text-[14px] font-bold text-foreground">Attached</span>
                        </div>
                        <button
                          onClick={() => setReceiptViewerConfig({
                            isOpen: true,
                            storagePath: tx.transactionDetails?.receipt?.storagePath || tx.receiptUrl || '',
                            fileName: tx.transactionDetails?.receipt?.fileName || 'Receipt',
                            fileType: tx.transactionDetails?.receipt?.fileType || 'image/jpeg',
                          })}
                          className={`flex items-center justify-center gap-2 py-3 rounded-[12px] text-[14px] font-bold text-foreground transition-transform active:scale-[0.98] ${neuExtrude}`}
                        >
                          <ExternalLink size={16} />
                          View Receipt
                        </button>
                      </div>
                    )}
                    
                    {tx.fastEntryId && (
                       <div className={`flex items-center justify-between px-5 py-4 rounded-[16px] ${neuIndent}`}>
                         <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Method</span>
                         <span className="text-[14px] font-bold text-yellow-600 flex items-center gap-1.5"><Zap size={14}/> Fast Entry</span>
                       </div>
                    )}
                  </div>
                </div>

                {/* Actions Block */}
                {(activeScope.type === 'PERSONAL' || (activeScope.type === 'GROUP' && isAdmin)) && (
                  <div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block pl-2">Actions</span>
                    
                    {deleteError && (
                      <div className="mb-4 bg-error/10 border border-error/20 p-4 rounded-xl flex items-start gap-3">
                        <ShieldAlert size={20} className="text-error shrink-0 mt-0.5" />
                        <p className="text-sm text-error font-semibold leading-relaxed">
                          {deleteError}
                        </p>
                      </div>
                    )}
                    
                    <div className={`rounded-[24px] flex flex-col p-3 gap-3 ${neuExtrude}`}>
                      {activeScope.type === 'PERSONAL' && onEdit && (
                        <button 
                          onClick={() => { onClose(); onEdit(); }}
                          className={`flex items-center gap-3 px-5 py-4 rounded-[16px] text-left transition-transform active:scale-[0.98] ${neuIndent}`}
                        >
                          <Edit2 size={18} className="text-foreground" />
                          <span className="text-[15px] font-bold text-foreground">Edit Transaction</span>
                        </button>
                      )}
                      
                      <button
                        disabled={isDeleting}
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete "${tx.title}" (${formatAmount(tx.amount)})? This will automatically update your budget and balances.`)) {
                             if (activeScope.type === 'PERSONAL' && onDelete) {
                               onDelete(tx.transactionId);
                               onClose();
                             } else if (activeScope.type === 'GROUP') {
                               setIsDeleting(true);
                               setDeleteError(null);
                               try {
                                 const functions = getFunctions();
                                 const deleteFn = httpsCallable<{groupId: string, transactionId: string}, any>(functions, 'deleteGroupTransaction');
                                 await deleteFn({
                                   groupId: activeScope.id,
                                   transactionId: tx.transactionId
                                 });
                                 await refreshTransactions();
                                 onClose();
                               } catch (e: any) {
                                 console.error("Delete failed:", e);
                                 setDeleteError(e.message || "Failed to delete transaction.");
                               } finally {
                                 setIsDeleting(false);
                               }
                             }
                          }
                        }}
                        className={`flex items-center gap-3 px-5 py-4 rounded-[16px] text-left transition-transform ${!isDeleting && 'active:scale-[0.98]'} ${neuIndent} ${isDeleting ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isDeleting ? (
                          <Loader2 size={18} className="text-error animate-spin" />
                        ) : (
                          <Trash2 size={18} className="text-error" />
                        )}
                        <span className="text-[15px] font-bold text-error">
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

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
    </>
  );
}
