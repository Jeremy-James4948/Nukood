import { config } from 'dotenv';
import { resolve } from 'path';
// Load environment variables for the Node.js script
config({ path: resolve(__dirname, '../../.env.local') });

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// You MUST run this script with FIREBASE_SERVICE_ACCOUNT set in your environment
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
    : undefined;

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Fallback to default application credentials if running in GCP
    admin.initializeApp();
  }
}

const db = admin.firestore();

const ID_MAPPING: Record<string, { cat: string, tpl: string }> = {
  groceries: { cat: 'cat_groceries', tpl: 'tpl_groceries' },
  food: { cat: 'cat_food', tpl: 'tpl_food' },
  transport: { cat: 'cat_transport', tpl: 'tpl_transport' },
  house: { cat: 'cat_house', tpl: 'tpl_house' },
  personal: { cat: 'cat_personal', tpl: 'tpl_personal' },
  entertainment: { cat: 'cat_entertainment', tpl: 'tpl_entertainment' },
  medical: { cat: 'cat_medical', tpl: 'tpl_medical' },
  college: { cat: 'cat_college', tpl: 'tpl_college' },
  balance_added: { cat: 'cat_balance_added', tpl: 'tpl_balance_added' },
};

async function migrateData() {
  console.log("Starting Global Categories Migration...");
  const targetUser = 'dev_jeremy'; // The only user with existing data according to instructions

  const transactionsRef = db.collection('users').doc(targetUser).collection('transactions');
  const fastEntriesRef = db.collection('users').doc(targetUser).collection('fastEntries');
  const cyclesRef = db.collection('users').doc(targetUser).collection('financialCycles');

  const batchSize = 100;
  
  // 1. Migrate Transactions
  console.log("Migrating transactions...");
  const txSnap = await transactionsRef.get();
  let txBatch = db.batch();
  let txCount = 0;
  let totalTxMigrated = 0;

  for (const doc of txSnap.docs) {
    const data = doc.data();
    if (data.categoryId && ID_MAPPING[data.categoryId]) {
      const mapping = ID_MAPPING[data.categoryId];
      // Notice we map categoryData -> transactionDetails here since the DB still has old fields
      const details = data.transactionDetails || data.categoryData || {};
      txBatch.update(doc.ref, { 
        categoryId: mapping.cat, 
        templateId: mapping.tpl,
        transactionDetails: details,
        categoryData: admin.firestore.FieldValue.delete() // Cleanup old field
      });
      txCount++;
      totalTxMigrated++;
    }
    
    if (txCount >= batchSize) {
      await txBatch.commit();
      txBatch = db.batch();
      txCount = 0;
    }
  }
  if (txCount > 0) await txBatch.commit();
  console.log(`Migrated ${totalTxMigrated} transactions.`);

  // 2. Migrate Fast Entries
  console.log("Migrating fast entries...");
  const feSnap = await fastEntriesRef.get();
  let feBatch = db.batch();
  let feCount = 0;
  let totalFeMigrated = 0;

  for (const doc of feSnap.docs) {
    const data = doc.data();
    if (data.categoryId && ID_MAPPING[data.categoryId]) {
      const mapping = ID_MAPPING[data.categoryId];
      const details = data.transactionDetails || data.categoryData || {};
      feBatch.update(doc.ref, { 
        categoryId: mapping.cat,
        templateId: mapping.tpl,
        transactionDetails: details,
        categoryData: admin.firestore.FieldValue.delete()
      });
      feCount++;
      totalFeMigrated++;
    }

    if (feCount >= batchSize) {
      await feBatch.commit();
      feBatch = db.batch();
      feCount = 0;
    }
  }
  if (feCount > 0) await feBatch.commit();
  console.log(`Migrated ${totalFeMigrated} fast entries.`);

  // 3. Migrate Category Summaries in Financial Cycles & Daily Journals
  console.log("Migrating financial cycles (Category Summaries)...");
  const cycleSnap = await cyclesRef.get();
  
  for (const cycleDoc of cycleSnap.docs) {
    const data = cycleDoc.data();
    let cycleUpdated = false;
    const newSummary: Record<string, any> = {};

    if (data.categorySummary) {
      for (const [oldCatId, summary] of Object.entries(data.categorySummary)) {
        if (ID_MAPPING[oldCatId]) {
          newSummary[ID_MAPPING[oldCatId].cat] = summary;
          cycleUpdated = true;
        } else {
          newSummary[oldCatId] = summary;
        }
      }
    }
    
    if (cycleUpdated) {
      await cycleDoc.ref.update({ categorySummary: newSummary });
    }

    // Now migrate journals within this cycle
    const journalsRef = cycleDoc.ref.collection('dailyJournals');
    const journalSnap = await journalsRef.get();
    let journalBatch = db.batch();
    let jCount = 0;

    for (const journalDoc of journalSnap.docs) {
      const jData = journalDoc.data();
      let jUpdated = false;
      const newJSummary: Record<string, any> = {};

      if (jData.categorySummary) {
        for (const [oldCatId, summary] of Object.entries(jData.categorySummary)) {
          if (ID_MAPPING[oldCatId]) {
            newJSummary[ID_MAPPING[oldCatId].cat] = summary;
            jUpdated = true;
          } else {
            newJSummary[oldCatId] = summary;
          }
        }
      }
      
      if (jUpdated) {
        journalBatch.update(journalDoc.ref, { categorySummary: newJSummary });
        jCount++;
      }

      if (jCount >= batchSize) {
        await journalBatch.commit();
        journalBatch = db.batch();
        jCount = 0;
      }
    }
    if (jCount > 0) await journalBatch.commit();
  }
  console.log("Migrated category summaries in cycles and journals.");
  
  console.log("Migration Complete.");
}

migrateData().catch(console.error);
