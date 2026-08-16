import React, { useState } from 'react';
import { Drawer } from 'vaul';
import {
  X,
  User,
  CreditCard,
  Receipt,
  Calendar,
  RotateCcw,
  Settings,
  HeartPulse,
  Plus,
  List,
  Database,
  Palette,
  Edit2,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinancialEngine } from '../../context/FinancialEngineContext';
import { FinancialSettingsService } from '../../services/financialSettings.service';
import { EditModal } from '../../components/ui/EditModal';
import { ManageCategoriesDrawer } from './ManageCategoriesDrawer';
import { ManageFastEntriesDrawer } from './ManageFastEntriesDrawer';
import { Zap } from 'lucide-react';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const { settings, userId, refreshSettings } = useFinancialEngine();
  const { signOut, user } = useAuth();
  const [editingConfig, setEditingConfig] = useState<{ key: string, title: string, type: 'text'|'number'|'toggle'|'date'|'select', value: any, description?: string, options?: { label: string; value: any; description?: string }[] } | null>(null);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isManageFastEntriesOpen, setIsManageFastEntriesOpen] = useState(false);

  const formatDateForInput = (date: Date) => {
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSaveSetting = async (val: any) => {
    if (!editingConfig || !settings) return;
    try {
      const updates: any = {};
      
      if (editingConfig.key === 'cycleConfiguration.startDate') {
        const newStartDate = new Date(val);
        updates['cycleConfiguration'] = {
          ...settings.cycleConfiguration,
          startDate: newStartDate
        };
      } else if (editingConfig.key === 'cycleConfiguration.endDate') {
        const newEndDate = new Date(val);
        const start = new Date(settings.cycleConfiguration.startDate);
        
        start.setHours(0, 0, 0, 0);
        newEndDate.setHours(0, 0, 0, 0);

        let diffTime = newEndDate.getTime() - start.getTime();
        let lengthDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        if (lengthDays < 1) lengthDays = 1;

        updates['cycleConfiguration'] = {
          ...settings.cycleConfiguration,
          cycleLengthDays: lengthDays
        };
      } else if (editingConfig.key === 'budgetThresholds') {
        let comfortable = 90;
        let onTrack = 105;
        let tight = 115;
        
        if (val === 'strict') {
          comfortable = 80;
          onTrack = 95;
          tight = 105;
        } else if (val === 'relaxed') {
          comfortable = 100;
          onTrack = 115;
          tight = 125;
        }

        updates['budgetThresholds'] = { comfortable, onTrack, tight };
      } else {
        updates[editingConfig.key] = val;
      }

      await FinancialSettingsService.updateSettings(userId, updates);
      await refreshSettings();
    } catch (err) {
      console.error(err);
    }
  };

  const settingsSections = [
    {
      title: 'Profile Settings',
      items: [
        { 
          icon: Edit2, 
          label: 'Edit Name',
          value: settings?.profileName,
          onClick: () => setEditingConfig({ key: 'profileName', title: 'Edit Name', type: 'text', value: settings?.profileName || '', description: 'Enter your full name or nickname.' })
        },
        { 
          icon: User, 
          label: 'Profile Picture',
          value: settings?.profilePicture,
          onClick: () => setEditingConfig({ key: 'profilePicture', title: 'Profile Picture', type: 'text', value: settings?.profilePicture || '', description: 'Enter an emoji, a single letter, or an image URL.' })
        },
        { 
          icon: CreditCard, 
          label: 'Currency', 
          value: settings?.currency,
          onClick: () => setEditingConfig({ key: 'currency', title: 'Currency', type: 'text', value: settings?.currency, description: 'e.g. USD, EUR, INR' })
        },
      ]
    },
    {
      title: 'Monthly Cycle',
      items: [
        { 
          icon: Calendar, 
          label: 'Start Date', 
          value: settings?.cycleConfiguration.startDate ? formatDateForDisplay(new Date(settings.cycleConfiguration.startDate)) : '',
          onClick: () => setEditingConfig({ 
            key: 'cycleConfiguration.startDate', 
            title: 'Start Date', 
            type: 'date', 
            value: settings?.cycleConfiguration.startDate ? formatDateForInput(new Date(settings.cycleConfiguration.startDate)) : formatDateForInput(new Date()), 
            description: 'Select the exact date your cycle begins.' 
          })
        },
        { 
          icon: Calendar, 
          label: 'End Date', 
          value: (() => {
            if (!settings) return '';
            const start = new Date(settings.cycleConfiguration.startDate);
            const end = new Date(start);
            end.setDate(end.getDate() + settings.cycleConfiguration.cycleLengthDays - 1);
            return formatDateForDisplay(end);
          })(),
          onClick: () => {
             if (!settings) return;
             const start = new Date(settings.cycleConfiguration.startDate);
             const end = new Date(start);
             end.setDate(end.getDate() + settings.cycleConfiguration.cycleLengthDays - 1);
             
             setEditingConfig({ 
               key: 'cycleConfiguration.endDate', 
               title: 'End Date', 
               type: 'date', 
               value: formatDateForInput(end), 
               description: 'Select the exact date your cycle ends.' 
             });
          }
        },
      ]
    },
    {
      title: 'Financial Settings',
      items: [
        { 
          icon: Receipt, 
          label: 'Monthly Budget', 
          value: settings?.monthlyBudget.toString(),
          onClick: () => setEditingConfig({ key: 'monthlyBudget', title: 'Monthly Budget', type: 'number', value: settings?.monthlyBudget, description: 'Set your target budget limit for each cycle.' })
        },
        { 
          icon: RotateCcw, 
          label: 'Carry Forward', 
          value: settings?.carryForwardEnabled ? 'On' : 'Off',
          onClick: () => setEditingConfig({ key: 'carryForwardEnabled', title: 'Carry Forward', type: 'toggle', value: settings?.carryForwardEnabled, description: 'Automatically add unspent balance to next month\'s budget.' })
        },
        { 
          icon: HeartPulse, 
          label: 'Budget Health Indicator',
          value: settings?.budgetThresholds ? (settings.budgetThresholds.comfortable === 80 ? 'Strict' : settings.budgetThresholds.comfortable === 100 ? 'Relaxed' : 'Normal') : 'Normal',
          onClick: () => setEditingConfig({ 
            key: 'budgetThresholds', 
            title: 'Budget Health Sensitivity', 
            type: 'select', 
            value: settings?.budgetThresholds ? (settings.budgetThresholds.comfortable === 80 ? 'strict' : settings.budgetThresholds.comfortable === 100 ? 'relaxed' : 'normal') : 'normal',
            description: 'Adjust how quickly warnings appear for your spending.',
            options: [
              { label: 'Strict', value: 'strict', description: 'Comfortable up to 80%, On Track up to 95%, Tight up to 105%' },
              { label: 'Normal (Default)', value: 'normal', description: 'Comfortable up to 90%, On Track up to 105%, Tight up to 115%' },
              { label: 'Relaxed', value: 'relaxed', description: 'Comfortable up to 100%, On Track up to 115%, Tight up to 125%' }
            ]
          })
        },
      ]
    },
    {
      title: 'Management',
      items: [
        { icon: List, label: 'Manage Categories', onClick: () => setIsManageCategoriesOpen(true) },
        { icon: Zap, label: 'Manage Fast Entries', onClick: () => setIsManageFastEntriesOpen(true) }
      ]
    },
    {
      title: 'Account',
      items: [
        { 
          icon: LogOut, 
          label: 'Log Out', 
          value: user?.username || '',
          onClick: async () => {
            await signOut();
          } 
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
            className="bg-[#F9FAFB] flex flex-col rounded-t-[40px] mt-12 h-[95vh] fixed bottom-0 left-0 right-0 z-[101] max-w-[428px] mx-auto shadow-2xl"
            onInteractOutside={(e) => {
              if (editingConfig || isManageCategoriesOpen) {
                e.preventDefault();
              }
            }}
          >
            <div className="p-5 bg-white rounded-t-[40px] flex flex-col items-center shrink-0 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-6" />
              <div className="w-full flex justify-between items-center px-2">
                <Drawer.Title className="text-3xl font-bold text-[#355C7D]">Settings</Drawer.Title>
                <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-[#6C5B7B]">
                  <X size={20} />
                </button>
              </div>
              <Drawer.Description className="sr-only">Application Settings Management</Drawer.Description>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar p-6">
              {settingsSections.map((section, idx) => (
                <div key={idx} className="mb-8">
                  <h3 className="text-sm font-bold text-[#6C5B7B] uppercase tracking-wider mb-3 px-2">
                    {section.title}
                  </h3>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
                    {section.items.map((item, i) => (
                      <button
                        key={i}
                        onClick={item.onClick}
                        className={`w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${i !== section.items.length - 1 ? 'border-b border-gray-50' : ''}`}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#355C7D]/5 text-[#355C7D]">
                          <item.icon size={18} strokeWidth={2} />
                        </div>
                        <span className="font-semibold text-[#355C7D]">{item.label}</span>

                        {item.value && (
                          <span className="ml-auto text-sm font-medium text-[#6C5B7B]">{item.value}</span>
                        )}

                        <ChevronRight size={18} className={`text-gray-300 ${item.value ? 'ml-2' : 'ml-auto'}`} />
                      </button>
                    ))}
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
      <ManageCategoriesDrawer 
        isOpen={isManageCategoriesOpen} 
        onClose={() => setIsManageCategoriesOpen(false)} 
      />
      <ManageFastEntriesDrawer 
        isOpen={isManageFastEntriesOpen} 
        onClose={() => setIsManageFastEntriesOpen(false)} 
      />
    </>
  );
}
