import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY            || 'dummy',
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN        || 'dummy',
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID         || 'dummy',
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET     || 'dummy',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'dummy',
  appId:             process.env.VITE_FIREBASE_APP_ID             || 'dummy',
};

// IMPORTANT: Tell the script to connect to the local emulator
// Removed to allow connecting to production for testing

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

async function seedDevUser(userId: string) {
  console.log(`Seeding cycle for ${userId}...`);
  
  // 1. Create a dummy financial settings doc
  await setDoc(doc(db, 'users', userId, 'settings', 'financial'), {
    monthlyBudget: 5000,
    carryForwardEnabled: true,
    budgetThresholds: { comfortable: 90, onTrack: 105, tight: 115 },
    currency: 'USD',
    cycleConfiguration: {
      startDate: new Date('2024-01-01'),
      cycleLengthDays: 31,
      autoCreateNextCycle: true,
    },
    hiddenCategoryIds: [],
    isOnboarded: true,
    updatedAt: new Date(),
  });

  // 2. Create an ACTIVE financial cycle
  const cycleId = 'cycle_2026_10';
  await setDoc(doc(db, 'users', userId, 'financialCycles', cycleId), {
    cycleId,
    cycleName: 'October 2026',
    startDate: new Date('2026-10-01T00:00:00.000Z'),
    endDate: new Date('2026-10-31T23:59:59.999Z'),
    cycleLengthDays: 31,
    status: 'ACTIVE',
    budgetSnapshot: {
      monthlyBudget: 5000,
      carryForward: 0,
      availableBalance: 5000,
    },
    totalSpent: 0,
    transactionCount: 0,
    categorySummary: {},
    dailyJournals: {},
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log(`✅ Seeded ${userId}`);
}

async function run() {
  await seedDevUser('dev_jeremy');
  await seedDevUser('dev_james');
  console.log("All dev users seeded. Exiting.");
  process.exit(0);
}

run().catch(console.error);
