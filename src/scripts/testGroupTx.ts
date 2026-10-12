import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";

const clientApp = initializeApp({
  projectId: "my-nukood-683a0",
  apiKey: "fake-api-key"
});

const auth = getAuth(clientApp);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

const db = getFirestore(clientApp);
connectFirestoreEmulator(db, "127.0.0.1", 8080);

const functions = getFunctions(clientApp, "us-central1");
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

async function setup() {
  // Use client SDK to setup data. We must login first or use a backdoor.
  // Wait, the auth emulator provides a REST API to create users. 
  // Let's just create the user via REST API if sign-in fails.
  try {
    await signInWithEmailAndPassword(auth, "dev_jj@example.com", "password123");
  } catch (e: any) {
    console.log("Creating dev_jj@example.com via REST...");
    await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dev_jj@example.com", password: "password123", returnSecureToken: true })
    });
    await signInWithEmailAndPassword(auth, "dev_jj@example.com", "password123");
  }

  console.log("Authenticated as " + auth.currentUser!.uid);
  const uid = auth.currentUser!.uid;

  // Setup valid group & cycle using client SDK (obeys rules)
  await setDoc(doc(db, "groups", "test-group-1"), {
    groupId: "test-group-1",
    name: "The Test House",
    memberIds: [uid, "dev_jeremy"],
    createdBy: uid,
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, "groups", "test-group-1", "members", uid), {
    role: "ADMIN"
  });

  await setDoc(doc(db, "groups", "test-group-1", "financialCycles", "cycle_1"), {
    status: "ACTIVE",
    totalSpent: 0,
    transactionCount: 0,
    categorySummary: {
      cat_food: { totalSpent: 0, transactionCount: 0 }
    }
  });

  await setDoc(doc(db, "groups", "test-group-1", "settings", "financial"), {
    monthlyBudget: 1000
  });
}

async function runTests() {
  console.log("--- Group Transaction Emulator Tests ---");

  try {
    console.log("Setting up mock data...");
    await setup();
    
    const createGroupTx = httpsCallable(functions, "groupTransaction");
    
    // Test 1: Invalid group (Not a member)
    console.log("\nTesting: Invalid group (Not a member)...");
    try {
      await createGroupTx({
        groupId: "non-existent-group",
        categoryId: "cat_food",
        templateId: "tpl_food",
        transactionType: "EXPENSE",
        title: "Test",
        amount: 50.0,
        date: new Date().toISOString(),
        transactionDetails: {}
      });
      console.error("❌ FAILED: Expected permission denied");
      process.exit(1);
    } catch (err: any) {
      if (err.message.includes("You must be a member")) {
        console.log("✅ PASSED: Rejected non-member transaction");
      } else {
        console.error("❌ FAILED with wrong error:", err.message);
        process.exit(1);
      }
    }

    // Test 2: Invalid Amount
    console.log("\nTesting: Invalid Amount (-50)...");
    try {
      await createGroupTx({
        groupId: "test-group-1",
        categoryId: "cat_food",
        templateId: "tpl_food",
        transactionType: "EXPENSE",
        title: "Test",
        amount: -50.0,
        date: new Date().toISOString(),
        transactionDetails: {}
      });
      console.error("❌ FAILED: Expected invalid argument");
      process.exit(1);
    } catch (err: any) {
      if (err.message.includes("Amount must be a positive number")) {
        console.log("✅ PASSED: Rejected negative amount");
      } else {
        console.error("❌ FAILED with wrong error:", err.message);
        process.exit(1);
      }
    }

    // Test 3: Happy Path & Atomic Writes
    console.log("\nTesting: Valid Transaction & Atomic Writes...");
    const res = await createGroupTx({
      groupId: "test-group-1",
      categoryId: "cat_food",
      templateId: "tpl_food",
      transactionType: "EXPENSE",
      title: "Group Dinner",
      amount: 45.0,
      date: new Date().toISOString(),
      transactionDetails: {}
    });
    
    const transactionId = (res.data as any).transactionId;
    if (transactionId) {
      console.log("✅ PASSED: Transaction created: " + transactionId);
    } else {
      console.error("❌ FAILED: No transaction ID returned");
      process.exit(1);
    }

    // Use admin REST api to verify so we don't worry about client rules for now, or just use client
    // Since we are a member, we can read the cycle
    const cycleSnap = await getDoc(doc(db, "groups", "test-group-1", "financialCycles", "cycle_1"));
    const cycleData = cycleSnap.data();
    if (cycleData?.totalSpent === 45.0 && cycleData?.transactionCount === 1 && cycleData?.categorySummary?.cat_food?.totalSpent === 45.0) {
      console.log("✅ PASSED: Cycle aggregates updated atomically");
    } else {
      console.error("❌ FAILED: Cycle aggregates incorrect", cycleData);
      process.exit(1);
    }

    // Check journals
    const journalsSnap = await getDocs(collection(db, "groups", "test-group-1", "financialCycles", "cycle_1", "dailyJournals"));
    const journalData = journalsSnap.docs[0]?.data();
    if (journalData?.totalSpent === 45.0 && journalData?.transactionCount === 1) {
      console.log("✅ PASSED: Daily Journal updated atomically");
    } else {
      console.error("❌ FAILED: Daily Journal incorrect", journalData);
      process.exit(1);
    }

    console.log("\nAll tests complete!");
    process.exit(0);
  } catch (err: any) {
    console.error("Fatal Test Error:", err.message);
    process.exit(1);
  }
}

runTests();
