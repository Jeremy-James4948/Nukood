import { collection, doc, getDocs, writeBatch, Timestamp, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { GLOBAL_TEMPLATES, TransactionTemplate } from '../constants/templates';

export class TemplateService {
  /**
   * Retrieves all global templates.
   */
  static async getAllTemplates(): Promise<TransactionTemplate[]> {
    const templatesRef = collection(db, 'templates');
    const snap = await getDocs(templatesRef);

    if (snap.empty) {
      return [];
    }

    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: typeof data.createdAt?.toDate === 'function' ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
        updatedAt: typeof data.updatedAt?.toDate === 'function' ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
      } as TransactionTemplate;
    });
  }

  /**
   * Retrieves all active global templates.
   */
  static async getActiveTemplates(): Promise<TransactionTemplate[]> {
    const templatesRef = collection(db, 'templates');
    const q = query(templatesRef, where('isActive', '==', true));
    const snap = await getDocs(q);

    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: typeof data.createdAt?.toDate === 'function' ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
        updatedAt: typeof data.updatedAt?.toDate === 'function' ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
      } as TransactionTemplate;
    });
  }

  /**
   * Retrieves a specific template by its ID.
   */
  static async getTemplateById(templateId: string): Promise<TransactionTemplate | null> {
    const templates = await this.getAllTemplates();
    return templates.find(t => t.templateId === templateId) || null;
  }

  /**
   * Retrieves the template associated with a specific category ID.
   */
  static async getTemplateForCategory(categoryId: string): Promise<TransactionTemplate | null> {
    const templates = await this.getActiveTemplates();
    return templates.find(t => t.categoryId === categoryId) || null;
  }

  /**
   * Internal script to initialize or sync the global templates.
   * This is NOT user-specific. It seeds the global 'templates' collection.
   */
  static async syncGlobalTemplates(): Promise<void> {
    const templatesRef = collection(db, 'templates');
    const batch = writeBatch(db);
    const now = Timestamp.now();

    const defaultTemplates = Object.values(GLOBAL_TEMPLATES);

    for (const tpl of defaultTemplates) {
      const docRef = doc(templatesRef, tpl.templateId);
      batch.set(docRef, {
        ...tpl,
        updatedAt: now
      }, { merge: true }); // Merge true so we don't overwrite createdAt if it exists
    }

    await batch.commit();
    console.log(`Successfully synced global templates.`);
  }
}
