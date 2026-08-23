import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { User, Wallet, Calendar, RotateCcw } from 'lucide-react';
import { SlideLayout } from '../components/SlideLayout';
import { calculateCycleEndDate } from '../../../services/onboarding.service';
import type { OnboardingDraft } from '../OnboardingPage';

interface ReviewSlideProps {
  draft: OnboardingDraft;
  onConfirm: () => void;
  onRestart: () => void;
  onBack: () => void;
}

function formatBudget(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export const ReviewSlide: React.FC<ReviewSlideProps> = ({
  draft,
  onConfirm,
  onRestart,
  onBack,
}) => {
  const endDate = useMemo(() => calculateCycleEndDate(draft.cycleStartDate), [draft.cycleStartDate]);

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    ...(draft.profileName
      ? [{
          icon: <User size={16} className="text-[#A9BDD0]" />,
          label: 'Name',
          value: draft.profileName,
        }]
      : []),
    {
      icon: <Calendar size={16} className="text-[#A9BDD0]" />,
      label: 'Cycle',
      value: `${draft.cycleName}  ·  ${format(draft.cycleStartDate, 'd MMM')} → ${format(endDate, 'd MMM')}`,
    },
    {
      icon: <Wallet size={16} className="text-[#A9BDD0]" />,
      label: 'Budget',
      value: formatBudget(draft.monthlyBudget),
    },
    {
      icon: <RotateCcw size={16} className="text-[#A9BDD0]" />,
      label: 'Unused budget',
      value: draft.carryForwardEnabled ? 'Carries forward' : 'Resets each cycle',
    },
  ];

  return (
    <SlideLayout
      showBack
      onBack={onBack}
      primaryLabel="I like these choices"
      onPrimary={onConfirm}
      secondaryLabel="Nahh, let's start over"
      onSecondary={onRestart}
    >
      <div className="flex flex-col gap-8">
        {/* Heading */}
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold text-[#A49F96] uppercase tracking-widest">
            Looking good
          </p>
          <h2 className="text-[28px] font-black text-foreground leading-snug tracking-tight">
            You're all set.
          </h2>
          <p className="text-[15px] text-foreground font-medium leading-relaxed">
            Here's what we'll set up for you. Does everything look right?
          </p>
        </div>

        {/* Summary card */}
        <div
          className="rounded-[28px] bg-background
                     shadow-neu-card
                     divide-y divide-[#E8E4DD] overflow-hidden"
        >
          {rows.map(({ icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-4 px-6 py-4"
            >
              <div
                className="w-8 h-8 rounded-full bg-background
                           shadow-neu-card
                           flex items-center justify-center shrink-0"
              >
                {icon}
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-[11px] font-bold text-[#A49F96] uppercase tracking-wider">
                  {label}
                </p>
                <p className="text-[16px] font-bold text-foreground truncate">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
};
