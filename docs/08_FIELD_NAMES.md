# Complete Data Dictionary & Field Names

This document provides a comprehensive mapping of all fields for all data structures in the application. It reflects the exact, un-normalized field names and types as they exist in the codebase.

## 1. User & Authentication (`AuthUser`)
**Location:** `src/types/auth.ts`
**Description:** The core user object returned upon successful login.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `userId` | `string` | The unique identifier for the user (e.g., `dev_jeremy`). Used to scope all private data. |
| `username` | `string` | The user's login identifier/username. |

---

## 2. Financial Settings (`FinancialSettings`)
**Location:** `src/services/financialSettings.service.ts`
**Firestore Path:** `users/{userId}/settings/financial`
**Description:** The user's global financial configuration and preferences.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `profileName` | `string?` | Optional display name for the user profile. Set during onboarding. |
| `profilePicture` | `string?` | Optional URL for the user's avatar. |
| `monthlyBudget` | `number` | The base monthly budget assigned to new cycles. Set during onboarding. |
| `carryForwardEnabled` | `boolean` | Whether unspent balance from the previous cycle rolls over. Set during onboarding. |
| `budgetThresholds` | `object` | Contains `comfortable`, `onTrack`, and `tight` (numbers) to determine UI colors based on spend percentage. |
| `currency` | `string` | The user's preferred currency code (e.g., `INR`). Defaulted to `INR` during onboarding. |
| `cycleConfiguration` | `object` | Contains `startDate` (Date), `cycleLengthDays` (number), and `autoCreateNextCycle` (boolean). `startDate` is set from the user's chosen cycle start date during onboarding. |
| `hiddenCategoryIds` | `string[]?` | Array of category IDs the user has chosen to hide from the UI. |
| `isOnboarded` | `boolean?` | Tracks whether the user has completed initial account setup. `false` or absent = onboarding required. `true` = account is fully initialized. Legacy users without this field are treated as already onboarded. |

---

## 2a. Onboarding Input (`OnboardingInput`)
**Location:** `src/services/onboarding.service.ts`
**Description:** The finalized data collected from the onboarding questionnaire and passed to `OnboardingService.completeOnboarding()`. Maps directly to the Phase 2 data contract fields.

| Field Name | Type | Required | Maps To |
| :--- | :--- | :--- | :--- |
| `profileName` | `string?` | Optional | `FinancialSettings.profileName` |
| `monthlyBudget` | `number` | Yes | `FinancialSettings.monthlyBudget` |
| `cycleStartDate` | `Date` | Yes | `FinancialSettings.cycleConfiguration.startDate`, `FinancialCycle.startDate` |
| `cycleName` | `string` | Yes | `FinancialCycle.cycleName` |
| `carryForwardEnabled` | `boolean` | Yes | `FinancialSettings.carryForwardEnabled` |

`currency` is not collected from the user — it is set automatically to `"INR"` (system default).
`cycleEndDate` is not in the input — it is calculated internally by `calculateCycleEndDate()` using calendar-month arithmetic.


## 3. Financial Cycles (`FinancialCycle`)
**Location:** `src/services/financialCycle.service.ts`
**Firestore Path:** `users/{userId}/financialCycles/{cycleId}`
**Description:** A time-bounded ledger period (e.g., a month) containing budget snapshots and aggregate totals.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `cycleId` | `string` | Unique identifier generated based on start date (e.g., `cycle_2026_08_01`). |
| `cycleName` | `string` | Display name for the cycle (e.g., `Current Cycle`). |
| `startDate` | `Date` | The exact start date and time of the cycle boundary. |
| `endDate` | `Date` | The exact end date and time of the cycle boundary. |
| `cycleLengthDays` | `number` | Snapshot of the length of the cycle in days. |
| `budgetSnapshot` | `object` | Snapshot of budget logic at creation. Contains `monthlyBudget`, `carryForward`, and `availableBalance` (all numbers). |
| `totalSpent` | `number` | Running total of all `EXPENSE` transactions in this cycle. |
| `transactionCount` | `number` | Running total of the number of transactions in this cycle. |
| `categorySummary` | `object?` | Map of `categoryId` to an object containing `totalSpent`, `transactionCount`, and `lastTransactionAt`. |
| `status` | `string` | Enum: `'ACTIVE' \| 'COMPLETED' \| 'ARCHIVED'`. |
| `createdAt` | `Date` | Creation timestamp. |
| `updatedAt` | `Date` | Last modified timestamp. |

---

## 4. Transactions (`Transaction`)
**Location:** `src/services/transaction.service.ts`
**Firestore Path:** `users/{userId}/transactions/{transactionId}`
**Description:** Individual income or expense ledger entries.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `transactionId` | `string` | Unique Firestore document ID. |
| `userId` | `string` | The ID of the user who owns this transaction. |
| `cycleId` | `string` | The ID of the cycle this transaction belongs to. |
| `journalId` | `string` | The ID of the daily journal this transaction falls under. |
| `categoryId` | `string` | The ID of the category this transaction is grouped under. |
| `templateId` | `string` | The ID of the template schema used for `transactionDetails`. |
| `transactionType` | `string` | Enum: `'EXPENSE' \| 'INCOME'`. |
| `title` | `string` | Display title of the transaction. |
| `amount` | `number` | The monetary value of the transaction. |
| `date` | `Date` | The exact date and time the transaction occurred. |
| `note` | `string?` | Optional user notes. |
| `receiptUrl` | `string?` | Optional URL to an uploaded receipt image. |
| `fastEntryId` | `string?` | Optional ID if this transaction was spawned from a Fast Entry. |
| `source` | `string?` | Optional indicator of origin. |
| `transactionDetails` | `Record<string, any>` | Dynamic payload containing fields dictated by the `templateId` (e.g., `storeName`, `modeOfTravel`). |
| `createdAt` | `Date` | Creation timestamp. |
| `updatedAt` | `Date` | Last modified timestamp. |

---

## 5. Daily Journals (`DailyJournal`)
**Location:** `src/services/dailyJournal.service.ts`
**Firestore Path:** `users/{userId}/financialCycles/{cycleId}/dailyJournals/{journalId}`
**Description:** Aggregated daily summaries of transactions for dashboard fast-loading.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `journalId` | `string` | Unique ID based on date (e.g., `journal_2026_08_01`). |
| `cycleId` | `string` | The ID of the parent cycle. |
| `date` | `Date` | The specific date this journal represents (start of day). |
| `dayName` | `string` | String representation of the day of the week (e.g., `Monday`). |
| `dayNumber` | `number` | The date number of the month. |
| `transactionCount` | `number` | Running total of transactions on this day. |
| `totalSpent` | `number` | Running total of expenses on this day. |
| `categorySummary` | `object?` | Same structure as cycle's `categorySummary` but scoped strictly to this day. |
| `createdAt` | `Date` | Creation timestamp. |
| `updatedAt` | `Date` | Last modified timestamp. |

---

## 6. Fast Entries (`FastEntry`)
**Location:** `src/services/fastEntry.service.ts`
**Firestore Path:** `users/{userId}/fastEntries/{fastEntryId}`
**Description:** User-saved quick templates for repetitive transactions.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `fastEntryId` | `string` | Unique Firestore document ID. |
| `transactionId` | `string` | Pointer to the historical `Transaction` used as the source template. |
| `displayName` | `string` | The user-facing name for this quick entry. |
| `usageCount` | `number` | How many times this fast entry has been triggered. |
| `lastUsedAt` | `Date?` | Timestamp of last usage. |
| `createdAt` | `Date` | Creation timestamp. |
| `updatedAt` | `Date` | Last modified timestamp. |

---

## 7. Categories (`Category`)
**Location:** `src/services/category.service.ts`
**Firestore Path:** `categories/{categoryId}` (GLOBAL)
**Description:** System-wide definitions for transaction categories.

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `categoryId` | `string` | Unique ID (e.g., `cat_groceries`). |
| `name` | `string` | Display name. |
| `type` | `string` | Enum: `'EXPENSE' \| 'INCOME'`. |
| `isActive` | `boolean` | Whether this category is currently active in the system. |
| `isSystem` | `boolean` | Indicates this is a hardcoded system category. |
| `icon` | `string` | String identifier for the Lucide icon to use. |
| `color` | `string` | Hex color code for the category. |
| `createdAt` | `Date` | Creation timestamp. |
| `updatedAt` | `Date` | Last modified timestamp. |

---

## 8. Templates & Fields (`TransactionTemplate` & `TemplateField`)
**Location:** `src/constants/templates.ts`
**Firestore Path:** `templates/{templateId}` (GLOBAL)
**Description:** System-wide schemas dictating what dynamic fields are required for a specific category.

### `TransactionTemplate`
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `templateId` | `string` | Unique ID (e.g., `tpl_groceries`). |
| `categoryId` | `string` | The ID of the category this template applies to. |
| `name` | `string` | Display name of the template. |
| `version` | `number` | Schema version tracking. |
| `fields` | `TemplateField[]` | Array of field definitions. |
| `isActive` | `boolean` | Whether this schema is currently enforced. |
| `createdAt` | `Date?` | Creation timestamp. |
| `updatedAt` | `Date?` | Last modified timestamp. |

### `TemplateField` (Inside `TransactionTemplate.fields`)
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `fieldId` | `string` | The object key used in `Transaction.transactionDetails`. |
| `type` | `string` | Enum: `'TEXT' \| 'NUMBER' \| 'DROPDOWN'`. |
| `label` | `string` | UI display label. |
| `options` | `string[]?` | Strict selection options if `type` is `DROPDOWN`. |
| `suggestions` | `string[]?` | Autocomplete suggestions if `type` is `TEXT`. |
| `required` | `boolean` | Whether the UI mandates this field. |
| `setsTitle` | `boolean?` | If true, filling this field automatically populates the `Transaction.title`. |
