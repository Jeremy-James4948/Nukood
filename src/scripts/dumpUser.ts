import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FinancialSettingsService } from '../services/financialSettings.service';

async function checkUser() {
  const userId = 'dev_jeremy';
  
  const settings = await FinancialSettingsService.getSettings(userId);
  console.log('Settings:', settings);
  
  const cyclesRef = collection(db, 'users', userId, 'financialCycles');
  const q = query(cyclesRef, where('status', '==', 'ACTIVE'), limit(1));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log('NO ACTIVE CYCLE FOUND for dev_jeremy');
  } else {
    console.log('Active Cycle:', snap.docs[0].id, snap.docs[0].data());
  }
  
  const categoriesRef = collection(db, 'categories');
  const catSnap = await getDocs(categoriesRef);
  console.log(`Global Categories count: ${catSnap.size}`);
  
  process.exit(0);
}
checkUser().catch(console.error);
