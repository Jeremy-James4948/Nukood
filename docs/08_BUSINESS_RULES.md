# Business Rules

This document outlines the strict, immutable rules that govern how data and calculations are handled within Nukood.

## 1. Configuration & Settings Modifications
- **Updating Monthly Budget, Start Date, or Duration** 
  ↓ 
  *Only affects future Financial Cycles.*

## 2. Core Operational Rules
- Every transaction belongs to exactly **one** Financial Cycle.
- Historical Financial Cycles **never change**.
- Carry Forward is **copied once** at the creation of a Financial Cycle and is never recalculated.
- Remaining Balance is **always calculated dynamically** and never hard-stored.

## 3. Categories
- Every Transaction must belong to exactly one Category.
- Every Category must reference exactly one Transaction Template.
- Categories never store financial values.
- Categories are responsible only for classification.
- Transaction behaviour belongs to Transaction Templates.

## 4. Transaction Templates
- Transaction Templates store the UI configuration and form logic.
- They dictate the fields required when creating a transaction for any Category that references them.
- Templates are reusable across multiple Categories.

## 5. Fast Entries
- **Rule 1**: A Fast Entry never stores financial activity. It only references a reusable Transaction.
- **Rule 2**: The original Transaction remains unchanged.
- **Rule 3**: Using a Fast Entry always creates a completely new Transaction.
- **Rule 4**: Every field copied from the original Transaction remains editable before saving.
- **Rule 5**: Deleting a Fast Entry must never delete the linked Transaction (one-way only).
- **Rule 6**: Deleting the original Transaction must not automatically delete the Fast Entry without user confirmation or prevention.
- **Rule 7**: Every successful Fast Entry use increments `usageCount` and updates `lastUsedAt`.

## 6. Financial Engine
- **Rule 1**: All financial calculations must originate from the Financial Engine.
- **Rule 2**: Dashboard, History, Archive and Reports must never implement independent financial calculations.
- **Rule 3**: Every Transaction immediately updates the current Financial Cycle.
- **Rule 4**: Only Expense Transactions increase Total Spent. Income Transactions increase Available Balance for the current Financial Cycle.
- **Rule 5**: Carry Forward is calculated only once when a new Financial Cycle is created.
- **Rule 6**: Available Balance is initially established at the beginning of a Financial Cycle, and dynamically increases when Income Transactions are recorded.
- **Rule 7**: Remaining Balance is always calculated dynamically. It is never stored.
- **Rule 8**: Daily Available Budget is always calculated dynamically. It is never stored.
- **Rule 9**: Budget Health is always calculated dynamically. It is never stored.

## 7. Transaction Lifecycle Service
- **Rule 1**: Transactions must never be written directly to Firestore from the UI.
- **Rule 2**: All Transaction creation, updates and deletions must pass through the Transaction Lifecycle Service.
- **Rule 3**: The service must never perform financial calculations, but must notify the Financial Engine after every successful operation.
- **Rule 4**: Transactions failing validation must not be saved.
- **Rule 5**: No partial updates should occur. Operations must be rolled back or aborted if any step fails.
