import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

interface DeleteGroupTransactionPayload {
  groupId: string;
  transactionId: string;
}

export const deleteGroupTransaction = async (request: CallableRequest<DeleteGroupTransactionPayload>) => {
  const data = request.data;
  const db = admin.firestore();

  // 1. Authentication
  let callerId = request.auth?.uid;

  if (!callerId && process.env.FUNCTIONS_EMULATOR === "true") {
    // Strictly emulator-only fallback for mock user during local development.
    // In production, FUNCTIONS_EMULATOR is undefined and real auth is enforced.
    callerId = (data as any).creatorId || "dev_jj";
  }

  if (!callerId) {
    throw new HttpsError("unauthenticated", "You must be logged in to delete a group transaction.");
  }

  // 2. Input Validation
  if (typeof data.groupId !== "string" || data.groupId.trim() === "") {
    throw new HttpsError("invalid-argument", "Group ID is required.");
  }
  if (typeof data.transactionId !== "string" || data.transactionId.trim() === "") {
    throw new HttpsError("invalid-argument", "Transaction ID is required.");
  }

  // 3. Verify Active Membership & ADMIN role from Firestore source of truth
  const memberSnap = await db.collection("groups").doc(data.groupId).collection("members").doc(callerId).get();
  if (!memberSnap.exists) {
    throw new HttpsError("permission-denied", "You must be an active member of the group.");
  }
  const memberData = memberSnap.data();
  if (memberData?.role !== "ADMIN" || (memberData?.status && memberData.status !== "ACTIVE")) {
    throw new HttpsError("permission-denied", "Only active group admins can delete group transactions.");
  }

  // 4. Atomic Transaction for Accounting Reversal & Transaction Deletion
  let receiptPathToDelete: string | null = null;

  await db.runTransaction(async (t) => {
    const txRef = db.collection("groups").doc(data.groupId).collection("transactions").doc(data.transactionId);
    
    // READ 1: Transaction document
    const txSnap = await t.get(txRef);
    if (!txSnap.exists) {
      throw new HttpsError("not-found", "Transaction not found or already deleted.");
    }
    const txData = txSnap.data()!;
    
    const { amount, transactionType, categoryId, cycleId, journalId, transactionDetails } = txData;
    if (typeof amount !== "number" || !Number.isFinite(amount)) {
      throw new HttpsError("failed-precondition", "Transaction has an invalid amount.");
    }
    if (!cycleId) {
      throw new HttpsError("failed-precondition", "Transaction is missing associated cycleId.");
    }
    if (!journalId) {
      throw new HttpsError("failed-precondition", "Transaction is missing associated journalId.");
    }

    const isExpense = transactionType === "EXPENSE";

    // READ 2 & 3: Cycle and Journal documents (Must be read before any writes)
    const cycleRef = db.collection("groups").doc(data.groupId).collection("financialCycles").doc(cycleId);
    const journalRef = db.collection("groups").doc(data.groupId).collection("financialCycles").doc(cycleId).collection("dailyJournals").doc(journalId);

    const cycleSnap = await t.get(cycleRef);
    if (!cycleSnap.exists) {
      throw new HttpsError("failed-precondition", `Associated financial cycle ${cycleId} not found.`);
    }

    const journalSnap = await t.get(journalRef);
    if (!journalSnap.exists) {
      throw new HttpsError("failed-precondition", `Associated daily journal ${journalId} not found.`);
    }

    const cycleData = cycleSnap.data()!;
    const journalData = journalSnap.data()!;

    // Prepare Cycle Reversal Updates
    const cycleUpdates: Record<string, any> = {
      transactionCount: cycleData.transactionCount && cycleData.transactionCount > 0 ? FieldValue.increment(-1) : 0,
      updatedAt: Timestamp.now()
    };

    if (isExpense) {
      cycleUpdates.totalSpent = FieldValue.increment(-amount);
      if (categoryId && cycleData.categorySummary && cycleData.categorySummary[categoryId]) {
        cycleUpdates[`categorySummary.${categoryId}.totalSpent`] = FieldValue.increment(-amount);
        cycleUpdates[`categorySummary.${categoryId}.transactionCount`] = FieldValue.increment(-1);
      }
    } else {
      // INCOME reversed from budgetSnapshot.availableBalance without affecting expense totals
      cycleUpdates["budgetSnapshot.availableBalance"] = FieldValue.increment(-amount);
    }

    // Prepare Journal Reversal Updates
    const journalUpdates: Record<string, any> = {
      transactionCount: journalData.transactionCount && journalData.transactionCount > 0 ? FieldValue.increment(-1) : 0
    };

    if (isExpense) {
      journalUpdates.totalSpent = FieldValue.increment(-amount);
      if (categoryId && journalData.categorySummary && journalData.categorySummary[categoryId]) {
        journalUpdates[`categorySummary.${categoryId}.totalSpent`] = FieldValue.increment(-amount);
        journalUpdates[`categorySummary.${categoryId}.transactionCount`] = FieldValue.increment(-1);
      }
    }
    // For INCOME, journal totalSpent was incremented by 0 during creation, so no decrement needed.

    // WRITES: Delete transaction doc and update aggregates atomically
    t.delete(txRef);
    t.update(cycleRef, cycleUpdates);
    t.update(journalRef, journalUpdates);

    // Capture receipt path if attached
    if (transactionDetails?.receipt?.storagePath) {
      receiptPathToDelete = transactionDetails.receipt.storagePath;
    }
  });

  // 5. Post-Commit Receipt Cleanup
  let receiptCleanup: "success" | "skipped" | "failed" | "none" = "none";

  if (receiptPathToDelete) {
    try {
      // Verify file is not referenced by any remaining transaction in the group
      const otherTxs = await db.collection("groups").doc(data.groupId).collection("transactions")
        .where("transactionDetails.receipt.storagePath", "==", receiptPathToDelete)
        .limit(1)
        .get();

      if (!otherTxs.empty) {
        receiptCleanup = "skipped";
        logger.info(`Receipt ${receiptPathToDelete} is referenced by another transaction. Skipping storage deletion.`);
      } else {
        const bucket = getStorage().bucket();
        await bucket.file(receiptPathToDelete).delete();
        receiptCleanup = "success";
        logger.info(`Deleted receipt file: ${receiptPathToDelete}`);
      }
    } catch (err: any) {
      receiptCleanup = "failed";
      logger.warn(`Failed to delete receipt file: ${receiptPathToDelete}`, err);
    }
  }

  logger.info(`Successfully deleted Group Transaction ${data.transactionId} in group ${data.groupId} (receiptCleanup: ${receiptCleanup})`);

  return {
    success: true,
    receiptCleanup,
    warning: receiptCleanup === "failed" ? "Transaction deleted, but receipt file could not be removed from storage." : undefined
  };
};
