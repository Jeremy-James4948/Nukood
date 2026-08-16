import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "dummy",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "dummy",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy",
  appId: process.env.VITE_FIREBASE_APP_ID || "dummy"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SOURCE_USER = 'demo-user-1';
const TARGET_USER = 'dev_jeremy';

async function copyCollection(sourcePath: string, targetPath: string, updateUserId: boolean = false) {
  console.log(`Copying collection from ${sourcePath} to ${targetPath}...`);
  const sourceRef = collection(db, sourcePath);
  const snapshot = await getDocs(sourceRef);
  
  if (snapshot.empty) {
    console.log(`  -> Empty collection, skipping.`);
    return;
  }

  let count = 0;
  for (const document of snapshot.docs) {
    const data = document.data();
    
    // Update embedded userId if present
    if (updateUserId && data.userId === SOURCE_USER) {
      data.userId = TARGET_USER;
    }

    const targetDocRef = doc(db, targetPath, document.id);
    await setDoc(targetDocRef, data);
    count++;
  }
  console.log(`  -> Copied ${count} documents.`);
}

async function runMigration() {
  console.log('Starting Migration: demo-user-1 -> dev_jeremy');

  try {
    // 1. Settings
    await copyCollection(`users/${SOURCE_USER}/settings`, `users/${TARGET_USER}/settings`);
    
    // 2. Categories
    await copyCollection(`users/${SOURCE_USER}/categories`, `users/${TARGET_USER}/categories`);
    
    // 3. Templates
    await copyCollection(`users/${SOURCE_USER}/templates`, `users/${TARGET_USER}/templates`);
    
    // 4. FastEntries
    await copyCollection(`users/${SOURCE_USER}/fastEntries`, `users/${TARGET_USER}/fastEntries`, true);
    
    // 5. Transactions
    await copyCollection(`users/${SOURCE_USER}/transactions`, `users/${TARGET_USER}/transactions`, true);
    
    // 6. Financial Cycles
    console.log(`Copying collection from users/${SOURCE_USER}/financialCycles to users/${TARGET_USER}/financialCycles...`);
    const cyclesSnapshot = await getDocs(collection(db, `users/${SOURCE_USER}/financialCycles`));
    
    let cyclesCount = 0;
    for (const cycleDoc of cyclesSnapshot.docs) {
      const cycleData = cycleDoc.data();
      if (cycleData.userId === SOURCE_USER) cycleData.userId = TARGET_USER;
      await setDoc(doc(db, `users/${TARGET_USER}/financialCycles`, cycleDoc.id), cycleData);
      cyclesCount++;

      // Copy Daily Journals for this cycle
      await copyCollection(
        `users/${SOURCE_USER}/financialCycles/${cycleDoc.id}/dailyJournals`, 
        `users/${TARGET_USER}/financialCycles/${cycleDoc.id}/dailyJournals`,
        true
      );
    }
    console.log(`  -> Copied ${cyclesCount} financial cycles.`);

    console.log('Migration Completed Successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

runMigration().then(() => process.exit(0));
