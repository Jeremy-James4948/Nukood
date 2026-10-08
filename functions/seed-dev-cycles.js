const admin = require("firebase-admin");

// Connect to local emulator
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

admin.initializeApp({
  projectId: "my-nukood-683a0"
});

const db = admin.firestore();

const DEV_USERS = ['dev_jj', 'dev_jeremy', 'dev_james', 'dev_variath'];

async function seed() {
  const now = admin.firestore.Timestamp.now();
  const startDate = admin.firestore.Timestamp.fromDate(new Date("2026-10-01T00:00:00Z"));
  const endDate = admin.firestore.Timestamp.fromDate(new Date("2026-10-31T23:59:59Z"));

  for (const userId of DEV_USERS) {
    console.log(`Seeding cycle for ${userId}...`);
    
    // Check if one exists
    const snap = await db.collection("users").doc(userId).collection("financialCycles")
      .where("status", "==", "ACTIVE")
      .get();
      
    if (snap.empty) {
      const cycleRef = db.collection("users").doc(userId).collection("financialCycles").doc();
      await cycleRef.set({
        cycleId: cycleRef.id,
        startDate: startDate,
        endDate: endDate,
        status: "ACTIVE",
        budget: 5000,
        totalSpent: 0,
        transactionCount: 0,
        categorySummary: {},
        createdAt: now,
        updatedAt: now
      });
      console.log(`Created cycle ${cycleRef.id} for ${userId}`);
    } else {
      console.log(`${userId} already has an active cycle.`);
    }
  }
  console.log("Done.");
}

seed().catch(console.error);
