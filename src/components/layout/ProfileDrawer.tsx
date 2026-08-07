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
        <Drawer.Content className="bg-[#F9FAFB] flex flex-col rounded-t-[40px] mt-24 h-[85vh] fixed bottom-0 left-0 right-0 z-[101] max-w-[428px] mx-auto shadow-2xl outline-none">
          <div className="p-5 bg-white rounded-t-[40px] flex flex-col items-center shrink-0">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-6" />
            <div className="w-full flex justify-between items-start px-2">
              <Drawer.Title className="text-3xl font-bold text-[#355C7D] mb-1">Profile</Drawer.Title>
              <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-[#6C5B7B]">
                <X size={20} />
              </button>
            </div>
            <Drawer.Description className="sr-only">User Profile Information</Drawer.Description>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 bg-[#F8B195]/20 text-[#F67280] rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-sm border border-white overflow-hidden">
                {profilePicture.length > 2 ? (
                  <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profilePicture
                )}
              </div>
              <h2 className="text-2xl font-bold text-[#355C7D]">{profileName}</h2>
              <p className="text-[#6C5B7B]">Premium Member</p>
            </div>

            <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-50">
              <h3 className="text-sm font-semibold text-[#6C5B7B] uppercase tracking-wider mb-4">Financial Overview</h3>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[#355C7D] font-medium">Total Assets</span>
                <span className="text-lg font-bold text-green-500">{formatAmount(24500)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#355C7D] font-medium">Monthly Goal</span>
                <span className="text-lg font-bold text-[#355C7D]">75% reached</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { icon: User, label: 'Account Information' },
                { icon: CreditCard, label: 'Payment Methods' },
                { icon: LogOut, label: 'Sign Out', color: 'text-red-500' }
              ].map((item, i) => (
                <button key={i} className="bg-white p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-gray-50 hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[#355C7D]/5 ${item.color || 'text-[#355C7D]'}`}>
                    <item.icon size={20} strokeWidth={2} />
                  </div>
                  <span className={`font-semibold ${item.color || 'text-[#355C7D]'}`}>{item.label}</span>
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
