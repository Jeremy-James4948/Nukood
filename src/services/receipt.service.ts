import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { FinancialScope, getScopePath } from '../types/FinancialScope';

export interface ReceiptMetadata {
  attached: boolean;
  storagePath: string | null;
  fileName: string | null;
  fileType: string | null;
  uploadedAt: Timestamp | null;
}

export class ReceiptService {
  /**
   * Uploads a file to Firebase Storage and returns its metadata
   */
  static async uploadReceipt(
    scope: FinancialScope,
    transactionId: string,
    fieldName: string,
    file: File
  ): Promise<ReceiptMetadata> {
    const [scopeType, scopeId] = getScopePath(scope);
    const storagePath = `${scopeType}/${scopeId}/receipts/${transactionId}_${fieldName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file);

    return {
      attached: true,
      storagePath,
      fileName: file.name,
      fileType: file.type,
      uploadedAt: Timestamp.now()
    };
  }

  /**
   * Deletes a receipt from Firebase Storage
   */
  static async deleteReceipt(storagePath: string): Promise<void> {
    const storageRef = ref(storage, storagePath);
    try {
      await deleteObject(storageRef);
    } catch (error) {
      console.error(`Failed to delete receipt at ${storagePath}`, error);
    }
  }

  /**
   * Gets a fresh download URL for a receipt
   */
  static async getReceiptUrl(storagePath: string): Promise<string> {
    if (!storagePath) return '';
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      return storagePath;
    }
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
  }
}
