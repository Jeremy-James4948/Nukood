import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

async function check() {
  const snap = await getDocs(collection(db, 'categories'));
  console.log(`Found ${snap.size} categories in Firestore.`);
  process.exit(0);
}
check().catch(console.error);
