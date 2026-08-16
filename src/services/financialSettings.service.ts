import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  hiddenCategoryIds: []
};

export class FinancialSettingsService {
  /**
   * Retrieves the user's financial configuration document.
   */
  static async getSettings(userId: string): Promise<FinancialSettings | null> {
    const docRef = doc(db, 'users', userId, 'settings', 'financial');
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
  static async initializeSettings(userId: string, initialSettings: Partial<FinancialSettings> = {}): Promise<FinancialSettings> {
    const docRef = doc(db, 'users', userId, 'settings', 'financial');
    const settings = { ...DEFAULT_SETTINGS, ...initialSettings };
    await setDoc(docRef, settings);
    return settings;
  }

  /**
   * Updates existing settings.
   */
  static async updateSettings(userId: string, updates: Partial<FinancialSettings>): Promise<void> {
    const docRef = doc(db, 'users', userId, 'settings', 'financial');
    await updateDoc(docRef, updates);
  }
}
