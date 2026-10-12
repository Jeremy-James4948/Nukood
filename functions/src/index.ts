import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";
import { createSplitExpense } from "./split/createSplitExpense";
import { updateSplitPaymentStatus } from "./split/updateSplitPaymentStatus";
import { createGroupTransaction } from "./group/createGroupTransaction";
import { deleteGroupTransaction as deleteGroupTransactionImpl } from "./group/deleteGroupTransaction";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export the Split Expense endpoint
export const splitExpense = onCall({ region: "us-central1" }, createSplitExpense);
export const updateSplitPayment = onCall({ region: "us-central1" }, updateSplitPaymentStatus);
export const groupTransaction = onCall({ region: "us-central1" }, createGroupTransaction);
export const deleteGroupTransaction = onCall({ region: "us-central1" }, deleteGroupTransactionImpl);
