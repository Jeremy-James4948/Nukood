/**
 * Route Guards — Phase 4
 *
 * Three guards, each with a single responsibility:
 *
 * 1. ProtectedRoute  — "Is the user authenticated?"
 *    Existing guard. Unchanged behavior.
 *    Unauthenticated → /login
 *
 * 2. InitializedRoute — "Has the authenticated user completed Nukood setup?"
 *    Wraps application routes (/, /dashboard, etc.)
 *    isLoadingInitState → spinner  (LOADING ≠ ONBOARDING)
 *    initError          → recoverable error (error ≠ not onboarded)
 *    isOnboarded=false  → /onboarding
 *    isOnboarded=true   → <Outlet /> (the application)
 *
 * 3. OnboardingRoute — inverse of InitializedRoute.
 *    Wraps the /onboarding route.
 *    isLoadingInitState → spinner
 *    isOnboarded=true   → / (already initialized, don't show onboarding)
 *    isOnboarded=false  → <Outlet /> (the onboarding page)
 *
 * Routing loop prevention:
 *   InitializedRoute  sends isOnboarded=false → /onboarding
 *   OnboardingRoute   sends isOnboarded=true  → /
 *   These are inverses — no loop is possible because each guard only
 *   redirects to the destination the other guard allows through.
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useInitialization } from '../context/InitializationContext';

// ---------------------------------------------------------------------------
// Shared loading spinner (consistent style with existing app)
// ---------------------------------------------------------------------------

const FullScreenSpinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="min-h-screen bg-[#F5F2EC] flex flex-col items-center justify-center gap-3">
    <Loader2 size={32} className="animate-spin text-[#355C7D]" />
    {label && (
      <p className="text-[#A49F96] text-sm font-medium">{label}</p>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// 1. ProtectedRoute — authentication guard (UNCHANGED behavior)
// ---------------------------------------------------------------------------

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullScreenSpinner label="Authenticating..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated — render nested routes
  return <Outlet />;
};

// ---------------------------------------------------------------------------
// 2. InitializedRoute — onboarding state guard for application routes
// ---------------------------------------------------------------------------

export const InitializedRoute: React.FC = () => {
  const { isOnboarded, isLoadingInitState, initError } = useInitialization();

  // LOADING — do not make any routing decision yet.
  // "Initialization state has not loaded yet" ≠ "isOnboarded = false".
  if (isLoadingInitState) {
    return <FullScreenSpinner label="Loading your account..." />;
  }

  // ERROR — Firestore fetch failed.
  // CRITICAL: do NOT redirect to /onboarding here.
  // "Unable to determine state" ≠ "User has not completed onboarding."
  if (initError) {
    return (
      <div className="min-h-screen bg-[#F5F2EC] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-[428px] flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-[20px] bg-[#F5F2EC] shadow-[6px_6px_12px_#d1cfc7,-6px_-6px_12px_#ffffff] flex items-center justify-center">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-[#355C7D]">Unable to Load Account</h2>
            <p className="text-[#6A6356] text-sm leading-relaxed">
              We couldn't verify your account setup. Please check your connection and try again.
            </p>
            <p className="text-[#A49F96] text-xs mt-1 font-mono">
              {initError.message}
            </p>
          </div>
          <button
            id="init-error-retry-btn"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 rounded-[16px] bg-[#355C7D] text-white text-sm font-bold shadow-[0_4px_12px_rgba(53,92,125,0.3)] active:scale-95 transition-all"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ONBOARDING REQUIRED — user has not completed setup.
  if (isOnboarded === false) {
    return <Navigate to="/onboarding" replace />;
  }

  // READY — user is fully initialized. Render the application.
  return <Outlet />;
};

// ---------------------------------------------------------------------------
// 3. OnboardingRoute — inverse guard for /onboarding
// ---------------------------------------------------------------------------

export const OnboardingRoute: React.FC = () => {
  const { isOnboarded, isLoadingInitState } = useInitialization();

  // LOADING — wait. Don't redirect to / yet; the user might need onboarding.
  if (isLoadingInitState) {
    return <FullScreenSpinner label="Loading your account..." />;
  }

  // ALREADY INITIALIZED — don't let an initialized user re-enter onboarding.
  // Prevents: initialized user navigates to /onboarding → redirect back to /.
  if (isOnboarded === true) {
    return <Navigate to="/" replace />;
  }

  // ONBOARDING NEEDED — render the onboarding page.
  return <Outlet />;
};
