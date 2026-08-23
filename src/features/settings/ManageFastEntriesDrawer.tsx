import React, { useState } from 'react';
import { Drawer } from 'vaul';
import { X, Check, Trash2, Zap, Edit2 } from 'lucide-react';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { FastEntry } from '../../services/fastEntry.service';

interface ManageFastEntriesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageFastEntriesDrawer({ isOpen, onClose }: ManageFastEntriesDrawerProps) {
  const { fastEntries, updateFastEntry, deleteFastEntry } = useFinancialEngine();
  const [editingEntry, setEditingEntry] = useState<FastEntry | null>(null);
  
  // Edit state
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = (fe: FastEntry) => {
    setEditingEntry(fe);
    setEditName(fe.displayName);
  };

  const handleCloseEdit = () => {
    setEditingEntry(null);
  };

  const handleSave = async () => {
    if (!editingEntry || !editName.trim()) return;
    setIsSaving(true);
    try {
      await updateFastEntry(editingEntry.fastEntryId, {
        displayName: editName.trim()
      });
      setEditingEntry(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEntry) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete the Fast Entry "${editingEntry.displayName}"? This will NOT delete any historical transactions created from it.`);
    if (!confirmDelete) return;

    setIsSaving(true);
    try {
      await deleteFastEntry(editingEntry.fastEntryId);
      setEditingEntry(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]" />
          <Drawer.Content 
            className="bg-card flex flex-col rounded-t-[40px] mt-12 h-[95vh] fixed bottom-0 left-0 right-0 z-[111] max-w-[428px] mx-auto shadow-2xl"
            onInteractOutside={(e) => {
              if (editingEntry) e.preventDefault();
            }}
          >
            <div className="p-5 bg-card rounded-t-[40px] flex flex-col items-center shrink-0 border-b border-border">
              <div className="w-12 h-1.5 bg-border rounded-full mb-6" />
              <div className="w-full flex justify-between items-center px-2">
                <Drawer.Title className="text-3xl font-bold text-foreground">Fast Entries</Drawer.Title>
                <button onClick={onClose} className="p-2 bg-muted rounded-full text-muted-foreground">
                  <X size={20} />
                </button>
              </div>
              <Drawer.Description className="sr-only">Manage your fast entries</Drawer.Description>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
              {fastEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                    <Zap size={24} className="text-foreground/30" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">No Fast Entries</h3>
                  <p className="text-sm text-muted-foreground max-w-[200px]">You can save any transaction as a Fast Entry while creating it.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {fastEntries.map(fe => (
                    <div key={fe.fastEntryId} className="bg-card p-4 rounded-2xl shadow-neu-extrude border border-border flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-primary/5 text-foreground">
                        <Zap size={20} strokeWidth={2.5} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[15px] font-bold text-foreground truncate">{fe.displayName}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                            Used {fe.usageCount} times
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleEditClick(fe)}
                        className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Edit Overlay */}
      {editingEntry && (
        <Drawer.Root open={true} onOpenChange={(open) => !open && handleCloseEdit()}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120]" />
            <Drawer.Content className="bg-card flex flex-col rounded-t-[40px] mt-24 fixed bottom-0 left-0 right-0 z-[121] max-w-[428px] mx-auto shadow-2xl">
              <div className="p-5 flex flex-col items-center shrink-0 border-b border-border">
                <div className="w-12 h-1.5 bg-border rounded-full mb-6" />
                <div className="w-full flex justify-between items-center px-2">
                  <Drawer.Title className="text-xl font-bold text-foreground">Edit Fast Entry</Drawer.Title>
                  <button onClick={handleCloseEdit} className="p-2 bg-muted rounded-full text-muted-foreground">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-6">
                {/* Name Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em] px-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Morning Coffee"
                    className="w-full bg-card border border-border rounded-2xl p-4 text-[15px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#355C7D]/20 transition-all"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleDelete}
                    disabled={isSaving}
                    className="w-14 h-14 bg-red-50 text-error rounded-2xl flex items-center justify-center shrink-0 hover:bg-red-100 active:scale-95 transition-all"
                  >
                    <Trash2 size={24} />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!editName.trim() || isSaving}
                    className="flex-1 h-14 bg-primary text-white rounded-2xl font-bold text-lg flex items-center justify-center shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2A4A65] active:scale-95 transition-all"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </>
  );
}
