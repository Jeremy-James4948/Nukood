import { FinancialCycle } from '../services/financialCycle.service';
import { FinancialSettings } from '../services/financialSettings.service';

export type BudgetHealthStatus = 'Comfortable' | 'On Track' | 'Tight Budget' | 'Overspending';

export class FinancialEngine {
  /**
   * Calculates how much money is left in the current cycle.
   */
  static calculateRemainingBalance(cycle: FinancialCycle): number {
    return Math.max(0, cycle.budgetSnapshot.availableBalance - cycle.totalSpent);
  }

  /**
   * Calculates how many days are left in the cycle (including today).
   */
  static calculateRemainingDays(cycle: FinancialCycle): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const end = new Date(cycle.endDate);
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    
    // Minimum of 1 day left to avoid dividing by zero
    return Math.max(1, daysLeft); 
  }

  /**
   * Calculates how many days have passed since the cycle started.
   */
  static calculateDaysPassed(cycle: FinancialCycle): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(cycle.startDate);
    start.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - start.getTime();
    const daysPassed = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Ensure we don't go below 1 or exceed the cycle length
    return Math.min(cycle.cycleLengthDays, Math.max(1, daysPassed));
  }

  /**
   * Calculates the maximum recommended amount the user can spend each remaining day
   * to avoid running out of money before the month ends.
   */
  static calculateDailyAvailableBudget(cycle: FinancialCycle): number {
    const remainingBalance = this.calculateRemainingBalance(cycle);
    const remainingDays = this.calculateRemainingDays(cycle);
    return remainingBalance / remainingDays;
  }

  /**
   * Calculates the average amount spent per day so far.
   */
  static calculateAverageDailySpending(cycle: FinancialCycle): number {
    const daysPassed = this.calculateDaysPassed(cycle);
    return cycle.totalSpent / daysPassed;
  }

  /**
   * Calculates the percentage of the available balance that has been used.
   */
  static calculatePercentageUsed(cycle: FinancialCycle): number {
    if (cycle.budgetSnapshot.availableBalance === 0) return 0;
    return (cycle.totalSpent / cycle.budgetSnapshot.availableBalance) * 100;
  }

  /**
   * Determines the Budget Health by comparing average daily spending against the recommended daily budget.
   */
  static calculateBudgetHealth(cycle: FinancialCycle, settings: FinancialSettings): BudgetHealthStatus {
    // The base daily target if they spread their budget perfectly over the whole cycle
    const baseDailyTarget = cycle.budgetSnapshot.availableBalance / cycle.cycleLengthDays;
    const avgDailySpending = this.calculateAverageDailySpending(cycle);

    // If baseDailyTarget is 0, avoid division by zero
    const ratio = baseDailyTarget > 0 ? (avgDailySpending / baseDailyTarget) * 100 : 0;

    if (ratio > settings.budgetThresholds.tight) {
      return 'Overspending';
    } else if (ratio > settings.budgetThresholds.onTrack) {
      return 'Tight Budget';
    } else if (ratio > settings.budgetThresholds.comfortable) {
      return 'On Track';
    } else {
      return 'Comfortable';
    }
  }
}
