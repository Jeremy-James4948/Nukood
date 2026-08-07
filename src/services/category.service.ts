import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORY_COLORS } from '../constants';

export interface Category {
  categoryId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  displayOrder: number;
  templateId: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_CATEGORIES: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  { categoryId: 'groceries', name: 'Groceries', description: 'Supermarket and grocery purchases', icon: 'ShoppingBag', color: CATEGORY_COLORS.Groceries, displayOrder: 1, templateId: 'groceries_template', isDefault: true },
  { categoryId: 'food', name: 'Food', description: 'Meals, snacks, and restaurants', icon: 'Coffee', color: CATEGORY_COLORS.Food, displayOrder: 2, templateId: 'food_template', isDefault: true },
  { categoryId: 'transport', name: 'Transport', description: 'Travel and commuting', icon: 'Train', color: CATEGORY_COLORS.Transport, displayOrder: 3, templateId: 'transport_template', isDefault: true },
  { categoryId: 'house', name: 'House', description: 'Household and living expenses', icon: 'Home', color: CATEGORY_COLORS.House, displayOrder: 4, templateId: 'house_template', isDefault: true },
  { categoryId: 'personal', name: 'Personal', description: 'Personal shopping and lifestyle', icon: 'User', color: CATEGORY_COLORS.Personal, displayOrder: 5, templateId: 'personal_template', isDefault: true },
  { categoryId: 'entertainment', name: 'Entertainment', description: 'Leisure and outings', icon: 'Film', color: CATEGORY_COLORS.Entertainment, displayOrder: 6, templateId: 'entertainment_template', isDefault: true },
  { categoryId: 'medical', name: 'Medical', description: 'Healthcare and pharmacy', icon: 'Heart', color: CATEGORY_COLORS.Medical, displayOrder: 7, templateId: 'medical_template', isDefault: true },
  { categoryId: 'college', name: 'College', description: 'Education and campus life', icon: 'Book', color: CATEGORY_COLORS.College, displayOrder: 8, templateId: 'college_template', isDefault: true },
  { categoryId: 'balance_added', name: 'Balance Added', description: 'Income and incoming money', icon: 'PlusCircle', color: CATEGORY_COLORS.BalanceAdded, displayOrder: 9, templateId: 'balance_added_template', isDefault: true },
];

export class CategoryService {
  /**
   * Retrieves all categories for the given user, ordered by displayOrder.
   */
  static async getCategories(userId: string): Promise<Category[]> {
    const categoriesRef = collection(db, 'users', userId, 'categories');
    const q = query(categoriesRef, orderBy('displayOrder', 'asc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      // If no categories exist, initialize the defaults
      try {
        return await this.seedDefaultCategories(userId);
      } catch (err) {
        console.error("Failed to seed default categories:", err);
        return [];
      }
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
   * Seeds the database with the application's default categories for a new user.
   */
  private static async seedDefaultCategories(userId: string): Promise<Category[]> {
    const categoriesRef = collection(db, 'users', userId, 'categories');
    const batch = writeBatch(db);
    const createdCategories: Category[] = [];
    const now = Timestamp.now();

    for (const cat of DEFAULT_CATEGORIES) {
      const docRef = doc(categoriesRef, cat.categoryId);
      const newCategory = {
        ...cat,
        createdAt: now,
        updatedAt: now
      };
      batch.set(docRef, newCategory);
      createdCategories.push({
        ...newCategory,
        createdAt: newCategory.createdAt.toDate(),
        updatedAt: newCategory.updatedAt.toDate()
      });
    }

    await batch.commit();
    return createdCategories.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  /**
   * Updates an existing category.
   */
  static async updateCategory(userId: string, categoryId: string, updates: Partial<Category>): Promise<void> {
    const docRef = doc(db, 'users', userId, 'categories', categoryId);
    
    // Ensure we don't accidentally update read-only fields if they are passed
    const safeUpdates = { ...updates, updatedAt: Timestamp.now() };
    delete safeUpdates.categoryId;
    delete safeUpdates.createdAt;

    await updateDoc(docRef, safeUpdates);
  }

  /**
   * Deletes a category.
   */
  static async deleteCategory(userId: string, categoryId: string): Promise<void> {
    const docRef = doc(db, 'users', userId, 'categories', categoryId);
    await deleteDoc(docRef);
  }

  /**
   * Forces an update of all default categories in the database to match the current
   * hardcoded DEFAULT_CATEGORIES (primarily used for pushing color updates).
   */
  static async syncDefaultCategories(userId: string): Promise<void> {
    const categoriesRef = collection(db, 'users', userId, 'categories');
    const batch = writeBatch(db);
    const now = Timestamp.now();

    for (const cat of DEFAULT_CATEGORIES) {
      const docRef = doc(categoriesRef, cat.categoryId);
      batch.set(docRef, {
        ...cat,
        updatedAt: now
      }, { merge: true }); // Merge true so we don't overwrite user customizations like displayOrder if possible, though this will overwrite colors.
    }

    await batch.commit();
    console.log(`Successfully synced categories for user: ${userId}`);
  }
}
