import React from 'react';
import { Drawer } from 'vaul';
import { X, User, CreditCard, LogOut, ChevronRight, Users, PlusCircle } from 'lucide-react';
import { useCurrencyFormatter } from '../../utils/currency';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { Group, GroupService } from '../../services/group.service';
import { useState, useEffect } from 'react';
import { GroupOnboardingDrawer } from '../../features/groups/GroupOnboardingDrawer';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { formatAmount } = useCurrencyFormatter();
  const { settings, activeScope, setActiveScope, userId } = useFinancialEngine();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isGroupOnboardingOpen, setIsGroupOnboardingOpen] = useState(false);

  useEffect(() => {
    if (userId && isOpen) {
      GroupService.getUserGroups(userId).then(setGroups).catch(console.error);
    }
  }, [userId, isOpen]);

  const profileName = settings?.profileName || 'Alex Chen';
  const profilePicture = settings?.profilePicture || 'A';
  return (
    <>
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

            <div className="bg-card rounded-2xl p-5 mb-6 shadow-sm border border-border">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Financial Spaces</h3>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setActiveScope({ type: 'PERSONAL', id: userId });
                    onClose();
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                    activeScope.type === 'PERSONAL' 
                      ? 'bg-accent/10 border border-accent/20' 
                      : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    activeScope.type === 'PERSONAL' ? 'bg-accent/20 text-accent' : 'bg-primary/5 text-foreground'
                  }`}>
                    <User size={20} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <span className={`font-semibold block ${activeScope.type === 'PERSONAL' ? 'text-accent' : 'text-foreground'}`}>
                      Personal
                    </span>
                    <span className="text-xs text-muted-foreground block">Individual tracking</span>
                  </div>
                  {activeScope.type === 'PERSONAL' && (
                    <div className="w-2 h-2 rounded-full bg-accent ml-auto"></div>
                  )}
                </button>

                {groups.length === 0 ? (
                  <div className="py-3 px-2 text-center">
                    <p className="text-sm text-muted-foreground">You aren't in any groups yet.</p>
                  </div>
                ) : (
                  groups.map(group => {
                    const isActive = activeScope.type === 'GROUP' && activeScope.id === group.groupId;
                    return (
                      <button
                        key={group.groupId}
                        onClick={() => {
                          setActiveScope({ type: 'GROUP', id: group.groupId });
                          onClose();
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                          isActive 
                            ? 'bg-accent/10 border border-accent/20' 
                            : 'hover:bg-muted border border-transparent'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-accent/20 text-accent' : 'bg-primary/5 text-foreground'
                        }`}>
                          <Users size={20} strokeWidth={2} />
                        </div>
                        <div className="flex-1 truncate">
                          <span className={`font-semibold block truncate ${isActive ? 'text-accent' : 'text-foreground'}`}>
                            {group.name}
                          </span>
                          <span className="text-xs text-muted-foreground block truncate">Group sharing</span>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-accent ml-auto shrink-0"></div>
                        )}
                      </button>
                    );
                  })
                )}

                <div className="h-px bg-border my-2 mx-1" />

                <button 
                  onClick={() => {
                    onClose();
                    setTimeout(() => setIsGroupOnboardingOpen(true), 150); // wait for drawer to close before opening the new one
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors text-left hover:bg-muted border border-transparent group"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-primary/5 text-foreground group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                    <PlusCircle size={20} strokeWidth={2} />
                  </div>
                  <span className="font-semibold text-foreground group-hover:text-accent transition-colors">
                    Create Group
                  </span>
                </button>
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
    <GroupOnboardingDrawer 
      isOpen={isGroupOnboardingOpen} 
      onClose={() => setIsGroupOnboardingOpen(false)} 
    />
    </>
  );
}
