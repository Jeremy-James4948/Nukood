import { doc, collection, getDoc, getDocs, query, where, writeBatch, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { CategoryService } from './category.service';
import { calculateCycleEndDate } from './onboarding.service';

export interface Group {
  groupId: string;
  name: string;
  createdBy: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  userId: string;
  role: "ADMIN" | "MEMBER";
  status: "ACTIVE";
  joinedAt: Date;
}

export interface CreateGroupOptions {
  name: string;
  description?: string;
  creatorId: string;
  currency?: string;
  budget?: number;
  cycleStartDate?: Date;
  cycleLength?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY';
  members?: string[];
}

export class GroupService {
  /**
   * Fetches a group by its ID.
   */
  static async getGroup(groupId: string): Promise<Group | null> {
    const docRef = doc(db, 'groups', groupId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    
    const data = snap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as Group;
  }

  /**
   * Fetches all groups a user is a member of.
   */
  static async getUserGroups(userId: string): Promise<Group[]> {
    const groupsRef = collection(db, 'groups');
    const q = query(groupsRef, where('memberIds', 'array-contains', userId));
    const snap = await getDocs(q);
    
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Group;
    });
  }

  /**
   * Fetches all active members of a group.
   */
  static async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const membersRef = collection(db, 'groups', groupId, 'members');
    const q = query(membersRef, where('status', '==', 'ACTIVE'));
    const snap = await getDocs(q);

    return snap.docs.map(d => {
      const data = d.data();
      return {
        userId: data.userId || d.id,
        role: data.role || 'MEMBER',
        status: data.status || 'ACTIVE',
        joinedAt: data.joinedAt?.toDate ? data.joinedAt.toDate() : new Date(),
      } as GroupMember;
    });
  }

  /**
   * Creates a new Group with the creator as the first ADMIN.
   */
  static async createGroup(options: CreateGroupOptions): Promise<Group> {
    const { name, description, creatorId, currency = 'INR', budget = 0, cycleStartDate = new Date(), cycleLength = 'MONTHLY', members = [] } = options;
    const groupId = uuidv4();
    const batch = writeBatch(db);

    const groupRef = doc(db, 'groups', groupId);

    const uniqueMembers = Array.from(new Set([creatorId, ...members]));

    const newGroup: any = {
      groupId,
      name,
      createdBy: creatorId,
      memberIds: uniqueMembers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (description) newGroup.description = description;

    batch.set(groupRef, newGroup);

    uniqueMembers.forEach(userId => {
      const memberRef = doc(db, 'groups', groupId, 'members', userId);
      const newMember = {
        userId,
        role: userId === creatorId ? "ADMIN" : "MEMBER",
        status: "ACTIVE",
        joinedAt: serverTimestamp(),
      };
      batch.set(memberRef, newMember);
    });

    // --- PHASE 4A: Initialize Group Financial Settings and First Cycle ---
    const settingsRef = doc(db, 'groups', groupId, 'settings', 'financial');
    
    const startDate = new Date(cycleStartDate);
    startDate.setHours(0, 0, 0, 0);
    
    let endDate: Date;
    if (cycleLength === 'WEEKLY') {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
    } else if (cycleLength === 'BIWEEKLY') {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 13);
    } else {
      endDate = calculateCycleEndDate(startDate);
    }
    
    const cycleLengthDays = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    const newSettings = {
      monthlyBudget: budget,
      carryForwardEnabled: true,
      currency,
      budgetThresholds: { comfortable: 90, onTrack: 105, tight: 115 },
      cycleConfiguration: {
        startDate: Timestamp.fromDate(startDate),
        cycleLengthDays: cycleLengthDays,
        autoCreateNextCycle: true,
      },
      hiddenCategoryIds: [],
      isOnboarded: true,
    };
    batch.set(settingsRef, newSettings);

    let categorySummary: Record<string, any> = {};
    try {
      const allCategories = await CategoryService.getAllCategories();
      allCategories.forEach((cat) => {
        categorySummary[cat.categoryId] = {
          totalSpent: 0,
          transactionCount: 0,
          lastTransactionAt: null,
        };
      });
    } catch (err) {
      console.warn('[GroupService] Could not load categories for categorySummary. Initializing empty.', err);
    }

    const cycleId = `cycle_${startDate.getFullYear()}_${(startDate.getMonth() + 1).toString().padStart(2, '0')}_${startDate.getDate().toString().padStart(2, '0')}`;
    const cycleRef = doc(db, 'groups', groupId, 'financialCycles', cycleId);
    
    const cycleName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstCycleData = {
      cycleName,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      cycleLengthDays,
      budgetSnapshot: {
        monthlyBudget: budget,
        carryForward: 0,
        availableBalance: budget,
      },
      totalSpent: 0,
      transactionCount: 0,
      categorySummary,
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(cycleRef, firstCycleData);
    // ---------------------------------------------------------------------

    await batch.commit();

    return {
      ...newGroup,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Group;
  }
}
