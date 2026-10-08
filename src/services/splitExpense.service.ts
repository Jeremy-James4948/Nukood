import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { app } from "../lib/firebase";

export type SplitMethod = "EQUAL" | "MANUAL";

export interface SplitParticipant {
  userId: string;
  username: string;
  shareAmount: number;
  transactionId: string;
  paymentStatus?: "PAID" | "UNPAID";
}

export interface SplitExpense {
  splitExpenseId: string;
  creatorId: string;
  title: string;
  notes?: string;
  totalAmount: number;
  date: Date;
  categoryId: string;
  templateId: string;
  splitMethod: SplitMethod;
  participantIds: string[];
  participants: SplitParticipant[];
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface SplitParticipantInput {
  userId: string;
  shareAmount?: number; // Optional for EQUAL split, required for MANUAL
}

export interface CreateSplitExpenseRequest {
  title: string;
  totalAmount: number;
  date: Date;
  dateStr?: string; // Client's local YYYY-MM-DD
  categoryId: string;
  templateId: string;
  transactionDetails: Record<string, any>;
  participants: SplitParticipantInput[];
  splitMethod: SplitMethod;
  notes?: string;
  receiptUrl?: string;
}

export interface CreateSplitExpenseResponse {
  success: boolean;
  splitExpenseId: string;
  participants: Array<{
    userId: string;
    transactionId: string;
    shareAmount: number;
  }>;
}

// Initialize Firebase Functions for the region where it's deployed
const functions = getFunctions(app, "us-central1");

if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export class SplitExpenseService {
  /**
   * Calls the createSplitExpense Cloud Function securely.
   */
  static async createSplitExpense(request: CreateSplitExpenseRequest): Promise<CreateSplitExpenseResponse> {
    const splitExpenseFn = httpsCallable<CreateSplitExpenseRequest, CreateSplitExpenseResponse>(
      functions,
      "splitExpense"
    );

    if (import.meta.env.DEV) {
      try {
        const stored = localStorage.getItem('nukood_dev_auth_session');
        if (stored) {
          const authUser = JSON.parse(stored);
          (request as any).creatorId = authUser.userId;
        }
      } catch (e) {
        console.error("Failed to inject dev auth", e);
      }
    }

    // Attach local dateStr to avoid server timezone bugs
    const dateObj = request.date;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    request.dateStr = `${year}-${month}-${day}`;

    try {
      const result = await splitExpenseFn(request);
      return result.data;
    } catch (error: any) {
      // Re-throw so the UI can capture the HttpsError properties (e.g. code, message)
      console.error("Failed to create split expense:", error);
      throw error;
    }
  }

  /**
   * Fetches all split expenses where the given user is a participant.
   */
  static async getUserSplitExpenses(userId: string): Promise<SplitExpense[]> {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');
    
    const splitsRef = collection(db, 'splitExpenses');
    const q = query(
      splitsRef,
      where('participantIds', 'array-contains', userId)
    );

    const snapshot = await getDocs(q);
    const splits = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        splitExpenseId: doc.id,
        date: data.date?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as SplitExpense;
    });

    return splits.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  /**
   * Updates the payment status for a participant in a split expense.
   */
  static async updateSplitPaymentStatus(request: { splitExpenseId: string; participantUserId: string; paymentStatus: "PAID" | "UNPAID" }): Promise<void> {
    const updateFn = httpsCallable<any, any>(
      functions,
      "updateSplitPayment"
    );

    if (import.meta.env.DEV) {
      try {
        const stored = localStorage.getItem('nukood_dev_auth_session');
        if (stored) {
          const authUser = JSON.parse(stored);
          (request as any).callerId = authUser.userId;
        }
      } catch (e) {
        console.error("Failed to inject dev auth", e);
      }
    }

    try {
      await updateFn(request);
    } catch (error) {
      console.error("Failed to update split payment status:", error);
      throw error;
    }
  }
}
