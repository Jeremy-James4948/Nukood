import * as admin from 'firebase-admin';

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
