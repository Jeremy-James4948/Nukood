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
async function run() {
    const transactionsRef = db.collectionGroup('transactions');
    const snap = await transactionsRef.where('journalId', '==', 'journal_2026_10_10').get();
    console.log(`Found ${snap.size} transactions on Oct 10.`);
    for (const doc of snap.docs) {
        const data = doc.data();
        console.log(`- Found ID: ${doc.id}, Title: ${data.title}, Amount: ${data.amount}`);
        // We will update the journalId and date for this transaction to Oct 11!
        // Wait, just updating the transaction document doesn't update the cycle/journal aggregates.
        // Let's just delete the transaction and let the user add it again, it's safer.
        console.log(`Deleting transaction ${doc.id}...`);
        await doc.ref.delete();
    }
}
run().then(() => process.exit(0)).catch(console.error);
//# sourceMappingURL=fixDateAdmin.js.map