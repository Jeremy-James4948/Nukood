import { FinancialCycleService } from '../services/financialCycle.service';

async function repair() {
  console.log('Repairing dev_jeremy...');
  await FinancialCycleService.rebalanceCyclesAfterDateChange({ type: 'PERSONAL', id: 'dev_jeremy' },
    'cycle_2026_10',
    new Date('2026-10-01T00:00:00.000Z'),
    new Date('2026-10-31T23:59:59.999Z')
  );
  console.log('✅ dev_jeremy repaired.');
  
  console.log('Repairing dev_james...');
  await FinancialCycleService.rebalanceCyclesAfterDateChange({ type: 'PERSONAL', id: 'dev_james' },
    'cycle_2026_10',
    new Date('2026-10-01T00:00:00.000Z'),
    new Date('2026-10-31T23:59:59.999Z')
  );
  console.log('✅ dev_james repaired.');
  
  process.exit(0);
}

repair().catch(console.error);
