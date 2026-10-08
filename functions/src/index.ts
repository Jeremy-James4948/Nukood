import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";
import { createSplitExpense } from "./split/createSplitExpense";
import { updateSplitPaymentStatus } from "./split/updateSplitPaymentStatus";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export the Split Expense endpoint
export const splitExpense = onCall({ region: "us-central1" }, createSplitExpense);
export const updateSplitPayment = onCall({ region: "us-central1" }, updateSplitPaymentStatus);
