// Suppress firebase warnings in node
process.env.FIREBASE_FORCE_NODE = 'true';
// @ts-ignore
global.import = { meta: { env: { VITE_FIREBASE_API_KEY: 'dummy', VITE_FIREBASE_AUTH_DOMAIN: 'dummy', VITE_FIREBASE_PROJECT_ID: 'dummy' } } };

import { FinancialSettingsService } from './src/services/financialSettings.service';
import { TransactionService } from './src/services/transaction.service';
import { FinancialCycleService } from './src/services/financialCycle.service';
process.env.FIREBASE_FORCE_NODE = 'true';

async function runTests() {
  console.log("=== Test 1 & 4: Existing user (dev_jeremy) ===");
  try {
    const jeremyState = await FinancialSettingsService.getUserInitializationState('dev_jeremy');
    console.log(`dev_jeremy initialization state: ${jeremyState}`);
    
    // Verify existing data unchanged
    const jeremyCycle = await FinancialCycleService.getActiveCycle('dev_jeremy');
    if (jeremyCycle) {
      console.log(`dev_jeremy active cycle: ${jeremyCycle.cycleName}, Status: ${jeremyCycle.status}`);
      const txs = await TransactionService.getTransactionsForCycle('dev_jeremy', jeremyCycle.cycleId);
      console.log(`dev_jeremy transactions count: ${txs.length}`);
    } else {
      console.log(`dev_jeremy has no active cycle.`);
    }

    console.log("\n=== Test 2 & 4: Second development user (dev_jj) ===");
    const jjState = await FinancialSettingsService.getUserInitializationState('dev_jj');
    console.log(`dev_jj initialization state: ${jjState}`);

    // Verify separation
    console.log("\nUser Separation Verification:");
    console.log(`dev_jeremy -> ${jeremyState}`);
    console.log(`dev_jj -> ${jjState}`);

    console.log("\n=== Test 3: Persistence (Simulated) ===");
    // Set JJ to initialized
    console.log("Setting dev_jj to complete...");
    await FinancialSettingsService.setUserInitializationComplete('dev_jj');
    const jjStateAfter = await FinancialSettingsService.getUserInitializationState('dev_jj');
    console.log(`dev_jj initialization state after save: ${jjStateAfter}`);

  } catch (error) {
    console.error("Test failed:", error);
  }
  process.exit(0);
}

runTests();
