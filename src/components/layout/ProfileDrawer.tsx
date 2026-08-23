import React from 'react';
import { Drawer } from 'vaul';
import { X, User, CreditCard, LogOut, ChevronRight } from 'lucide-react';
import { useCurrencyFormatter } from '../../utils/currency';
import { useFinancialEngine } from '../../context/FinancialEngineContext';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { formatAmount } = useCurrencyFormatter();
  const { settings } = useFinancialEngine();
  
  const profileName = settings?.profileName || 'Alex Chen';
  const profilePicture = settings?.profilePicture || 'A';
  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
        <Drawer.Content className="bg-card flex flex-col rounded-t-[40px] mt-24 h-[85vh] fixed bottom-0 left-0 right-0 z-[101] max-w-[428px] mx-auto shadow-2xl outline-none">
          <div className="p-5 bg-card rounded-t-[40px] flex flex-col items-center shrink-0">
            <div className="w-12 h-1.5 bg-border rounded-full mb-6" />
            <div className="w-full flex justify-between items-start px-2">
              <Drawer.Title className="text-3xl font-bold text-foreground mb-1">Profile</Drawer.Title>
              <button onClick={onClose} className="p-2 bg-muted rounded-full text-muted-foreground">
                <X size={20} />
              </button>
            </div>
            <Drawer.Description className="sr-only">User Profile Information</Drawer.Description>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 bg-accent-soft/20 text-accent-warm rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-sm border border-white overflow-hidden">
                {profilePicture.length > 2 ? (
                  <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profilePicture
                )}
              </div>
              <h2 className="text-2xl font-bold text-foreground">{profileName}</h2>
              <p className="text-muted-foreground">Premium Member</p>
            </div>

            <div className="bg-card rounded-2xl p-5 mb-6 shadow-sm border border-border">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Financial Overview</h3>
              <div className="flex justify-between items-center mb-4">
                <span className="text-foreground font-medium">Total Assets</span>
                <span className="text-lg font-bold text-success">{formatAmount(24500)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">Monthly Goal</span>
                <span className="text-lg font-bold text-foreground">75% reached</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { icon: User, label: 'Account Information' },
                { icon: CreditCard, label: 'Payment Methods' },
                { icon: LogOut, label: 'Sign Out', color: 'text-error' }
              ].map((item, i) => (
                <button key={i} className="bg-card p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-border hover:bg-muted transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/5 ${item.color || 'text-foreground'}`}>
                    <item.icon size={20} strokeWidth={2} />
                  </div>
                  <span className={`font-semibold ${item.color || 'text-foreground'}`}>{item.label}</span>
                  <ChevronRight size={18} className="text-gray-400 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
