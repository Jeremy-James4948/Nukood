import { collection, doc, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { TRANSACTION_TEMPLATES, TransactionTemplate } from '../constants/templates';

export class TemplateService {
  /**
   * Retrieves all templates for the given user.
   */
  static async getTemplates(userId: string): Promise<TransactionTemplate[]> {
    const templatesRef = collection(db, 'users', userId, 'templates');
    const snap = await getDocs(templatesRef);

    if (snap.empty) {
      // If no templates exist, initialize the defaults
      try {
        return await this.seedDefaultTemplates(userId);
      } catch (err) {
        console.error("Failed to seed default templates:", err);
        return [];
      }
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
   * Seeds the database with the application's default templates for a new user.
   */
  private static async seedDefaultTemplates(userId: string): Promise<TransactionTemplate[]> {
    const templatesRef = collection(db, 'users', userId, 'templates');
    const batch = writeBatch(db);
    const createdTemplates: TransactionTemplate[] = [];
    const now = Timestamp.now();

    const defaultTemplates = Object.values(TRANSACTION_TEMPLATES);

    for (const tpl of defaultTemplates) {
      const docRef = doc(templatesRef, tpl.templateId);
      const newTemplate = {
        ...tpl,
        createdAt: now,
        updatedAt: now
      };
      batch.set(docRef, newTemplate);
      createdTemplates.push({
        ...newTemplate,
        createdAt: newTemplate.createdAt.toDate(),
        updatedAt: newTemplate.updatedAt.toDate()
      });
    }

    await batch.commit();
    return createdTemplates;
  }

  /**
   * Forces an update of all templates in the database to match the current
   * hardcoded TRANSACTION_TEMPLATES configurations. Useful for schema migrations.
   */
  static async syncDefaultTemplates(userId: string): Promise<void> {
    const templatesRef = collection(db, 'users', userId, 'templates');
    const batch = writeBatch(db);
    const now = Timestamp.now();

    const defaultTemplates = Object.values(TRANSACTION_TEMPLATES);

    for (const tpl of defaultTemplates) {
      const docRef = doc(templatesRef, tpl.templateId);
      batch.set(docRef, {
        ...tpl,
        updatedAt: now
      }, { merge: true }); // Merge true so we don't overwrite createdAt if it exists
    }

    await batch.commit();
    console.log(`Successfully synced templates for user: ${userId}`);
  }
}
