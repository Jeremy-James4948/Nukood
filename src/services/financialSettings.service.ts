import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FinancialScope, getScopePath } from '../types/FinancialScope';

export interface FinancialSettings {
  profileName?: string;
  profilePicture?: string;
  monthlyBudget: number;
  carryForwardEnabled: boolean;
  budgetThresholds: { comfortable: number; onTrack: number; tight: number };
  currency: string;
  cycleConfiguration: {
    startDate: Date;
    cycleLengthDays: number;
    autoCreateNextCycle: boolean;
  };
  hiddenCategoryIds?: string[];
  isOnboarded?: boolean;
}

const DEFAULT_SETTINGS: FinancialSettings = {
  monthlyBudget: 0,
  carryForwardEnabled: true,
  budgetThresholds: { comfortable: 90, onTrack: 105, tight: 115 },
  currency: 'INR',
  cycleConfiguration: {
    startDate: new Date(),
    cycleLengthDays: 31,
    autoCreateNextCycle: true,
  },
  hiddenCategoryIds: [],
  isOnboarded: false
};

export class FinancialSettingsService {
  /**
   * Retrieves the user's financial configuration document.
   */
  static async getSettings(scope: FinancialScope): Promise<FinancialSettings | null> {
    const docRef = doc(db, ...getScopePath(scope), 'settings', 'financial');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        ...data,
        cycleConfiguration: {
          ...data.cycleConfiguration,
          startDate: data.cycleConfiguration.startDate?.toDate() || new Date(),
        }
      } as FinancialSettings;
    }
    return null;
  }

  /**
   * Initializes the settings document if it doesn't exist.
   */
  static async initializeSettings(scope: FinancialScope, initialSettings: Partial<FinancialSettings> = {}): Promise<FinancialSettings> {
    const docRef = doc(db, ...getScopePath(scope), 'settings', 'financial');
    const settings = { ...DEFAULT_SETTINGS, ...initialSettings };
    await setDoc(docRef, settings);
    return settings;
  }

  /**
   * Updates existing settings.
   */
  static async updateSettings(scope: FinancialScope, updates: Partial<FinancialSettings>): Promise<void> {
    const docRef = doc(db, ...getScopePath(scope), 'settings', 'financial');
    await updateDoc(docRef, updates);
  }

  /**
   * Retrieves the user's initialization/onboarding state.
   * If the settings document exists but isOnboarded is undefined, it assumes true for legacy users.
   */
  static async getUserInitializationState(scope: FinancialScope): Promise<boolean> {
    const docRef = doc(db, ...getScopePath(scope), 'settings', 'financial');
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      const data = snap.data() as FinancialSettings;
      // If isOnboarded is explicitly defined, return it.
      if (data.isOnboarded !== undefined) {
        return data.isOnboarded;
      }
      // Legacy existing user without the field -> assume initialized
      return true;
    }
    
    // No settings document at all -> new user
    return false;
  }

  /**
   * Marks the user as having completed the initial account setup.
   */
  static async setUserInitializationComplete(scope: FinancialScope): Promise<void> {
    const docRef = doc(db, ...getScopePath(scope), 'settings', 'financial');
    
    // We use merge: true to ensure we don't overwrite if the document already exists,
    // though typically they would have called initializeSettings first.
    await setDoc(docRef, { isOnboarded: true }, { merge: true });
  }
}
