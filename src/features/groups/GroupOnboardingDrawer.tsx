import React, { useState } from 'react';
import { Drawer } from 'vaul';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Check, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GroupService } from '../../services/group.service';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AuthUser } from '../../types/auth';

interface GroupOnboardingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GroupDraft {
  name: string;
  description: string;
  currency: string;
  budget: string;
  cycleStartDate: string;
  cycleLength: string;
  members: string[];
}

const defaultDraft = (): GroupDraft => {
  const d = new Date();
  return {
    name: '',
    description: '',
    currency: 'INR',
    budget: '0',
    cycleStartDate: d.toISOString().split('T')[0],
    cycleLength: 'MONTHLY',
    members: [],
  };
};

export function GroupOnboardingDrawer({ isOpen, onClose }: GroupOnboardingDrawerProps) {
  const { user } = useAuth();
  const { setActiveScope } = useFinancialEngine();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<GroupDraft>(defaultDraft());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [availableUsers, setAvailableUsers] = useState<AuthUser[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      getDocs(collection(db, 'users'))
        .then(snap => {
          const users = snap.docs.map(doc => doc.data() as AuthUser);
          setAvailableUsers(users);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const handleClose = () => {
    setStep(1);
    setDraft(defaultDraft());
    setSubmitError(null);
    onClose();
  };

  const handleNext = () => {
    setSubmitError(null);
    setStep((s) => Math.min(s + 1, 4));
  };
  const handleBack = () => {
    setSubmitError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const budgetNum = Number(draft.budget) || 0;
      const newGroup = await GroupService.createGroup({
        name: draft.name.trim(),
        description: draft.description.trim(),
        creatorId: user.userId,
        currency: draft.currency,
        budget: budgetNum,
        cycleStartDate: new Date(draft.cycleStartDate),
        cycleLength: draft.cycleLength as any,
        members: draft.members,
      });
      
      // On success, set active scope to new group and close
      setActiveScope({ type: 'GROUP', id: newGroup.groupId });
      handleClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = draft.name.trim().length > 0;
  const isStep2Valid = !isNaN(Number(draft.budget)) && Number(draft.budget) >= 0 && draft.cycleStartDate !== '';

  const renderStep1 = () => (
    <div className="flex flex-col gap-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-foreground">Name Your Group</h2>
        <p className="text-muted-foreground mt-2">Give your new financial space an identity.</p>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Group Name <span className="text-error">*</span></label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="e.g. The Test House, Europe Trip"
          className="w-full bg-muted border border-border rounded-xl p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Description (Optional)</label>
        <textarea
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder="What is this group for?"
          className="w-full bg-muted border border-border rounded-xl p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-accent min-h-[100px]"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="flex flex-col gap-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-foreground">Financial Setup</h2>
        <p className="text-muted-foreground mt-2">Configure the group's budget and tracking cycle.</p>
      </div>
      
      <div className="flex gap-4">
        <div className="flex flex-col gap-2 w-1/3">
          <label className="text-sm font-semibold text-foreground">Currency</label>
          <select
            value={draft.currency}
            onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
            className="w-full bg-muted border border-border rounded-xl p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-sm font-semibold text-foreground">Initial Budget</label>
          <input
            type="number"
            min="0"
            step="any"
            value={draft.budget}
            onChange={(e) => setDraft({ ...draft, budget: e.target.value })}
            className="w-full bg-muted border border-border rounded-xl p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Cycle Start Date</label>
        <input
          type="date"
          value={draft.cycleStartDate}
          onChange={(e) => setDraft({ ...draft, cycleStartDate: e.target.value })}
          className="w-full bg-muted border border-border rounded-xl p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Cycle Length</label>
        <select
          value={draft.cycleLength}
          onChange={(e) => setDraft({ ...draft, cycleLength: e.target.value })}
          className="w-full bg-muted border border-border rounded-xl p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="MONTHLY">Monthly</option>
          <option value="WEEKLY">Weekly</option>
          <option value="BIWEEKLY">Bi-Weekly</option>
        </select>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="flex flex-col gap-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-foreground">Add Members</h2>
        <p className="text-muted-foreground mt-2">Who is sharing this space?</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold">
          {user?.username.charAt(0).toUpperCase() || 'Y'}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{user?.username || 'You'}</p>
          <p className="text-xs text-muted-foreground">Creator & Admin</p>
        </div>
        <Check size={20} className="text-success" />
      </div>

      <div className="mt-2">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-warning" />
          <h3 className="text-sm font-semibold text-warning">Prototype Members (Development Only)</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Select test accounts to prototype multi-user functionality. Real invitations will be implemented in a later phase.
        </p>

        <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-2">
          {availableUsers.filter(u => u.userId !== user?.userId).map(devUser => {
            const isSelected = draft.members.includes(devUser.userId);
            return (
              <button
                key={devUser.userId}
                onClick={() => {
                  if (isSelected) {
                    setDraft({ ...draft, members: draft.members.filter(m => m !== devUser.userId) });
                  } else {
                    setDraft({ ...draft, members: [...draft.members, devUser.userId] });
                  }
                }}
                className={`flex items-center gap-4 p-3 rounded-xl border transition-colors text-left ${
                  isSelected ? 'bg-accent/10 border-accent' : 'bg-card border-border hover:bg-muted/80'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-foreground flex items-center justify-center font-bold">
                  {devUser.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{devUser.username}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">ID: {devUser.userId}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-muted-foreground'}`}>
                  {isSelected && <Check size={14} className="text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="flex flex-col gap-6">
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-foreground">Review & Confirm</h2>
        <p className="text-muted-foreground mt-2">Almost ready! Check your settings below.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-bold text-lg text-foreground">{draft.name}</h3>
          {draft.description && <p className="text-sm text-muted-foreground mt-1">{draft.description}</p>}
        </div>
        
        <div className="p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Currency</span>
            <span className="font-semibold text-foreground">{draft.currency}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Initial Budget</span>
            <span className="font-semibold text-foreground">{Number(draft.budget).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Cycle Length</span>
            <span className="font-semibold text-foreground">{draft.cycleLength}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Start Date</span>
            <span className="font-semibold text-foreground">{new Date(draft.cycleStartDate).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-foreground">Members</span>
            <span className="text-xs font-bold bg-accent/20 text-accent px-2 py-0.5 rounded-full">{draft.members.length + 1} Total</span>
          </div>
          <p className="text-sm text-muted-foreground">You (Admin)</p>
          {draft.members.length > 0 && (
            <p className="text-sm text-warning mt-1 italic">
              + {draft.members.length} Prototype Member(s) selected (not yet added)
            </p>
          )}
        </div>
      </div>

      <div className="bg-success/10 border border-success/20 p-4 rounded-xl flex items-start gap-3">
        <Check size={20} className="text-success shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          <strong>Prototype Members:</strong> The members you selected will be added to the group immediately. You can test out multi-user workflows by signing in as them!
        </p>
      </div>
      
      {submitError && (
        <div className="bg-error/10 border border-error/20 p-4 rounded-xl flex items-start gap-3">
          <X size={20} className="text-error shrink-0 mt-0.5" />
          <p className="text-sm text-error font-semibold">
            {submitError}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && handleClose()} direction="bottom">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120]" />
        <Drawer.Content className="bg-background flex flex-col rounded-t-[40px] mt-24 h-[90vh] fixed bottom-0 left-0 right-0 z-[121] max-w-[428px] mx-auto shadow-2xl outline-none">
          <div className="p-5 bg-background rounded-t-[40px] flex flex-col items-center shrink-0">
            <div className="w-12 h-1.5 bg-border rounded-full mb-6" />
            <div className="w-full flex justify-between items-center px-2">
              <div className="w-10">
                {step > 1 && (
                  <button 
                    onClick={handleBack} 
                    className="p-2 -ml-2 rounded-full text-foreground hover:bg-muted transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? 'w-6 bg-accent' : step > i ? 'w-2 bg-accent/50' : 'w-2 bg-border'}`} />
                ))}
              </div>
              <div className="w-10 flex justify-end">
                <button 
                  onClick={handleClose} 
                  className="p-2 -mr-2 rounded-full text-foreground hover:bg-muted transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <Drawer.Title className="sr-only">Create Group</Drawer.Title>
            <Drawer.Description className="sr-only">Onboarding flow to create a new group</Drawer.Description>
          </div>

          <div className="p-6 overflow-y-auto flex-1 pb-32">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t border-border flex gap-4">
            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                className="w-full py-4 rounded-full font-bold text-lg bg-accent text-white shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                Continue <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 rounded-full font-bold text-lg bg-success text-white shadow-lg shadow-success/20 hover:shadow-success/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? 'Creating...' : 'Finish Setup'}
              </button>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
