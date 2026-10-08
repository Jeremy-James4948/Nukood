import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// Mirrored from developmentAuthProvider.ts for prototype verification
const DEV_USERS: Record<string, { userId: string; username: string }> = {
  'dev_jj': { userId: 'dev_jj', username: 'JJ' },
  'dev_jeremy': { userId: 'dev_jeremy', username: 'jeremy' },
  'dev_james': { userId: 'dev_james', username: 'james' },
  'dev_variath': { userId: 'dev_variath', username: 'variath' },
  'demo-user-1': { userId: 'demo-user-1', username: 'demo' }
};

interface SplitParticipantInput {
  userId: string;
  shareAmount?: number;
}

interface CreateSplitPayload {
  title: string;
  totalAmount: number;
  date: string | { _seconds: number; _nanoseconds: number }; // Handle raw timestamp passing
  dateStr?: string; // Client's YYYY-MM-DD
  categoryId: string;
  templateId: string;
  transactionDetails: Record<string, any>;
  participants: SplitParticipantInput[];
  splitMethod: "EQUAL" | "MANUAL";
  notes?: string;
  receiptUrl?: string;
}

export const createSplitExpense = async (request: CallableRequest<CreateSplitPayload>) => {
  const data = request.data;

  // 1. Authentication
  let creatorId = request.auth?.uid;

  // Local development override for prototype testing
  if (!creatorId && process.env.FUNCTIONS_EMULATOR === "true") {
    creatorId = (data as any).creatorId || "dev_jj";
  }

  if (!creatorId) {
    throw new HttpsError("unauthenticated", "You must be logged in to create a split expense.");
  }

  // 2. Input Validation
  if (typeof data.title !== "string" || data.title.trim() === "") {
    throw new HttpsError("invalid-argument", "Title must be a non-empty string.");
  }
  if (typeof data.totalAmount !== "number" || !Number.isFinite(data.totalAmount) || data.totalAmount <= 0) {
    throw new HttpsError("invalid-argument", "Total amount must be a positive number.");
  }
  if (typeof data.categoryId !== "string" || data.categoryId.trim() === "") {
    throw new HttpsError("invalid-argument", "Category ID is required.");
  }
  if (typeof data.templateId !== "string" || data.templateId.trim() === "") {
    throw new HttpsError("invalid-argument", "Template ID is required.");
  }
  if (!Array.isArray(data.participants) || data.participants.length < 1 || data.participants.length > 10) {
    throw new HttpsError("invalid-argument", "Participants must be an array of 1 to 10 users.");
  }
  if (data.splitMethod !== "EQUAL" && data.splitMethod !== "MANUAL") {
    throw new HttpsError("invalid-argument", "Split method must be EQUAL or MANUAL.");
  }

  // Parse Date
  let txDate: Date;
  if (typeof data.date === "string") {
    txDate = new Date(data.date);
  } else if (data.date && typeof data.date === "object" && "_seconds" in data.date) {
    txDate = new Date(data.date._seconds * 1000);
  } else {
    throw new HttpsError("invalid-argument", "Invalid date format.");
  }
  
  if (isNaN(txDate.getTime())) {
    throw new HttpsError("invalid-argument", "Invalid date value.");
  }

  // 3. Participant Verification
  const participantIds = new Set<string>();
  let creatorIncluded = false;
  
  const db = admin.firestore();
  const fetchedUsernames: Record<string, string> = {};

  for (const p of data.participants) {
    if (typeof p.userId !== "string" || p.userId.trim() === "") {
      throw new HttpsError("invalid-argument", "Invalid participant userId.");
    }
    if (participantIds.has(p.userId)) {
      throw new HttpsError("invalid-argument", `Duplicate participant found: ${p.userId}`);
    }
    if (data.splitMethod === "MANUAL") {
      if (typeof p.shareAmount !== "number" || !Number.isFinite(p.shareAmount) || p.shareAmount < 0) {
        throw new HttpsError("invalid-argument", `Invalid share amount for user ${p.userId}`);
      }
    }
    
    // Fetch real profile name from DB
    const settingsSnap = await db.collection("users").doc(p.userId).collection("settings").doc("financial").get();
    if (settingsSnap.exists) {
      fetchedUsernames[p.userId] = settingsSnap.data()?.profileName || p.userId;
    } else if (DEV_USERS[p.userId]) {
      fetchedUsernames[p.userId] = DEV_USERS[p.userId].username;
    } else {
      throw new HttpsError("not-found", `User ${p.userId} does not exist.`);
    }

    participantIds.add(p.userId);
    if (p.userId === creatorId) creatorIncluded = true;
  }

  if (!creatorIncluded) {
    throw new HttpsError("invalid-argument", "The creator must be included as a participant.");
  }

  // 4. Share Calculation & Validation
  const finalParticipants: Array<{ userId: string; username: string; shareAmount: number }> = [];

  if (data.splitMethod === "EQUAL") {
    // Math logic for EQUAL split using minor units (cents/paise)
    const totalMinor = Math.round(data.totalAmount * 100);
    const numParticipants = data.participants.length;
    const baseShareMinor = Math.floor(totalMinor / numParticipants);
    let remainder = totalMinor % numParticipants;

    for (let i = 0; i < numParticipants; i++) {
      const p = data.participants[i];
      let shareMinor = baseShareMinor;
      if (remainder > 0) {
        shareMinor += 1;
        remainder -= 1;
      }
      finalParticipants.push({
        userId: p.userId,
        username: fetchedUsernames[p.userId],
        shareAmount: shareMinor / 100
      });
    }
  } else {
    // MANUAL validation
    let sumMinor = 0;
    for (const p of data.participants) {
      const shareMinor = Math.round(p.shareAmount! * 100);
      sumMinor += shareMinor;
      finalParticipants.push({
        userId: p.userId,
        username: fetchedUsernames[p.userId],
        shareAmount: shareMinor / 100
      });
    }
    const totalMinor = Math.round(data.totalAmount * 100);
    if (sumMinor !== totalMinor) {
      throw new HttpsError("invalid-argument", `Sum of manual shares (${sumMinor / 100}) does not equal total amount (${totalMinor / 100}).`);
    }
  }

  // 5. Active Cycle Retrieval
  const participantContexts: Array<{
    userId: string;
    username: string;
    shareAmount: number;
    activeCycleId: string;
    transactionId: string;
  }> = [];

  for (const fp of finalParticipants) {
    const cyclesSnap = await db.collection("users").doc(fp.userId).collection("financialCycles")
      .where("status", "==", "ACTIVE")
      .limit(1)
      .get();

    if (cyclesSnap.empty) {
      throw new HttpsError("failed-precondition", `Participant ${fp.userId} has no active financial cycle.`);
    }

    participantContexts.push({
      ...fp,
      activeCycleId: cyclesSnap.docs[0].id,
      transactionId: db.collection("users").doc(fp.userId).collection("transactions").doc().id
    });
  }

  // 6. Generate IDs
  const splitExpenseRef = db.collection("splitExpenses").doc();
  const splitExpenseId = splitExpenseRef.id;

  let year: number, month: string, day: string, dateStr: string;
  
  if (data.dateStr && /^\d{4}-\d{2}-\d{2}$/.test(data.dateStr)) {
    // If client provided exact local date string, use it
    dateStr = data.dateStr;
    const parts = dateStr.split('-');
    year = parseInt(parts[0], 10);
    // JS dates are 0-indexed for months, but we just use txDate for dayName mostly
  } else {
    year = txDate.getFullYear();
    month = String(txDate.getMonth() + 1).padStart(2, '0');
    day = String(txDate.getDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
  }
  
  const journalId = `journal_${dateStr.replace(/-/g, '_')}`;
  
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Ensure we get the day of the week based on the local date representation, not UTC
  const flooredDate = new Date(`${dateStr}T00:00:00`); // Local midnight
  const dayName = days[flooredDate.getDay()];
  const dayNumber = flooredDate.getDate();

  const now = Timestamp.now();
  const txTimestamp = Timestamp.fromDate(txDate);
  const journalTimestamp = Timestamp.fromDate(flooredDate);

  // 7. Atomic Batch Write
  const batch = db.batch();

  // 7a. Write Shared Split Document
  const sharedSplitData = {
    splitExpenseId,
    creatorId,
    title: data.title,
    notes: data.notes || null,
    totalAmount: data.totalAmount,
    date: txTimestamp,
    categoryId: data.categoryId,
    templateId: data.templateId,
    splitMethod: data.splitMethod,
    participantIds: Array.from(participantIds),
    participants: participantContexts.map(pc => ({
      userId: pc.userId,
      username: pc.username,
      shareAmount: pc.shareAmount,
      transactionId: pc.transactionId,
      paymentStatus: pc.userId === creatorId ? "PAID" : "UNPAID"
    })),
    receiptUrl: data.receiptUrl || null,
    createdAt: now,
    updatedAt: now
  };
  
  // Remove undefined values cleanly
  Object.keys(sharedSplitData).forEach(k => {
    if ((sharedSplitData as any)[k] === undefined) {
      delete (sharedSplitData as any)[k];
    }
  });

  batch.set(splitExpenseRef, sharedSplitData);

  // 7b. Write Participant Transactions & Aggregates
  for (const pc of participantContexts) {
    // Transaction
    const txRef = db.collection("users").doc(pc.userId).collection("transactions").doc(pc.transactionId);
    const txData = {
      transactionId: pc.transactionId,
      userId: pc.userId,
      cycleId: pc.activeCycleId,
      journalId,
      categoryId: data.categoryId,
      templateId: data.templateId,
      transactionType: "EXPENSE",
      title: data.title,
      amount: pc.shareAmount,
      date: txTimestamp,
      transactionDetails: data.transactionDetails || {},
      splitExpenseId,
      createdAt: now,
      updatedAt: now
    };
    batch.set(txRef, txData);

    // Journal
    const journalRef = db.collection("users").doc(pc.userId)
      .collection("financialCycles").doc(pc.activeCycleId)
      .collection("dailyJournals").doc(journalId);
    
    const journalUpdates: any = {
      journalId,
      cycleId: pc.activeCycleId,
      date: journalTimestamp,
      dayName,
      dayNumber,
      transactionCount: FieldValue.increment(1),
      totalSpent: FieldValue.increment(pc.shareAmount),
      createdAt: now // merge will create if missing, or update
    };
    
    journalUpdates[`categorySummary.${data.categoryId}.totalSpent`] = FieldValue.increment(pc.shareAmount);
    journalUpdates[`categorySummary.${data.categoryId}.transactionCount`] = FieldValue.increment(1);
    journalUpdates[`categorySummary.${data.categoryId}.lastTransactionAt`] = now;
    
    // We have to use merge for the deeply nested categorySummary but Firestore's {merge:true} works on top level maps.
    // Instead, passing dot-notation strings in set with merge doesn't always work as expected.
    // Wait, in the frontend we did:
    // journalData.categorySummary = { [categoryId]: { totalSpent: increment(amount), ... } }
    // Let's replicate exact frontend behavior:
    const journalFrontendReplication = {
      journalId,
      cycleId: pc.activeCycleId,
      date: journalTimestamp,
      dayName,
      dayNumber,
      transactionCount: FieldValue.increment(1),
      totalSpent: FieldValue.increment(pc.shareAmount),
      createdAt: now,
      categorySummary: {
        [data.categoryId]: {
          totalSpent: FieldValue.increment(pc.shareAmount),
          transactionCount: FieldValue.increment(1),
          lastTransactionAt: now
        }
      }
    };
    batch.set(journalRef, journalFrontendReplication, { merge: true });

    // Cycle
    const cycleRef = db.collection("users").doc(pc.userId).collection("financialCycles").doc(pc.activeCycleId);
    const cycleUpdates: Record<string, any> = {
      totalSpent: FieldValue.increment(pc.shareAmount),
      transactionCount: FieldValue.increment(1),
      updatedAt: now
    };
    cycleUpdates[`categorySummary.${data.categoryId}.totalSpent`] = FieldValue.increment(pc.shareAmount);
    cycleUpdates[`categorySummary.${data.categoryId}.transactionCount`] = FieldValue.increment(1);
    cycleUpdates[`categorySummary.${data.categoryId}.lastTransactionAt`] = now;
    
    batch.update(cycleRef, cycleUpdates);
  }

  // Commit
  await batch.commit();

  logger.info(`Successfully created SplitExpense ${splitExpenseId}`);

  return {
    success: true,
    splitExpenseId,
    participants: participantContexts.map(pc => ({
      userId: pc.userId,
      transactionId: pc.transactionId,
      shareAmount: pc.shareAmount
    }))
  };
};
