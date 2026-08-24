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
      <div className="flex flex-col gap-8 items-center text-center w-full max-w-sm mx-auto mt-4">
        {/* Heading */}
        <div className="flex flex-col gap-3 items-center">
          <p className="text-[13px] font-bold text-accent uppercase tracking-[0.2em]">
            Looking good
          </p>
          <h2 className="text-3xl font-semibold text-primary leading-snug tracking-wide" style={{ fontFamily: '"Playfair Display", serif' }}>
            You're all set.
          </h2>
          <p className="text-[15px] text-muted-foreground font-medium leading-relaxed max-w-[280px]">
            Here's what we'll set up for you. Does everything look right?
          </p>
        </div>

        {/* Summary card */}
        <div
          className="rounded-3xl bg-white/40 border w-full
                     overflow-hidden shadow-sm flex flex-col"
          style={{ borderColor: 'var(--border)' }}
        >
          {rows.map(({ icon, label, value }, index) => (
            <div
              key={label}
              className={`flex items-center gap-4 px-6 py-5 ${
                index !== rows.length - 1 ? 'border-b border-[var(--border)]' : ''
              }`}
            >
              <div
                className="w-10 h-10 rounded-2xl bg-white/60 border border-[var(--border)]
                           flex items-center justify-center shrink-0 text-primary"
              >
                {icon}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  {label}
                </p>
                <p className="text-[15px] font-semibold text-foreground truncate mt-0.5">
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
