import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Pure JavaScript logic unit tests verifying early-rollover accounting formulas
describe('Early-Rollover Income & Expense Accounting Verification', () => {

  function calculateRollover(params) {
    const { monthlyBudget, carryForwardEnabled, activeCycle, overflowTransactions } = params;

    const overflowExpenseTotal = overflowTransactions
      .filter(tx => tx.transactionType === 'EXPENSE')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const overflowIncomeTotal = overflowTransactions
      .filter(tx => tx.transactionType === 'INCOME')
      .reduce((sum, tx) => sum + tx.amount, 0);

    // Old cycle trimmed calculations
    const trimmedOldAvailableBalance = activeCycle.budgetSnapshot.availableBalance - overflowIncomeTotal;
    const trimmedOldTotalSpent = activeCycle.totalSpent - overflowExpenseTotal;
    const oldRemaining = trimmedOldAvailableBalance - trimmedOldTotalSpent;
    const carryForward = carryForwardEnabled ? Math.max(0, oldRemaining) : 0;

    // New cycle calculations
    const newCycleAvailableBalance = monthlyBudget + carryForward + overflowIncomeTotal;
    const newCycleTotalSpent = overflowExpenseTotal;

    return {
      overflowExpenseTotal,
      overflowIncomeTotal,
      trimmedOldAvailableBalance,
      trimmedOldTotalSpent,
      oldRemaining,
      carryForward,
      newCycleAvailableBalance,
      newCycleTotalSpent,
    };
  }

  it('Scenario 1: No overflow income or expenses', () => {
    // Initial: monthlyBudget=5000, availableBalance=5000, totalSpent=3000
    // Remaining = 2000. Carry-forward = 2000.
    // New cycle starting availableBalance = 5000 + 2000 = 7000.
    const result = calculateRollover({
      monthlyBudget: 5000,
      carryForwardEnabled: true,
      activeCycle: {
        budgetSnapshot: { availableBalance: 5000 },
        totalSpent: 3000,
      },
      overflowTransactions: [],
    });

    assert.equal(result.trimmedOldAvailableBalance, 5000);
    assert.equal(result.trimmedOldTotalSpent, 3000);
    assert.equal(result.oldRemaining, 2000);
    assert.equal(result.carryForward, 2000);
    assert.equal(result.newCycleAvailableBalance, 7000);
    assert.equal(result.newCycleTotalSpent, 0);
  });

  it('Scenario 2: Overflow income reassigned to new cycle (no double count)', () => {
    // Initial: monthlyBudget=5000. User logged 1000 income on future date.
    // activeCycle.budgetSnapshot.availableBalance = 6000. totalSpent=3000.
    // Overflow income = 1000.
    // Trimmed old cycle availableBalance = 6000 - 1000 = 5000.
    // Trimmed old remaining = 5000 - 3000 = 2000.
    // CarryForward to new cycle = 2000.
    // New cycle starting availableBalance = 5000 (base) + 2000 (carryForward) + 1000 (reassigned income) = 8000.
    // Total cash across cycles: Old remaining (2000) + New base (5000) + Reassigned income (1000) = 8000.
    const result = calculateRollover({
      monthlyBudget: 5000,
      carryForwardEnabled: true,
      activeCycle: {
        budgetSnapshot: { availableBalance: 6000 }, // 5000 + 1000
        totalSpent: 3000,
      },
      overflowTransactions: [
        { transactionType: 'INCOME', amount: 1000 },
      ],
    });

    assert.equal(result.trimmedOldAvailableBalance, 5000);
    assert.equal(result.trimmedOldTotalSpent, 3000);
    assert.equal(result.oldRemaining, 2000);
    assert.equal(result.carryForward, 2000);
    assert.equal(result.newCycleAvailableBalance, 8000);
    assert.equal(result.newCycleTotalSpent, 0);
  });

  it('Scenario 3: Overflow expenses reassigned to new cycle', () => {
    // Initial: monthlyBudget=5000, availableBalance=5000. TotalSpent was 3500 (3000 current + 500 future).
    // Overflow expense = 500.
    // Trimmed old totalSpent = 3500 - 500 = 3000.
    // Old remaining = 5000 - 3000 = 2000.
    // CarryForward = 2000.
    // New cycle availableBalance = 5000 + 2000 = 7000.
    // New cycle totalSpent = 500.
    const result = calculateRollover({
      monthlyBudget: 5000,
      carryForwardEnabled: true,
      activeCycle: {
        budgetSnapshot: { availableBalance: 5000 },
        totalSpent: 3500,
      },
      overflowTransactions: [
        { transactionType: 'EXPENSE', amount: 500 },
      ],
    });

    assert.equal(result.trimmedOldAvailableBalance, 5000);
    assert.equal(result.trimmedOldTotalSpent, 3000);
    assert.equal(result.oldRemaining, 2000);
    assert.equal(result.carryForward, 2000);
    assert.equal(result.newCycleAvailableBalance, 7000);
    assert.equal(result.newCycleTotalSpent, 500);
  });

  it('Scenario 4: Both overflow income and overflow expenses', () => {
    // Initial: monthlyBudget=5000. +1500 future income -> availableBalance=6500.
    // TotalSpent was 4000 (3000 current + 1000 future).
    // Overflow: income=1500, expense=1000.
    // Trimmed old availableBalance = 6500 - 1500 = 5000.
    // Trimmed old totalSpent = 4000 - 1000 = 3000.
    // Old remaining = 5000 - 3000 = 2000.
    // CarryForward = 2000.
    // New cycle availableBalance = 5000 + 2000 + 1500 = 8500.
    // New cycle totalSpent = 1000.
    const result = calculateRollover({
      monthlyBudget: 5000,
      carryForwardEnabled: true,
      activeCycle: {
        budgetSnapshot: { availableBalance: 6500 },
        totalSpent: 4000,
      },
      overflowTransactions: [
        { transactionType: 'INCOME', amount: 1500 },
        { transactionType: 'EXPENSE', amount: 1000 },
      ],
    });

    assert.equal(result.trimmedOldAvailableBalance, 5000);
    assert.equal(result.trimmedOldTotalSpent, 3000);
    assert.equal(result.oldRemaining, 2000);
    assert.equal(result.carryForward, 2000);
    assert.equal(result.newCycleAvailableBalance, 8500);
    assert.equal(result.newCycleTotalSpent, 1000);
  });

  it('Scenario 5: Carry-forward disabled with overflow income and expenses', () => {
    const result = calculateRollover({
      monthlyBudget: 5000,
      carryForwardEnabled: false,
      activeCycle: {
        budgetSnapshot: { availableBalance: 6500 },
        totalSpent: 4000,
      },
      overflowTransactions: [
        { transactionType: 'INCOME', amount: 1500 },
        { transactionType: 'EXPENSE', amount: 1000 },
      ],
    });

    assert.equal(result.trimmedOldAvailableBalance, 5000);
    assert.equal(result.trimmedOldTotalSpent, 3000);
    assert.equal(result.oldRemaining, 2000);
    assert.equal(result.carryForward, 0); // Disabled
    assert.equal(result.newCycleAvailableBalance, 6500); // 5000 + 0 + 1500
    assert.equal(result.newCycleTotalSpent, 1000);
  });
});
