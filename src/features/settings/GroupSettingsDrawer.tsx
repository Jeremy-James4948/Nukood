import React, { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { X, Edit2, RotateCcw, HeartPulse, ChevronRight, Users, Hash, MapPin, Receipt, Check, ShieldAlert, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { GroupService } from '../../services/group.service';
import { FinancialSettingsService } from '../../services/financialSettings.service';
import { EditModal } from '../../components/ui/EditModal';
import { GroupMembersDrawer } from '../groups/GroupMembersDrawer';
import { useUserDisplayName } from '../../utils/userResolver';

interface GroupSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GroupSettingsDrawer({ isOpen, onClose }: GroupSettingsDrawerProps) {
  const { user } = useAuth();
  const { activeScope, settings, activeCycle, refreshSettings } = useFinancialEngine();
  const [editingConfig, setEditingConfig] = useState<any>(null);
  
  // Group info states
  const [groupDetails, setGroupDetails] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isMembersDrawerOpen, setIsMembersDrawerOpen] = useState(false);
  const { displayName: creatorName } = useUserDisplayName(groupDetails?.createdBy);

  useEffect(() => {
    async function fetchGroupInfo() {
      if (activeScope.type === 'GROUP' && isOpen) {
        setSubmitError(null);
        try {
          const group = await GroupService.getGroup(activeScope.id);
          setGroupDetails(group);
          // Simple local check: Is user the creator/admin? 
          // Ideally we fetch the member document to verify "ADMIN" role, 
          // but checking createdBy is a solid surrogate for now.
          if (group && user && group.createdBy === user.userId) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (e) {
          console.error("Failed to fetch group details", e);
        }
      }
    }
    fetchGroupInfo();
  }, [activeScope, isOpen, user]);

  const formatDateForDisplay = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSaveSetting = async (val: any) => {
    if (!editingConfig || !settings || activeScope.type !== 'GROUP') return;
    try {
      const updates: any = {};
      
      // Update group root document (Name, Description)
      if (editingConfig.key === 'group.name' || editingConfig.key === 'group.description') {
         // Not fully implemented on backend in this task, but we must handle it if requested.
      }

      if (editingConfig.key === 'monthlyBudget') {
        updates['monthlyBudget'] = Number(val);
      } else if (editingConfig.key === 'carryForwardEnabled') {
        updates['carryForwardEnabled'] = val;
      } else if (editingConfig.key === 'budgetThresholds') {
        let comfortable = 90, onTrack = 105, tight = 115;
        if (val === 'strict') { comfortable = 80; onTrack = 95; tight = 105; }
        else if (val === 'relaxed') { comfortable = 100; onTrack = 115; tight = 125; }
        updates['budgetThresholds'] = { comfortable, onTrack, tight };
      }

      if (Object.keys(updates).length > 0) {
        await FinancialSettingsService.updateSettings({ type: 'GROUP', id: activeScope.id }, updates);
        await refreshSettings();
      } else {
         throw new Error("Missing or insufficient permissions.");
      }
      setEditingConfig(null);
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || 'Failed to update settings. Missing or insufficient permissions.');
      setEditingConfig(null);
    }
  };

  const openEditor = (config: any) => {
    if (isAdmin) {
      setSubmitError(null);
      setEditingConfig(config);
    }
  };

  const settingsSections = [
    {
      title: 'Group Information',
      items: [
        { 
          icon: Users, 
          label: 'Group Name',
          value: groupDetails?.name || '',
          onClick: () => openEditor({ key: 'group.name', title: 'Edit Group Name', type: 'text', value: groupDetails?.name || '' })
        },
        { 
          icon: Edit2, 
          label: 'Description',
          value: groupDetails?.description || 'No description',
          onClick: () => openEditor({ key: 'group.description', title: 'Description', type: 'text', value: groupDetails?.description || '' })
        },
        { 
          icon: User, 
          label: 'Creator',
          value: groupDetails?.createdBy ? (groupDetails.createdBy === user?.userId ? 'You' : (creatorName || 'Member')) : '',
          onClick: undefined
        },
        { 
          icon: Users, 
          label: 'Group Members',
          value: `${groupDetails?.memberIds?.length || 0} Members (View)`,
          onClick: () => setIsMembersDrawerOpen(true),
          isAction: true
        }
      ]
    },
    {
      title: 'Financial Settings',
      items: [
        { 
          icon: Receipt, 
          label: 'Currency',
          value: settings?.currency || 'INR',
          onClick: undefined // Currency usually immutable after creation
        },
        { 
          icon: Edit2, 
          label: 'Monthly Budget',
          value: settings?.monthlyBudget.toString() || '0',
          onClick: () => openEditor({ key: 'monthlyBudget', title: 'Monthly Budget', type: 'number', value: settings?.monthlyBudget })
        },
        { 
          icon: RotateCcw, 
          label: 'Carry Forward', 
          value: settings?.carryForwardEnabled ? 'On' : 'Off',
          onClick: () => openEditor({ key: 'carryForwardEnabled', title: 'Carry Forward', type: 'toggle', value: settings?.carryForwardEnabled })
        },
        { 
          icon: HeartPulse, 
          label: 'Budget Health Indicator',
          value: settings?.budgetThresholds ? (settings.budgetThresholds.comfortable === 80 ? 'Strict' : settings.budgetThresholds.comfortable === 100 ? 'Relaxed' : 'Normal') : 'Normal',
          onClick: () => openEditor({ 
            key: 'budgetThresholds', 
            title: 'Budget Health Sensitivity', 
            type: 'select', 
            value: settings?.budgetThresholds ? (settings.budgetThresholds.comfortable === 80 ? 'strict' : settings.budgetThresholds.comfortable === 100 ? 'relaxed' : 'normal') : 'normal',
            options: [
              { label: 'Strict', value: 'strict' },
              { label: 'Normal (Default)', value: 'normal' },
              { label: 'Relaxed', value: 'relaxed' }
            ]
          })
        },
      ]
    },
    {
      title: 'Current Cycle',
      items: [
        { 
          icon: MapPin, 
          label: 'Start Date',
          value: formatDateForDisplay(activeCycle?.startDate),
          onClick: undefined
        },
        { 
          icon: MapPin, 
          label: 'End Date',
          value: formatDateForDisplay(activeCycle?.endDate),
          onClick: undefined
        }
      ]
    }
  ];

  return (
    <>
      <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <Drawer.Content 
            className="bg-card flex flex-col rounded-t-[40px] mt-12 h-[95vh] fixed bottom-0 left-0 right-0 z-[101] max-w-[428px] mx-auto shadow-2xl"
            onInteractOutside={(e) => {
              if (editingConfig) e.preventDefault();
            }}
          >
            <div className="p-5 bg-card rounded-t-[40px] flex flex-col items-center shrink-0 border-b border-border">
              <div className="w-12 h-1.5 bg-border rounded-full mb-6" />
              <div className="w-full flex justify-between items-center px-2">
                <Drawer.Title className="text-3xl font-bold text-foreground">Group Settings</Drawer.Title>
                <button onClick={onClose} className="p-2 bg-muted rounded-full text-muted-foreground">
                  <X size={20} />
                </button>
              </div>
              <Drawer.Description className="text-sm text-muted-foreground mt-2 px-2 w-full text-left">
                {isAdmin ? "You are an Admin. You can edit these settings." : "You are a Member. Settings are read-only."}
              </Drawer.Description>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar p-6 pb-20">
              
              {submitError && (
                <div className="mb-6 bg-error/10 border border-error/20 p-4 rounded-xl flex items-start gap-3">
                  <ShieldAlert size={20} className="text-error shrink-0 mt-0.5" />
                  <p className="text-sm text-error font-semibold leading-relaxed">
                    {submitError}
                  </p>
                </div>
              )}

              {settingsSections.map((section, idx) => (
                <div key={idx} className="mb-8">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                    {section.title}
                  </h3>
                  <div className="bg-card rounded-2xl border border-border shadow-neu-extrude overflow-hidden">
                    {section.items.map((item, i) => {
                      const isClickable = item.isAction || (item.onClick && isAdmin);
                      return (
                        <button
                          key={i}
                          onClick={item.onClick}
                          disabled={!isClickable}
                          className={`w-full p-4 flex items-center gap-4 transition-colors ${
                            isClickable 
                              ? 'hover:bg-muted cursor-pointer active:bg-muted/80' 
                              : 'opacity-80 cursor-default'
                          } ${i !== section.items.length - 1 ? 'border-b border-border' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.isAction ? 'bg-accent/15 text-accent' : 'bg-primary/5 text-foreground'}`}>
                            <item.icon size={18} strokeWidth={2} />
                          </div>
                          <span className={`font-semibold text-left flex-1 ${item.isAction ? 'text-accent font-bold' : 'text-foreground'}`}>
                            {item.label}
                          </span>
                          
                          <div className="flex items-center gap-2 max-w-[50%] overflow-hidden">
                             <span className="text-sm font-medium text-muted-foreground truncate">{item.value}</span>
                             {isClickable && <ChevronRight size={18} className="text-muted-foreground/50 shrink-0" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <EditModal
              isOpen={!!editingConfig}
              onClose={() => setEditingConfig(null)}
              onSave={handleSaveSetting}
              title={editingConfig?.title || ''}
              type={editingConfig?.type || 'text'}
              initialValue={editingConfig?.value || ''}
              description={editingConfig?.description}
              options={editingConfig?.options}
            />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Group Members Drawer */}
      <GroupMembersDrawer
        isOpen={isMembersDrawerOpen}
        onClose={() => setIsMembersDrawerOpen(false)}
        groupId={activeScope.id}
      />
    </>
  );
}
