import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collectionGroup, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = { projectId: 'my-nukood-683a0' };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

async function run() {
  const q = query(collectionGroup(db, 'transactions'), where('journalId', '==', 'journal_2026_10_10'));
  const snap = await getDocs(q);
  console.log(`Found ${snap.size} transactions on Oct 10.`);
  snap.forEach(doc => {
    console.log(`- ID: ${doc.id}, Title: ${doc.data().title}, Amount: ${doc.data().amount}, Date: ${doc.data().date?.toDate()}`);
  });
}
run().then(() => process.exit(0)).catch(console.error);
