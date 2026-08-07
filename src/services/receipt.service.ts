import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { Timestamp } from 'firebase/firestore';

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
    userId: string,
    transactionId: string,
    fieldName: string,
    file: File
  ): Promise<ReceiptMetadata> {
    const storagePath = `users/${userId}/receipts/${transactionId}_${fieldName}`;
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
    const storageRef = ref(storage, storagePath);
    return await getDownloadURL(storageRef);
  }
}
