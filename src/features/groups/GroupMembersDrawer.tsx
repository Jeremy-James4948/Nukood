import React, { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { X, Users, Crown, Shield, UserCheck, Calendar, AlertCircle } from 'lucide-react';
import { Group, GroupMember, GroupService } from '../../services/group.service';
import { useAuth } from '../../context/AuthContext';
import { getUserDisplayName } from '../../utils/userResolver';

interface GroupMembersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
}

interface MemberDisplayInfo {
  member: GroupMember;
  displayName: string;
  isCreator: boolean;
  isCurrentUser: boolean;
}

export function GroupMembersDrawer({ isOpen, onClose, groupId }: GroupMembersDrawerProps) {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<MemberDisplayInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMembersData() {
      if (!isOpen || !groupId) return;
      setIsLoading(true);
      setError(null);

      try {
        // 1. Fetch Group details
        const groupData = await GroupService.getGroup(groupId);
        setGroup(groupData);

        // 2. Fetch Active Group Members
        const activeMembers = await GroupService.getGroupMembers(groupId);

        // 3. Resolve display names for each active member
        const memberInfoPromises = activeMembers.map(async (m) => {
          const resolvedName = await getUserDisplayName(m.userId);
          const isCreator = groupData?.createdBy === m.userId;
          const isCurrentUser = user?.userId === m.userId;

          return {
            member: m,
            displayName: resolvedName || (isCurrentUser ? 'You' : 'Member'),
            isCreator,
            isCurrentUser,
          } as MemberDisplayInfo;
        });

        const resolvedMembers = await Promise.all(memberInfoPromises);

        // Sort members: Creator first, then ADMINs, then regular MEMBERS
        resolvedMembers.sort((a, b) => {
          if (a.isCreator) return -1;
          if (b.isCreator) return 1;
          if (a.member.role === 'ADMIN' && b.member.role !== 'ADMIN') return -1;
          if (a.member.role !== 'ADMIN' && b.member.role === 'ADMIN') return 1;
          return a.displayName.localeCompare(b.displayName);
        });

        setMembers(resolvedMembers);
      } catch (err: any) {
        console.error('Failed to load group members', err);
        setError(err.message || 'Unable to load group members.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMembersData();
  }, [isOpen, groupId, user]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
        <Drawer.Content className="bg-card flex flex-col rounded-t-[40px] mt-12 h-[85vh] fixed bottom-0 left-0 right-0 z-[101] max-w-[428px] mx-auto shadow-2xl outline-none border-t border-border">
          {/* Header */}
          <div className="p-5 bg-card rounded-t-[40px] flex flex-col items-center shrink-0 border-b border-border">
            <div className="w-12 h-1.5 bg-border rounded-full mb-6" />
            <div className="w-full flex justify-between items-center px-2">
              <div>
                <Drawer.Title className="text-2xl font-bold text-foreground">Group Members</Drawer.Title>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                  {group?.name || 'Group Space'}
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 bg-muted hover:bg-muted/80 rounded-full text-muted-foreground transition-colors"
                aria-label="Close drawer"
              >
                <X size={20} />
              </button>
            </div>
            <Drawer.Description className="sr-only">List of all active group members and their roles</Drawer.Description>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
            {/* Summary Stat Card */}
            <div className="bg-muted/40 rounded-2xl p-4 mb-6 border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Total Members</span>
                  <span className="text-lg font-bold text-foreground">
                    {members.length} Active {members.length === 1 ? 'Member' : 'Members'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Scope</span>
                <span className="text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full inline-block mt-0.5">
                  Group
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-error/10 border border-error/20 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle size={20} className="text-error shrink-0 mt-0.5" />
                <p className="text-sm text-error font-semibold leading-relaxed">
                  {error}
                </p>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-semibold text-muted-foreground">Loading members...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm font-semibold text-muted-foreground">No active members found.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2">
                  Members List
                </span>

                <div className="bg-card rounded-2xl border border-border shadow-neu-extrude overflow-hidden">
                  {members.map((item, index) => {
                    const isLast = index === members.length - 1;
                    return (
                      <div
                        key={item.member.userId}
                        className={`p-4 flex items-center gap-3.5 transition-colors ${
                          item.isCurrentUser ? 'bg-accent/5' : ''
                        } ${!isLast ? 'border-b border-border' : ''}`}
                      >
                        {/* Avatar */}
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          item.isCreator 
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20' 
                            : item.member.role === 'ADMIN'
                            ? 'bg-accent/15 text-accent border border-accent/20'
                            : 'bg-primary/5 text-foreground border border-border'
                        }`}>
                          {item.displayName.charAt(0).toUpperCase()}
                        </div>

                        {/* Name and Meta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-[15px] truncate">
                              {item.displayName}
                            </span>
                            {item.isCurrentUser && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-accent/20 text-accent rounded uppercase tracking-wider shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar size={12} className="text-muted-foreground/70 shrink-0" />
                            <span className="text-xs text-muted-foreground">
                              Joined {formatDate(item.member.joinedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Roles Badges */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {item.isCreator && (
                            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Crown size={12} strokeWidth={2.5} />
                              Creator
                            </span>
                          )}
                          <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            item.member.role === 'ADMIN'
                              ? 'bg-accent/15 text-accent border border-accent/20'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}>
                            {item.member.role === 'ADMIN' ? (
                              <>
                                <Shield size={12} strokeWidth={2.5} />
                                Admin
                              </>
                            ) : (
                              <>
                                <UserCheck size={12} strokeWidth={2.5} />
                                Member
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
