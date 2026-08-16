import React, { useEffect, useState } from 'react';
import { collection, doc, getDocs, updateDoc, writeBatch, Timestamp, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CategoryService } from '../services/category.service';
import { TemplateService } from '../services/template.service';

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

export const MigrationRunner: React.FC = () => {
  const [status, setStatus] = useState<string>("Ready to run");
  const [isRunning, setIsRunning] = useState(false);

  const runMigration = async () => {
    setIsRunning(true);
    setStatus("Syncing globals...");
    try {
      await CategoryService.syncGlobalCategories();
      await TemplateService.syncGlobalTemplates();

      setStatus("Migrating dev_jeremy...");
      const targetUser = 'dev_jeremy';

      const transactionsRef = collection(db, 'users', targetUser, 'transactions');
      const fastEntriesRef = collection(db, 'users', targetUser, 'fastEntries');
      const cyclesRef = collection(db, 'users', targetUser, 'financialCycles');

      let txCount = 0;
      let feCount = 0;

      // 1. Transactions
      const txSnap = await getDocs(transactionsRef);
      for (const docSnap of txSnap.docs) {
        const data = docSnap.data();
        if (data.categoryId && ID_MAPPING[data.categoryId]) {
          const mapping = ID_MAPPING[data.categoryId];
          const details = data.transactionDetails || data.categoryData || {};
          await updateDoc(docSnap.ref, { 
            categoryId: mapping.cat, 
            templateId: mapping.tpl,
            transactionDetails: details,
            categoryData: deleteField()
          });
          txCount++;
        }
      }

      // 2. Fast Entries
      const feSnap = await getDocs(fastEntriesRef);
      for (const docSnap of feSnap.docs) {
        const data = docSnap.data();
        if (data.categoryId && ID_MAPPING[data.categoryId]) {
          const mapping = ID_MAPPING[data.categoryId];
          const details = data.transactionDetails || data.categoryData || {};
          await updateDoc(docSnap.ref, { 
            categoryId: mapping.cat,
            templateId: mapping.tpl,
            transactionDetails: details,
            categoryData: deleteField()
          });
          feCount++;
        }
      }

      // 3. Cycles & Journals
      const cycleSnap = await getDocs(cyclesRef);
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
          await updateDoc(cycleDoc.ref, { categorySummary: newSummary });
        }

        const journalsRef = collection(db, 'users', targetUser, 'financialCycles', cycleDoc.id, 'dailyJournals');
        const journalSnap = await getDocs(journalsRef);

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
            await updateDoc(journalDoc.ref, { categorySummary: newJSummary });
          }
        }
      }

      setStatus(`Done! Migrated ${txCount} TXs and ${feCount} Fast Entries.`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#fff', padding: 20, zIndex: 9999, border: '2px solid red', borderRadius: 8 }}>
      <h3>Migration Runner</h3>
      <p>Status: {status}</p>
      <button onClick={runMigration} disabled={isRunning} style={{ padding: '8px 16px', background: '#333', color: '#fff', borderRadius: 4 }}>
        Run Migration
      </button>
    </div>
  );
};
