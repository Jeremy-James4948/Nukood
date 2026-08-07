# History Module

## Overview

The History Module allows users to browse, search, filter and manage all previously recorded financial activity.

History is organized using Transactions.

History does not maintain its own financial records.

Instead, it directly retrieves all Transactions from the active or archived Financial Cycles.

---

# Responsibilities

The History Module is responsible for:

- Displaying Transactions 
- Searching Transactions.
- Filtering Transactions.
- Sorting Transactions.
- Editing Transactions.
- Deleting Transactions.


The History Module is **not** responsible for:

- Creating Transactions.
- Financial calculations.
- Budget calculations.
- Managing Financial Cycles.
- Managing Fast Entries.
- Displaying all important information linked to a transaction

---

# Data Sources

The History Module retrieves data from:

- Financial Cycles
- Transactions
- Financial Engine (summary values only)

History never performs financial calculations.

---

# Screen Structure

History

↓

Transactions

---

# Transaction Display

History displays a chronological list (timeline) of all Transactions made so far across the selected Financial Cycle.

There are no Daily Journal Cards or intermediate grouping screens in the History Module.

Each Transaction list item displays:

- Day Name (derived from date)
- Date
- Financial Cycle it belongs to 
- Category Icon
- Transaction Title
- Amount
- Time
- Category
- Fast Entry Indicator (if applicable)
- Receipt Indicator (if attached)

Selecting a Transaction opens the Transaction Details page, which displays all important information linked to a transaction.

---

# Search

History supports searching across Transactions.

Supported search fields:

- Transaction Title
- Notes
- Store Name
- Restaurant Name
- Provider Name
- Category-specific fields

Search returns matching Transactions directly.

---

# Filters

Users can filter History by:

- Financial Cycle
- Category
- Expense / Income
- Date Range
- Fast Entries
- Receipt Attached

Multiple filters may be combined.

---

# Sorting

Supported sorting options:

- Newest First (default)
- Oldest First
- Highest Amount
- Lowest Amount
- Alphabetical

Sorting applies to Transactions within the selected History view.

---

# Editing Transactions

When editing a Transaction:

1. Load Transaction.
2. Open Transaction Form.
3. Save changes.
4. Transaction Lifecycle Service updates the Transaction.
5. Financial Engine recalculates affected values.
6. Daily Journal summary updates automatically.
7. Financial Cycle updates the data 

History refreshes automatically.

---

# Deleting Transactions

When deleting a Transaction:

1. Display confirmation dialog.
2. Delete through Transaction Lifecycle Service.
3. Financial Engine updates balances.
4. Daily Journal Updates
5. Financial Cycle data updates 
6. Daily Journal summary updates.

History refreshes automatically.

---

# Refresh Behaviour

History automatically refreshes whenever:

- Transaction Created
- Transaction Updated
- Transaction Deleted

No manual refresh is required.

---

# Firestore Queries

History retrieves:

Financial Cycle

↓

Transactions

ORDER BY dateTime DESC

All queries should be scoped to the selected Financial Cycle.

---

# Business Rules

Rule 1

History displays all transactions 

---

Rule 2

Transactions belong directly to the selected Financial Cycle for the purpose of the History timeline.

---

Rule 3

History never performs financial calculations.

All financial summaries originate from the Financial Engine.

---

Rule 4

Deleting the final Transaction automatically removes the empty Daily Journal.

---

Rule 5

Editing a Transaction immediately updates the corresponding Daily Journal summary.

---

Rule 6

History is a read-oriented module.

All create, update and delete operations must be delegated to the Transaction Lifecycle Service.

---

# Architecture Principles

History is a presentation and navigation module.

Transactions remain the single source of financial records.

The Financial Engine provides all financial summaries.

The History Module combines these backend entities into a chronological financial timeline for the user.
