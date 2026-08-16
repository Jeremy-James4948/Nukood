import { collection, doc, getDocs, setDoc, Timestamp, writeBatch, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORY_COLORS } from '../constants';

export interface Category {
  categoryId: string;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  isActive: boolean;
  isSystem: boolean;
  icon: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const GLOBAL_CATEGORIES: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  { categoryId: 'cat_groceries', name: 'Groceries', type: 'EXPENSE', isActive: true, isSystem: true, icon: 'ShoppingBag', color: CATEGORY_COLORS.Groceries },
  { categoryId: 'cat_food', name: 'Food', type: 'EXPENSE', isActive: true, isSystem: true, icon: 'Coffee', color: CATEGORY_COLORS.Food },
  { categoryId: 'cat_transport', name: 'Transport', type: 'EXPENSE', isActive: true, isSystem: true, icon: 'Train', color: CATEGORY_COLORS.Transport },
  { categoryId: 'cat_house', name: 'House', type: 'EXPENSE', isActive: true, isSystem: true, icon: 'Home', color: CATEGORY_COLORS.House },
  { categoryId: 'cat_personal', name: 'Personal', type: 'EXPENSE', isActive: true, isSystem: true, icon: 'User', color: CATEGORY_COLORS.Personal },
  { categoryId: 'cat_entertainment', name: 'Entertainment', type: 'EXPENSE', isActive: true, isSystem: true, icon: 'Film', color: CATEGORY_COLORS.Entertainment },
  { categoryId: 'cat_medical', name: 'Medical', type: 'EXPENSE', isActive: true, isSystem: true, icon: 'Heart', color: CATEGORY_COLORS.Medical },
  { categoryId: 'cat_college', name: 'College', type: 'EXPENSE', isActive: true, isSystem: true, icon: 'Book', color: CATEGORY_COLORS.College },
  { categoryId: 'cat_balance_added', name: 'Balance Added', type: 'INCOME', isActive: true, isSystem: true, icon: 'PlusCircle', color: CATEGORY_COLORS.BalanceAdded },
];

export class CategoryService {
  /**
   * Retrieves all global categories.
   */
  static async getAllCategories(): Promise<Category[]> {
    const categoriesRef = collection(db, 'categories');
    const snap = await getDocs(categoriesRef);

    if (snap.empty) {
      return [];
    }

    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: typeof data.createdAt?.toDate === 'function' ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
        updatedAt: typeof data.updatedAt?.toDate === 'function' ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
      } as Category;
    });
  }

  /**
   * Retrieves all active global categories (used for rendering UI options).
   */
  static async getActiveCategories(): Promise<Category[]> {
    const categoriesRef = collection(db, 'categories');
    const q = query(categoriesRef, where('isActive', '==', true));
    const snap = await getDocs(q);

    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: typeof data.createdAt?.toDate === 'function' ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
        updatedAt: typeof data.updatedAt?.toDate === 'function' ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
      } as Category;
    });
  }

  /**
   * Internal script to initialize or sync the global categories.
   * This is NOT user-specific. It seeds the global 'categories' collection.
   */
  static async syncGlobalCategories(): Promise<void> {
    const categoriesRef = collection(db, 'categories');
    const batch = writeBatch(db);
    const now = Timestamp.now();

    for (const cat of GLOBAL_CATEGORIES) {
      const docRef = doc(categoriesRef, cat.categoryId);
      batch.set(docRef, {
        ...cat,
        updatedAt: now,
        // Only set createdAt if it doesn't already exist (merge: true handles this implicitly if we just omit it when updating, but we'll let it overwrite for now as they are system definitions)
      }, { merge: true }); 
    }

    await batch.commit();
    console.log(`Successfully synced global categories.`);
  }
}
