import { FinancialSettingsService } from '../services/financialSettings.service';

async function check() {
  const isJeremy = await FinancialSettingsService.getUserInitializationState({ type: 'PERSONAL', id: 'dev_jeremy' });
  const isJames = await FinancialSettingsService.getUserInitializationState({ type: 'PERSONAL', id: 'dev_james' });
  const isJj = await FinancialSettingsService.getUserInitializationState({ type: 'PERSONAL', id: 'dev_jj' });
  
  console.log(`dev_jeremy initialized: ${isJeremy}`);
  console.log(`dev_james initialized: ${isJames}`);
  console.log(`dev_jj initialized: ${isJj}`);
  process.exit(0);
}
check().catch(console.error);
