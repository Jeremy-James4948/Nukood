/**
 * OnboardingPlaceholder — Phase 4
 *
 * TEMPORARY PLACEHOLDER — will be replaced by the full onboarding questionnaire in Phase 5.
 *
 * Purpose: Confirm that an uninitialized user is correctly routed to /onboarding.
 *
 * This page intentionally contains:
 *  - No onboarding questions
 *  - No Firestore writes
 *  - No final styling or animations
 *  - No data collection
 *
 * It only proves: "An uninitialized user has been correctly routed to the onboarding entry point."
 */

import React from 'react';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const OnboardingPlaceholder: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center font-sans p-6">
      <div className="w-full max-w-[428px] flex flex-col items-center gap-8 text-center">

        {/* Icon */}
        <div className="w-20 h-20 rounded-[28px] bg-[#F5F2EC] shadow-[6px_6px_12px_#d1cfc7,-6px_-6px_12px_#ffffff] flex items-center justify-center">
          <ClipboardList size={36} className="text-[#355C7D]" />
        </div>

        {/* Heading */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-[#355C7D]">
            Onboarding
          </h1>
          <p className="text-[#6A6356] font-medium text-base leading-relaxed">
            Welcome{user?.username ? `, ${user.username}` : ''}! Your account needs a quick setup before you can start.
          </p>
        </div>

        {/* Placeholder notice */}
        <div className="w-full p-4 rounded-[20px] bg-yellow-50 border border-yellow-200 text-left">
          <p className="text-yellow-800 text-sm font-bold mb-1">Phase 4 — Routing Placeholder</p>
          <p className="text-yellow-700 text-sm leading-relaxed">
            Routing is working correctly. You are here because your account has not yet been initialized.
            The full onboarding questionnaire will be implemented in Phase 5.
          </p>
        </div>

        {/* Dev info */}
        <div className="w-full p-4 rounded-[20px] bg-[#F5F2EC] shadow-[inset_2px_2px_4px_#d1cfc7,inset_-2px_-2px_4px_#ffffff] text-left">
          <p className="text-[#A49F96] text-xs font-bold uppercase tracking-wider mb-2">Debug Info</p>
          <p className="text-[#6A6356] text-sm font-mono">
            userId: <span className="text-[#355C7D] font-bold">{user?.userId ?? '—'}</span>
          </p>
          <p className="text-[#6A6356] text-sm font-mono mt-1">
            route: <span className="text-[#355C7D] font-bold">/onboarding</span>
          </p>
          <p className="text-[#6A6356] text-sm font-mono mt-1">
            isOnboarded: <span className="text-[#355C7D] font-bold">false</span>
          </p>
        </div>

      </div>
    </div>
  );
};
