"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSplitPaymentStatus = void 0;
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const updateSplitPaymentStatus = async (request) => {
    const data = request.data;
    // 1. Authentication
    let callerId = request.auth?.uid;
    if (!callerId && process.env.FUNCTIONS_EMULATOR === "true") {
        callerId = data.callerId || "dev_jeremy";
    }
    if (!callerId) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to update payment status.");
    }
    // 2. Input Validation
    if (typeof data.splitExpenseId !== "string" || data.splitExpenseId.trim() === "") {
        throw new https_1.HttpsError("invalid-argument", "Valid splitExpenseId is required.");
    }
    if (typeof data.participantUserId !== "string" || data.participantUserId.trim() === "") {
        throw new https_1.HttpsError("invalid-argument", "Valid participantUserId is required.");
    }
    if (data.paymentStatus !== "PAID" && data.paymentStatus !== "UNPAID") {
        throw new https_1.HttpsError("invalid-argument", "paymentStatus must be PAID or UNPAID.");
    }
    const db = admin.firestore();
    const splitRef = db.collection("splitExpenses").doc(data.splitExpenseId);
    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(splitRef);
            if (!doc.exists) {
                throw new https_1.HttpsError("not-found", "Split expense not found.");
            }
            const splitData = doc.data();
            // 3. Authorization (Only creator can modify)
            if (splitData.creatorId !== callerId) {
                throw new https_1.HttpsError("permission-denied", "Only the creator can modify payment statuses.");
            }
            // 4. Edge case: Creator cannot be marked unpaid
            if (data.participantUserId === splitData.creatorId && data.paymentStatus === "UNPAID") {
                throw new https_1.HttpsError("invalid-argument", "The creator is always PAID.");
            }
            // 5. Find participant
            const participants = splitData.participants || [];
            const participantIndex = participants.findIndex((p) => p.userId === data.participantUserId);
            if (participantIndex === -1) {
                throw new https_1.HttpsError("invalid-argument", "User is not a participant in this split expense.");
            }
            // 6. Update participant
            participants[participantIndex].paymentStatus = data.paymentStatus;
            // 7. Commit
            transaction.update(splitRef, {
                participants,
                updatedAt: firestore_1.FieldValue.serverTimestamp()
            });
        });
        logger.info(`Successfully updated payment status for ${data.participantUserId} in ${data.splitExpenseId}`);
        return { success: true };
    }
    catch (error) {
        logger.error("Error updating payment status", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "An error occurred while updating payment status.");
    }
};
exports.updateSplitPaymentStatus = updateSplitPaymentStatus;
//# sourceMappingURL=updateSplitPaymentStatus.js.map