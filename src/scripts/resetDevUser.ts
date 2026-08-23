/**
 * resetDevUser.ts
 *
 * Wipes all financial Firestore data for a dev user so they start clean
 * through the onboarding flow. After running this, the user has no
 * settings/financial doc → getUserInitializationState() returns false
 * → they will be routed to /onboarding on next login.
 *
 * Deletes (in order):
 *   1. users/{userId}/financialCycles/{cycleId}/dailyJournals/*
 *   2. users/{userId}/financialCycles/*
 *   3. users/{userId}/transactions/*
 *   4. users/{userId}/fastEntries/*
 *   5. users/{userId}/settings/financial
 *
 * Does NOT delete the top-level users/{userId} document or any other user's data.
 *
 * Run with:
 *   npx tsx --env-file=.env.local src/scripts/resetDevUser.ts           ← defaults to dev_jj
 *   npx tsx --env-file=.env.local src/scripts/resetDevUser.ts dev_jj
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY            || 'dummy',
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN        || 'dummy',
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID         || 'dummy',
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET     || 'dummy',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'dummy',
  appId:             process.env.VITE_FIREBASE_APP_ID             || 'dummy',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function deleteCollection(collPath: string[], label: string): Promise<number> {
  const ref  = collection(db, collPath[0], ...collPath.slice(1));
  const snap = await getDocs(ref);
  if (snap.empty) {
    console.log(`  [skip]   ${label} — no documents`);
    return 0;
  }
  let count = 0;
  for (const d of snap.docs) {
    await deleteDoc(d.ref);
    count++;
  }
  console.log(`  [delete] ${label} — ${count} deleted`);
  return count;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function resetDevUser(userId: string): Promise<void> {
  console.log('\n========================================');
  console.log(` RESET DEV USER: ${userId}`);
  console.log('========================================\n');
  console.log('⚠️  This is irreversible. Starting in 2 seconds...\n');
  await new Promise(r => setTimeout(r, 2000));

  let total = 0;

  // 1. dailyJournals (subcollection — must be deleted before parent cycle)
  console.log('Step 1 — dailyJournals inside each financialCycle...');
  const cyclesSnap = await getDocs(collection(db, 'users', userId, 'financialCycles'));
  if (cyclesSnap.empty) {
    console.log('  [skip]   No financialCycles found');
  } else {
    for (const c of cyclesSnap.docs) {
      total += await deleteCollection(
        ['users', userId, 'financialCycles', c.id, 'dailyJournals'],
        `dailyJournals [${c.id}]`
      );
    }
  }

  // 2. financialCycles
  console.log('\nStep 2 — financialCycles...');
  total += await deleteCollection(['users', userId, 'financialCycles'], 'financialCycles');

  // 3. transactions
  console.log('\nStep 3 — transactions...');
  total += await deleteCollection(['users', userId, 'transactions'], 'transactions');

  // 4. fastEntries
  console.log('\nStep 4 — fastEntries...');
  total += await deleteCollection(['users', userId, 'fastEntries'], 'fastEntries');

  // 5. settings/financial
  console.log('\nStep 5 — settings/financial...');
  await deleteDoc(doc(db, 'users', userId, 'settings', 'financial'));
  console.log('  [delete] settings/financial');
  total++;

  console.log('\n========================================');
  console.log(` ✅ Done — ${total} document(s) deleted`);
  console.log(` ${userId} starts fresh. Login will route to /onboarding.`);
  console.log('========================================\n');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const userId = process.argv[2] ?? 'dev_jj';
resetDevUser(userId).catch(err => {
  console.error('\n[FATAL]', err.message ?? err);
  process.exit(1);
});
