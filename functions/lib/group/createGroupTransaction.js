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
exports.createGroupTransaction = void 0;
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const createGroupTransaction = async (request) => {
    const data = request.data;
    const db = admin.firestore();
    // 1. Authentication
    let creatorId = request.auth?.uid;
    if (!creatorId && process.env.FUNCTIONS_EMULATOR === "true") {
        creatorId = data.creatorId || "dev_jj";
    }
    if (!creatorId) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to create a group transaction.");
    }
    // 2. Input Validation
    if (typeof data.groupId !== "string" || data.groupId.trim() === "") {
        throw new https_1.HttpsError("invalid-argument", "Group ID is required.");
    }
    if (typeof data.title !== "string" || data.title.trim() === "") {
        throw new https_1.HttpsError("invalid-argument", "Title must be a non-empty string.");
    }
    if (typeof data.amount !== "number" || !Number.isFinite(data.amount) || data.amount <= 0) {
        throw new https_1.HttpsError("invalid-argument", "Amount must be a positive number.");
    }
    if (typeof data.categoryId !== "string" || data.categoryId.trim() === "") {
        throw new https_1.HttpsError("invalid-argument", "Category ID is required.");
    }
    if (typeof data.templateId !== "string" || data.templateId.trim() === "") {
        throw new https_1.HttpsError("invalid-argument", "Template ID is required.");
    }
    if (data.transactionType !== "EXPENSE" && data.transactionType !== "INCOME") {
        throw new https_1.HttpsError("invalid-argument", "Transaction type must be EXPENSE or INCOME.");
    }
    // Parse Date
    let txDate;
    if (typeof data.date === "string") {
        txDate = new Date(data.date);
    }
    else if (data.date && typeof data.date === "object" && "_seconds" in data.date) {
        txDate = new Date(data.date._seconds * 1000);
    }
    else {
        throw new https_1.HttpsError("invalid-argument", "Invalid date format.");
    }
    if (isNaN(txDate.getTime())) {
        throw new https_1.HttpsError("invalid-argument", "Invalid date value.");
    }
    // 3. Verify Membership
    const memberSnap = await db.collection("groups").doc(data.groupId).collection("members").doc(creatorId).get();
    if (!memberSnap.exists) {
        throw new https_1.HttpsError("permission-denied", "You must be a member of the group to create a transaction.");
    }
    // 4. Resolve Active Cycle
    const cyclesSnap = await db.collection("groups").doc(data.groupId).collection("financialCycles")
        .where("status", "==", "ACTIVE")
        .limit(1)
        .get();
    if (cyclesSnap.empty) {
        throw new https_1.HttpsError("failed-precondition", "The group does not have an active financial cycle.");
    }
    const activeCycleId = cyclesSnap.docs[0].id;
    // 5. Generate IDs & Timestamp
    const txRef = db.collection("groups").doc(data.groupId).collection("transactions").doc();
    const transactionId = txRef.id;
    const tzOffset = data.timezoneOffset || 0;
    // Compute local time by applying the timezone offset
    // JS timezoneOffset is (UTC - Local) in minutes
    const localTimeMs = txDate.getTime() - (tzOffset * 60000);
    const localDate = new Date(localTimeMs);
    const year = localDate.getUTCFullYear();
    const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(localDate.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const journalId = `journal_${dateStr.replace(/-/g, '_')}`;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[localDate.getUTCDay()];
    const dayNumber = localDate.getUTCDate();
    const now = firestore_1.Timestamp.now();
    const txTimestamp = firestore_1.Timestamp.fromDate(txDate);
    // Compute UTC timestamp for local midnight
    const localMidnightMs = Date.UTC(year, localDate.getUTCMonth(), localDate.getUTCDate(), 0, 0, 0);
    const utcMidnightMs = localMidnightMs + (tzOffset * 60000);
    const journalTimestamp = firestore_1.Timestamp.fromMillis(utcMidnightMs);
    // 6. Atomic Batch Write
    const batch = db.batch();
    // Transaction
    const txData = {
        transactionId,
        createdBy: creatorId,
        cycleId: activeCycleId,
        journalId,
        categoryId: data.categoryId,
        templateId: data.templateId,
        transactionType: data.transactionType,
        title: data.title,
        amount: data.amount,
        date: txTimestamp,
        note: data.note || null,
        receiptUrl: data.receiptUrl || null,
        transactionDetails: data.transactionDetails || {},
        createdAt: now,
        updatedAt: now
    };
    // Clean undefined values
    Object.keys(txData).forEach(k => {
        if (txData[k] === undefined) {
            delete txData[k];
        }
    });
    batch.set(txRef, txData);
    // Journal
    const journalRef = db.collection("groups").doc(data.groupId)
        .collection("financialCycles").doc(activeCycleId)
        .collection("dailyJournals").doc(journalId);
    const isExpense = data.transactionType === "EXPENSE";
    const journalData = {
        journalId,
        cycleId: activeCycleId,
        date: journalTimestamp,
        dayName,
        dayNumber,
        transactionCount: firestore_1.FieldValue.increment(1),
        totalSpent: isExpense ? firestore_1.FieldValue.increment(data.amount) : firestore_1.FieldValue.increment(0),
        createdAt: now
    };
    if (isExpense) {
        journalData.categorySummary = {
            [data.categoryId]: {
                totalSpent: firestore_1.FieldValue.increment(data.amount),
                transactionCount: firestore_1.FieldValue.increment(1),
                lastTransactionAt: now
            }
        };
    }
    batch.set(journalRef, journalData, { merge: true });
    // Cycle
    const cycleRef = db.collection("groups").doc(data.groupId).collection("financialCycles").doc(activeCycleId);
    if (isExpense) {
        const cycleUpdates = {
            totalSpent: firestore_1.FieldValue.increment(data.amount),
            transactionCount: firestore_1.FieldValue.increment(1),
            updatedAt: now
        };
        cycleUpdates[`categorySummary.${data.categoryId}.totalSpent`] = firestore_1.FieldValue.increment(data.amount);
        cycleUpdates[`categorySummary.${data.categoryId}.transactionCount`] = firestore_1.FieldValue.increment(1);
        cycleUpdates[`categorySummary.${data.categoryId}.lastTransactionAt`] = now;
        batch.update(cycleRef, cycleUpdates);
    }
    else {
        batch.update(cycleRef, {
            'budgetSnapshot.availableBalance': firestore_1.FieldValue.increment(data.amount),
            transactionCount: firestore_1.FieldValue.increment(1),
            updatedAt: now
        });
    }
    // Commit
    await batch.commit();
    logger.info(`Successfully created Group Transaction ${transactionId} in group ${data.groupId}`);
    return {
        success: true,
        transactionId
    };
};
exports.createGroupTransaction = createGroupTransaction;
//# sourceMappingURL=createGroupTransaction.js.map