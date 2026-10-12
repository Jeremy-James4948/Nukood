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
const admin = __importStar(require("firebase-admin"));
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
admin.initializeApp({ projectId: 'my-nukood-683a0' });
const db = admin.firestore();
async function recalculateGroupTotals() {
    const groupsSnap = await db.collection('groups').get();
    for (const groupDoc of groupsSnap.docs) {
        const groupId = groupDoc.id;
        console.log(`Processing group ${groupId}...`);
        const cyclesSnap = await db.collection('groups').doc(groupId).collection('financialCycles').get();
        for (const cycleDoc of cyclesSnap.docs) {
            const cycleId = cycleDoc.id;
            // Get all transactions for this cycle
            const txsSnap = await db.collection('groups').doc(groupId).collection('transactions')
                .where('cycleId', '==', cycleId).get();
            let cycleTotalSpent = 0;
            let cycleTxCount = 0;
            let categorySummary = {};
            // Calculate sums per journal
            const journalSums = {};
            for (const tx of txsSnap.docs) {
                const data = tx.data();
                cycleTxCount++;
                if (data.transactionType === 'EXPENSE') {
                    cycleTotalSpent += data.amount;
                    if (!categorySummary[data.categoryId]) {
                        categorySummary[data.categoryId] = { totalSpent: 0, transactionCount: 0, lastTransactionAt: null };
                    }
                    categorySummary[data.categoryId].totalSpent += data.amount;
                    categorySummary[data.categoryId].transactionCount += 1;
                    const currentLast = categorySummary[data.categoryId].lastTransactionAt;
                    if (!currentLast || data.date.toMillis() > currentLast.toMillis()) {
                        categorySummary[data.categoryId].lastTransactionAt = data.date;
                    }
                }
                // Journal sums
                if (data.journalId) {
                    if (!journalSums[data.journalId]) {
                        journalSums[data.journalId] = { totalSpent: 0, txCount: 0, catSummary: {} };
                    }
                    journalSums[data.journalId].txCount += 1;
                    if (data.transactionType === 'EXPENSE') {
                        journalSums[data.journalId].totalSpent += data.amount;
                        const jCatSum = journalSums[data.journalId].catSummary;
                        if (!jCatSum[data.categoryId]) {
                            jCatSum[data.categoryId] = { totalSpent: 0, transactionCount: 0, lastTransactionAt: null };
                        }
                        jCatSum[data.categoryId].totalSpent += data.amount;
                        jCatSum[data.categoryId].transactionCount += 1;
                        const jLast = jCatSum[data.categoryId].lastTransactionAt;
                        if (!jLast || data.date.toMillis() > jLast.toMillis()) {
                            jCatSum[data.categoryId].lastTransactionAt = data.date;
                        }
                    }
                }
            }
            // Update Cycle
            console.log(`Cycle ${cycleId} -> Total Spent: ${cycleTotalSpent}, Tx Count: ${cycleTxCount}`);
            await cycleDoc.ref.update({
                totalSpent: cycleTotalSpent,
                transactionCount: cycleTxCount,
                categorySummary
            });
            // Update Journals
            const journalsSnap = await cycleDoc.ref.collection('dailyJournals').get();
            for (const jDoc of journalsSnap.docs) {
                const jId = jDoc.id;
                if (journalSums[jId]) {
                    await jDoc.ref.update({
                        totalSpent: journalSums[jId].totalSpent,
                        transactionCount: journalSums[jId].txCount,
                        categorySummary: journalSums[jId].catSummary
                    });
                }
                else {
                    // Journal has no transactions anymore
                    await jDoc.ref.update({
                        totalSpent: 0,
                        transactionCount: 0,
                        categorySummary: {}
                    });
                }
            }
        }
    }
}
recalculateGroupTotals().then(() => process.exit(0)).catch(console.error);
//# sourceMappingURL=recalculateGroupTotals.js.map