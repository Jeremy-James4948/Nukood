import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";

interface UpdatePaymentPayload {
  splitExpenseId: string;
  participantUserId: string;
  paymentStatus: "PAID" | "UNPAID";
}

export const updateSplitPaymentStatus = async (request: CallableRequest<UpdatePaymentPayload>) => {
  const data = request.data;

  // 1. Authentication
  let callerId = request.auth?.uid;
  if (!callerId && process.env.FUNCTIONS_EMULATOR === "true") {
    callerId = (data as any).callerId || "dev_jeremy";
  }

  if (!callerId) {
    throw new HttpsError("unauthenticated", "You must be logged in to update payment status.");
  }

  // 2. Input Validation
  if (typeof data.splitExpenseId !== "string" || data.splitExpenseId.trim() === "") {
    throw new HttpsError("invalid-argument", "Valid splitExpenseId is required.");
  }
  if (typeof data.participantUserId !== "string" || data.participantUserId.trim() === "") {
    throw new HttpsError("invalid-argument", "Valid participantUserId is required.");
  }
  if (data.paymentStatus !== "PAID" && data.paymentStatus !== "UNPAID") {
    throw new HttpsError("invalid-argument", "paymentStatus must be PAID or UNPAID.");
  }

  const db = admin.firestore();
  const splitRef = db.collection("splitExpenses").doc(data.splitExpenseId);

  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(splitRef);
      if (!doc.exists) {
        throw new HttpsError("not-found", "Split expense not found.");
      }

      const splitData = doc.data()!;
      
      // 3. Authorization (Only creator can modify)
      if (splitData.creatorId !== callerId) {
        throw new HttpsError("permission-denied", "Only the creator can modify payment statuses.");
      }

      // 4. Edge case: Creator cannot be marked unpaid
      if (data.participantUserId === splitData.creatorId && data.paymentStatus === "UNPAID") {
        throw new HttpsError("invalid-argument", "The creator is always PAID.");
      }

      // 5. Find participant
      const participants = splitData.participants || [];
      const participantIndex = participants.findIndex((p: any) => p.userId === data.participantUserId);
      
      if (participantIndex === -1) {
        throw new HttpsError("invalid-argument", "User is not a participant in this split expense.");
      }

      // 6. Update participant
      participants[participantIndex].paymentStatus = data.paymentStatus;

      // 7. Commit
      transaction.update(splitRef, { 
        participants,
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    logger.info(`Successfully updated payment status for ${data.participantUserId} in ${data.splitExpenseId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error updating payment status", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "An error occurred while updating payment status.");
  }
};
