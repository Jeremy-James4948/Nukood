import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc, Timestamp, query, orderBy, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction } from './transaction.service';

export interface FastEntry {
  fastEntryId: string;
  transactionId: string;
  displayName: string;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class FastEntryService {
  /**
   * Fetches all Fast Entries for the given user, ordered by most recently used or created.
   */
  static async getFastEntries(userId: string): Promise<FastEntry[]> {
    const fastEntriesRef = collection(db, 'users', userId, 'fastEntries');
    // For MVP, just order by usageCount or createdAt
    const q = query(fastEntriesRef, orderBy('usageCount', 'desc'));
    const snap = await getDocs(q);

    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        lastUsedAt: data.lastUsedAt?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as FastEntry;
    });
  }

  /**
   * Retrieves the historical Transaction data linked to a Fast Entry.
   * This is used to populate a new transaction form without duplicating data in the Fast Entry itself.
   */
  static async getFastEntrySource(userId: string, transactionId: string): Promise<Transaction | null> {
    const txRef = doc(db, 'users', userId, 'transactions', transactionId);
    const snap = await getDoc(txRef);
    
    if (!snap.exists()) return null;
    
    const data = snap.data();
    return {
      ...data,
      date: data.date?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Transaction;
  }

  /**
   * Increments the usage count and updates the lastUsedAt timestamp.
   * Called whenever a new transaction is successfully created via a Fast Entry.
   */
  static async recordUsage(userId: string, fastEntryId: string): Promise<void> {
    const feRef = doc(db, 'users', userId, 'fastEntries', fastEntryId);
    const now = Timestamp.now();
    
    await updateDoc(feRef, {
      usageCount: increment(1),
      lastUsedAt: now,
      updatedAt: now
    });
  }

  /**
   * Deletes a Fast Entry. 
   * CRITICAL: This explicitly does NOT delete the original transaction, adhering to the architecture.
   */
  static async deleteFastEntry(userId: string, fastEntryId: string): Promise<void> {
    const feRef = doc(db, 'users', userId, 'fastEntries', fastEntryId);
    await deleteDoc(feRef);
  }
  /**
   * Updates a Fast Entry (e.g. changing its displayName).
   */
  static async updateFastEntry(userId: string, fastEntryId: string, updates: Partial<FastEntry>): Promise<void> {
    const feRef = doc(db, 'users', userId, 'fastEntries', fastEntryId);
    await updateDoc(feRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  }
}
