/**
 * InitializationContext — Phase 4
 *
 * Answers ONE question: "Has this authenticated user completed Nukood setup?"
 *
 * This context is intentionally separate from AuthContext (which answers "who
 * is this user?") and FinancialEngineContext (which manages financial data).
 *
 * Responsibilities:
 *  - Load isOnboarded state for the current authenticated user from Firestore.
 *  - Reset state immediately when the user changes (logout / user switch).
 *  - Expose a stable three-state tuple to the routing layer.
 *  - Surface Firestore errors without redirecting to onboarding.
 *
 * Does NOT:
 *  - Write to Firestore.
 *  - Make routing decisions.
 *  - Perform financial calculations.
 *  - Merge with auth state.
 *
 * Three-state model (required — LOADING must never be treated as ONBOARDING):
 *   isLoadingInitState = true        → state is not yet known
 *   isOnboarded = null               → state is not yet known (same as above)
 *   isOnboarded = false              → onboarding required
 *   isOnboarded = true               → account fully initialized
 *   initError = Error                → Firestore fetch failed; do NOT assume false
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { FinancialSettingsService } from '../services/financialSettings.service';

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

interface InitializationContextType {
  /**
   * null  → state not yet loaded (isLoadingInitState will be true)
   * false → user has NOT completed onboarding
   * true  → user HAS completed onboarding
   */
  isOnboarded: boolean | null;

  /** True while the Firestore fetch is in flight. */
  isLoadingInitState: boolean;

  /**
   * Non-null if the Firestore fetch failed.
   * IMPORTANT: an error here does NOT mean isOnboarded = false.
   * The routing layer must show a recoverable error, not send the user to onboarding.
   */
  initError: Error | null;

  /**
   * Call after OnboardingService.completeOnboarding() succeeds.
   * Updates the in-memory state without another Firestore round-trip.
   */
  markAsOnboarded: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const InitializationContext = createContext<InitializationContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const InitializationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.userId ?? null;

  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isLoadingInitState, setIsLoadingInitState] = useState(true);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Reset state immediately whenever the authenticated user changes.
    // This covers: logout (userId → null), login as a different user (userId changes).
    setIsOnboarded(null);
    setIsLoadingInitState(true);
    setInitError(null);

    if (!userId) {
      // Not authenticated — no state to load.
      setIsLoadingInitState(false);
      return;
    }

    const fetchInitState = async () => {
      try {
        const state = await FinancialSettingsService.getUserInitializationState(userId);
        if (!cancelled) {
          setIsOnboarded(state);
        }
      } catch (err) {
        if (!cancelled) {
          // Firestore fetch failed.
          // CRITICAL: do NOT set isOnboarded = false here.
          // The routing layer treats initError as a distinct recoverable state,
          // not as "user needs onboarding".
          console.error('[InitializationContext] Failed to load initialization state:', err);
          setInitError(err instanceof Error ? err : new Error('Failed to load initialization state'));
          setIsOnboarded(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingInitState(false);
        }
      }
    };

    fetchInitState();

    return () => {
      cancelled = true;
    };
  }, [userId]); // Re-runs whenever the authenticated user changes

  const markAsOnboarded = () => {
    setIsOnboarded(true);
  };

  return (
    <InitializationContext.Provider value={{ isOnboarded, isLoadingInitState, initError, markAsOnboarded }}>
      {children}
    </InitializationContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useInitialization = (): InitializationContextType => {
  const context = useContext(InitializationContext);
  if (context === undefined) {
    throw new Error('useInitialization must be used within an InitializationProvider');
  }
  return context;
};
