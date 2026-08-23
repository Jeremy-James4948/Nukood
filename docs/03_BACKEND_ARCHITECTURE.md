# Backend Architecture

This document outlines the core backend architecture and infrastructure decisions for the Personal Expenses application.

## 1. Firebase Configuration & Setup
- **Environment**: Secrets and keys are configured safely via Vite environment variables (`.env.local`).
- **Initialization**: Centralized Firebase app, Firestore, and Auth initialization inside `src/lib/firebase.ts`.
- **Active Services**: Firestore (Database) and Firebase Authentication (pending).

### 1.1 Development Authentication System

During the current development phase, a **temporary development authentication system** is implemented. 
We are NOT using Firebase Authentication yet.

#### Architecture
The authentication logic is abstracted to allow a seamless swap to Firebase later without affecting the UI or protected routes:
`Login Page -> Auth Context -> Auth Service -> Auth Provider Interface -> Development Auth Provider`

- **Auth Service & Interface**: `src/services/auth/authService.ts` and `src/types/auth.ts` define standard methods (`signIn`, `signOut`, `getCurrentUser`, `subscribeToAuthState`).
- **Provider**: `DevelopmentAuthProvider` currently implements this interface.
- **Session Persistence**: Sessions are saved to `localStorage` under `nukood_dev_auth_session` to persist across reloads. *No passwords are stored in localStorage.*

#### Development Users
The following hardcoded users are strictly for development. **These credentials are not stored in Firestore** and must not be used as production authentication:

| Username | Password  | User ID (AuthUser) |
| -------- | --------- | ------------------ |
| JJ       | jj123     | dev_jj             |
| jeremy   | jeremy123 | dev_jeremy         |

#### Future Firebase Compatibility
Because the rest of the application (UI, transactions, cycles) depends solely on the generic `AuthUser` interface and `AuthContext`, replacing the `DevelopmentAuthProvider` with a `FirebaseAuthProvider` in the future will require zero changes to the underlying business logic or component hierarchy.

---

## 2. Onboarding Service Architecture

### Overview

The Onboarding Service is the single, authoritative entry point for converting a newly authenticated user into a fully initialized Nukood account.

It receives the finalized onboarding configuration, validates it, creates the user's Financial Settings and first Financial Cycle atomically, and marks the account as initialized.

The UI must never write directly to Firestore during onboarding. All initialization must pass through this service.

### Location

`src/services/onboarding.service.ts`

### Entry Point

```typescript
OnboardingService.completeOnboarding(userId: string, input: OnboardingInput): Promise<OnboardingResult>
```

`userId` must always come from the application's auth layer — never from a value submitted by the UI.

### Onboarding Input (`OnboardingInput`)

The `OnboardingInput` interface represents the finalized answers from the Phase 2 questionnaire:

```typescript
interface OnboardingInput {
  profileName?: string;       // Optional. Maps to FinancialSettings.profileName
  monthlyBudget: number;      // Maps to FinancialSettings.monthlyBudget
  cycleStartDate: Date;       // Maps to FinancialSettings.cycleConfiguration.startDate
  cycleName: string;          // Maps to FinancialCycle.cycleName
  carryForwardEnabled: boolean; // Maps to FinancialSettings.carryForwardEnabled
}
```

### Validation

All fields are validated before any Firestore operation:

| Field | Rules |
| :--- | :--- |
| `monthlyBudget` | Must be a finite number. Must be >= 0. |
| `cycleStartDate` | Must be a valid `Date`. Must not be `NaN`. |
| `cycleName` | Must be a non-empty string (trimmed). Max 30 characters. |
| `carryForwardEnabled` | Must be a `boolean`. |
| `profileName` | Optional. If provided, must be a string. Max 50 characters. |

Invalid input throws `OnboardingValidationError` (with a `.field` property) before any Firestore write occurs.

### Initialization Flow

```text
completeOnboarding(userId, input)
  │
  ├── 1. Validate input (throws OnboardingValidationError if invalid)
  ├── 2. Check isOnboarded — return existing state if already initialized (idempotent)
  ├── 3. Normalize startDate to beginning-of-day
  ├── 4. calculateCycleEndDate(startDate) — calendar-month arithmetic
  ├── 5. Load global categories → build categorySummary for first cycle
  ├── 6. writeBatch(db)
  │       ├── set users/{userId}/settings/financial  (includes isOnboarded: true)
  │       └── set users/{userId}/financialCycles/{cycleId}
  └── 7. batch.commit() — atomic; all or nothing
```

### Cycle End Date Calculation (`calculateCycleEndDate`)

The exported `calculateCycleEndDate(startDate: Date): Date` utility computes the last day of the first cycle using calendar-month arithmetic:

```text
endDate = (startDate + 1 calendar month) - 1 day

Examples:
  Aug 15 → Sep 14
  Aug  1 → Aug 31
  Jan 31 → Feb 27/28  (month-overflow clamped correctly)
  Feb 29 → Mar 28     (leap year handled)
```

Simple day-addition (e.g. `+ 30 days`) is NOT used — the calculation correctly handles February, leap years, and months of varying length.

### Idempotency

`getUserInitializationState(userId)` is called before any write.

- **`isOnboarded === true`** or **legacy user without the field** → return existing state immediately, no writes.
- **`isOnboarded === false` or no settings document** → proceed with initialization.

Calling `completeOnboarding()` twice is safe — the second call returns `wasAlreadyOnboarded: true` and creates no duplicate data.

### Atomicity

All writes (Financial Settings + First Financial Cycle + `isOnboarded = true`) are committed inside a single Firestore `writeBatch`. If the batch fails:

- No writes land.
- `isOnboarded` remains `false`.
- The user is never falsely marked as initialized with missing data.

### Existing User Protection

The service never runs initialization against a user whose `getUserInitializationState()` returns `true`. Existing users (including legacy users without the `isOnboarded` field) are returned immediately with their unchanged data.

### What the Onboarding Service Does NOT Do

- Does not create Category records (Categories are global).
- Does not create Template records (Templates are global).
- Does not write Transaction data.
- Does not modify the Financial Engine.
- Does not handle login routing.
- Does not render any UI.

---

## 3. Financial Settings Architecture

### Overview
The Financial Settings entity acts as the application's financial configuration center.
Its responsibility is to define how the application's budgeting system behaves and how new Financial Cycles are created.
This document stores long-term financial preferences only.
It must never store transactional information or values that change frequently during daily usage.

Examples of data that do **not** belong here include:
- Current Balance
- Remaining Balance
- Total Expenses
- Current Daily Budget
- Current Financial Cycle
- Reports
- Transactions

Those values are either stored inside Financial Cycle documents or calculated dynamically.

### Firestore Path
`users/{userId}/settings/financial`
Each user owns exactly one Financial Settings document.

### Responsibilities
Financial Settings is responsible for:
- Defining the user's Monthly Budget.
- Determining whether Carry Forward is enabled.
- Configuring Budget Health Indicator thresholds.
- Defining the application's display currency.
- Configuring how Financial Cycles are created.
- Tracking whether the user has completed initial account setup (`isOnboarded`).

Financial Settings does **not** own any transactional or historical financial data.

### Document Structure

#### `monthlyBudget`
- **Type**: Number
- **Required**: Yes
- **Default**: 0
- **Description**: Represents the fixed amount allocated whenever a new Financial Cycle is created.
- **Business Rules**:
  - Must be greater than or equal to 0.
  - Updating this value never changes existing Financial Cycles.
  - Only future Financial Cycles use the updated value.

#### `carryForwardEnabled`
- **Type**: Boolean
- **Required**: Yes
- **Default**: true
- **Description**: Determines whether any remaining balance from the previous Financial Cycle should be added to the next Financial Cycle.
- **Business Rules**:
  - **Enabled**: New Available Balance = Previous Remaining Balance + Monthly Budget
  - **Disabled**: New Available Balance = Monthly Budget
  - Changing this setting only affects newly created Financial Cycles. Existing Financial Cycles remain unchanged.

#### `budgetThresholds`
- **Type**: Object
- **Required**: Yes
- **Default**: `{ comfortable: 80, onTrack: 100, tight: 120 }`
- **Description**: Stores the threshold values used when calculating the Budget Health Indicator. These values define the application's Budget Health logic.
- **Business Rules**:
  - The Budget Health Indicator itself is never stored.
  - Instead, it is calculated dynamically by comparing: Average Daily Spending against Recommended Daily Budget.

#### `currency`
- **Type**: String
- **Required**: Yes
- **Default**: `INR`
- **Description**: Defines the currency displayed throughout the application.
- **Business Rules**:
  - Changing the currency updates only the displayed currency symbol. No monetary conversion is ever performed.
  - Supported examples include: INR, USD, EUR, GBP.

#### `cycleConfiguration`
- **Type**: Object
- **Required**: Yes
- **Description**: Defines how new Financial Cycles are generated.

  **`startDate`**
  - **Type**: Date
  - **Required**: Yes
  - **Description**: The first day of the user's active Financial Cycle. This acts as the reference point for generating all future Financial Cycles.

  **`cycleLengthDays`**
  - **Type**: Number
  - **Required**: Yes
  - **Default**: 31
  - **Description**: Defines the duration of one Financial Cycle. The application currently uses a fixed 31-day budgeting cycle.
  - **Business Rules**: Every newly created Financial Cycle spans exactly this number of days. Future versions may support configurable cycle lengths without changing the overall architecture.

  **`autoCreateNextCycle`**
  - **Type**: Boolean
  - **Required**: Yes
  - **Default**: true
  - **Description**: Determines whether the application should automatically create the next Financial Cycle once the current cycle has ended.
  - **Business Rules**:
    - **When enabled**: The application automatically creates the next Financial Cycle, applies the configured Monthly Budget, applies Carry Forward if enabled, and stores the Financial Cycle snapshot.
    - **When disabled**: The user must manually create the next Financial Cycle.

#### `isOnboarded`
- **Type**: Boolean (optional)
- **Required**: No
- **Default**: absent (treated as `true` for legacy users)
- **Description**: Tracks whether the user has completed the initial account setup flow.
- **Values**:
  - `false`: User has authenticated but not yet completed onboarding. The Financial Engine must not auto-create default settings or cycles.
  - `true`: User has completed onboarding. Account is fully initialized.
  - absent: Legacy user created before this field existed. Treated as `true` by `getUserInitializationState()`.
- **Set by**: `OnboardingService.completeOnboarding()` — set to `true` atomically alongside the first Financial Cycle write.
- **Business Rules**:
  - Must never be set to `true` before the first Financial Cycle has been successfully committed.
  - Must never be changed back to `false` after being set to `true`.

### Relationships
Financial Settings directly influences:
- Financial Cycles
- Budget Health
- Daily Budget
- Journal
- Archive
- Reports

However, it owns none of their data. It only provides configuration.

### Calculated Values
The following values must never be stored inside Financial Settings:
- Remaining Balance
- Current Spending
- Daily Budget
- Budget Health Indicator
- Current Financial Cycle
- Total Expenses
- Available Balance

These values either belong to Financial Cycle documents or are calculated dynamically.

### Validation Rules
- `monthlyBudget`: Must be greater than or equal to 0.
- `carryForwardEnabled`: Required.
- `currency`: Must be one of the application's supported currencies.
- `budgetThresholds`: comfortable < onTrack < tight
- `cycleLengthDays`: Must be greater than 0.
- `startDate`: Required.

### Future Expansion
The current design intentionally separates configuration from financial history.
This architecture allows future support for:
- Multiple Wallets
- Savings Accounts
- Category Budgets
- Recurring Income
- Recurring Expenses
- Variable Cycle Lengths
- Shared Household Budgets

without requiring structural changes to the Financial Settings document.

### Architecture Principles
Financial Settings is a configuration document.
It should only answer one question: *"How should this user's financial system behave?"*
It must never answer: *"What is happening financially right now?"*
All real financial activity belongs inside Financial Cycle and Transaction documents.

---

## 4. Financial Cycles Architecture

### Overview
A Financial Cycle represents one complete budgeting period within the application.
It acts as a permanent financial snapshot for that cycle and preserves the financial state exactly as it existed when the cycle was created.

Unlike Financial Settings, which stores long-term financial configuration, Financial Cycles store historical financial data.
Every transaction recorded within the application belongs to exactly one Financial Cycle.

Financial Cycles are immutable historical records. Once created, they should never be regenerated or modified by future changes to Financial Settings.

### Firestore Path
`users/{userId}/financialCycles/{cycleId}`
Each user owns multiple Financial Cycle documents.

### Responsibilities
Financial Cycles are responsible for storing:
- Cycle information
- Budget snapshot
- Carry Forward snapshot
- Available Balance
- Spending totals
- Transaction count
- Financial status

Financial Cycles do not own:
- Transactions
- Categories
- Fast Entries
- Reports

These entities reference the Financial Cycle instead.

### Document Structure

#### `cycleId`
- **Type**: String
- **Required**: Yes
- **Description**: Unique identifier for the Financial Cycle.
- **Example**: `cycle_2026_08_01`

#### `cycleName`
- **Type**: String
- **Required**: Yes
- **Description**: User-facing name displayed throughout the application.
- **Examples**: August Budget, Semester 5, Vacation Budget, Cycle 08.
- *Note: Changing this value only affects the display name.*

#### `startDate`
- **Type**: Timestamp
- **Required**: Yes
- **Description**: The first day of the Financial Cycle. This date is copied from the Financial Settings configuration when the cycle is created.

#### `endDate`
- **Type**: Timestamp
- **Required**: Yes
- **Description**: The final day of the Financial Cycle. Unlike Financial Settings, this value is permanently stored because it forms part of the historical financial snapshot.

#### `cycleLengthDays`
- **Type**: Number
- **Required**: Yes
- **Default**: 31
- **Description**: The duration of the Financial Cycle. The current application uses a fixed 31-day budgeting cycle. This value is stored to allow future support for configurable cycle lengths.

#### `budgetSnapshot`
- **Type**: Object
- **Required**: Yes
- **Description**: Stores the financial configuration exactly as it existed when the Financial Cycle was created. This snapshot never changes.

  **`monthlyBudget`**
  - **Type**: Number
  - **Required**: Yes
  - **Description**: Monthly Budget copied from Financial Settings during Financial Cycle creation. Future changes to Financial Settings never modify this value.

  **`carryForward`**
  - **Type**: Number
  - **Required**: Yes
  - **Description**: Remaining balance carried into this Financial Cycle from the previous Financial Cycle. This value is calculated only once during creation.

  **`availableBalance`**
  - **Type**: Number
  - **Required**: Yes
  - **Description**: The total amount available for this Financial Cycle.
  - **Formula**: `Available Balance = Monthly Budget + Carry Forward`
  - *Note: This value acts as the opening balance for the Financial Cycle, but increases dynamically whenever Income Transactions are recorded.*

#### `totalSpent`
- **Type**: Number
- **Required**: Yes
- **Default**: 0
- **Description**: Stores the cumulative value of all expense transactions assigned to this Financial Cycle. Updated whenever transactions are added, edited or removed.

#### `transactionCount`
- **Type**: Number
- **Required**: Yes
- **Default**: 0
- **Description**: Stores the number of transactions belonging to this Financial Cycle. Used for summaries and future analytics.

#### `status`
- **Type**: String
- **Required**: Yes
- **Allowed Values**:
  - `ACTIVE`: Current Financial Cycle.
  - `COMPLETED`: Cycle has ended.
  - `ARCHIVED`: Optional future state for manually archived cycles.
- **Description**: Represents the current lifecycle state of the Financial Cycle.

#### `createdAt`
- **Type**: Timestamp
- **Required**: Yes
- **Description**: Timestamp indicating when the Financial Cycle document was created.

#### `updatedAt`
- **Type**: Timestamp
- **Required**: Yes
- **Description**: Timestamp updated whenever the Financial Cycle document changes.

### Relationships
One Financial Cycle can contain many Transactions.
Transaction lifecycle hooks strictly control financial recalculations.
Archive and Reports retrieve Financial Cycle information using this relationship.
History retrieves Transactions directly from the cycle.
Financial Cycles never directly contain Transaction documents.

### Business Rules
- **Rule 1**: Every transaction must belong to exactly one Financial Cycle.
- **Rule 2**: Every Financial Cycle stores its own historical budget snapshot. Future changes to Financial Settings never modify historical Financial Cycles.
- **Rule 3**: Carry Forward is calculated only once when the Financial Cycle is created. It is never recalculated afterwards.
- **Rule 4**: Available Balance is initially established at creation, but increases dynamically when Income Transactions are added.
- **Rule 5**: Remaining Balance is never stored. It is calculated dynamically. `Remaining Balance = Available Balance - Total Spent`.
- **Rule 6**: The application automatically creates the next Financial Cycle using the user's Financial Settings once the current cycle ends, provided automatic cycle creation is enabled.

### Validation Rules
- `cycleName`: Required
- `startDate`: Required
- `endDate`: Must occur after startDate
- `cycleLengthDays`: Must be greater than 0
- `monthlyBudget`: Must be greater than or equal to 0
- `carryForward`: Must be greater than or equal to 0
- `availableBalance`: Must be greater than or equal to 0
- `totalSpent`: Must be greater than or equal to 0
- `transactionCount`: Must be greater than or equal to 0
- `status`: Must be one of `ACTIVE`, `COMPLETED`, `ARCHIVED`

### Calculated Values
The following values should never be permanently stored inside the Financial Cycle document:
- Remaining Balance
- Daily Budget
- Budget Health Indicator
- Reports

These values should always be calculated dynamically using the stored financial data.

### Future Expansion
This design supports future features without structural changes, including:
- Multiple Wallets
- Savings Accounts
- Category Budgets
- Recurring Income
- Recurring Expenses
- Shared Household Budgets
- Financial Forecasting
- Advanced Analytics

### Architecture Principles
Financial Cycles represent historical financial snapshots.
They preserve exactly how a budgeting period looked when it occurred.
Configuration belongs to Financial Settings.
Historical financial data belongs to Financial Cycles.
Every transaction is assigned to exactly one Financial Cycle, making Financial Cycles the primary organizational unit for Journal, Archive, History, Reports and financial summaries.

---

## 5. Categories Architecture

### Overview
Categories define the different types of financial activities that can be recorded within the application.
A Category acts as an organizational layer that groups transactions into meaningful expense or income types.

Categories do not define transaction forms or business logic.
Instead, every Category references a Transaction Template, which determines how transactions belonging to that Category are recorded.
This separation ensures Categories remain lightweight, reusable, and independent of transaction form design.

### Firestore Path
`users/{userId}/categories/{categoryId}`
Each user owns their own Category collection.
The application initially creates a predefined set of default categories, but users may create additional custom categories.

### Responsibilities
Categories are responsible for:
- Identifying a transaction type.
- Providing display information throughout the application.
- Organizing transactions.
- Referencing the appropriate Transaction Template.

Categories are **not** responsible for:
- Transaction fields
- Form validation
- Business logic
- Financial calculations
- Reports
- Budgeting

Those responsibilities belong to other backend entities.

### Document Structure

#### `categoryId`
- **Type**: String
- **Required**: Yes
- **Description**: Unique identifier for the Category.
- **Examples**: groceries, food, transport, house, personal, entertainment, medical, college, balanceAdded.
- *Note: This value should remain constant even if the display name changes.*

#### `name`
- **Type**: String
- **Required**: Yes
- **Description**: Display name shown throughout the application.
- **Examples**: Groceries, Food, Transport.

#### `description`
- **Type**: String
- **Required**: No
- **Description**: Short explanation describing the purpose of the Category.
- **Example**: "Daily grocery and supermarket purchases."

#### `icon`
- **Type**: String
- **Required**: Yes
- **Description**: Identifier of the icon displayed throughout the application. Icons are purely visual and have no effect on business logic.

#### `color`
- **Type**: String
- **Required**: Yes
- **Description**: Primary accent colour used for this Category.
- The colour is used consistently throughout: Journal, History, Archive, Reports, Charts, Activity Rings.
- *Note: Changing the colour only affects presentation.*

#### `displayOrder`
- **Type**: Number
- **Required**: Yes
- **Description**: Determines the order in which Categories are displayed throughout the application. Categories should always appear according to this value rather than alphabetical order.

#### `templateId`
- **Type**: String
- **Required**: Yes
- **Description**: References the Transaction Template used by this Category.
- The Category itself never stores transaction form fields. Instead, it delegates form generation to its associated Transaction Template.
- **Example**: Groceries -> `groceries_template`, Transport -> `transport_template`.

#### `isDefault`
- **Type**: Boolean
- **Required**: Yes
- **Default**: true
- **Description**: Indicates whether the Category was provided by the application or created by the user. Default Categories cannot accidentally disappear during initial setup.

#### `createdAt`
- **Type**: Timestamp
- **Required**: Yes
- **Description**: Timestamp indicating when the Category was created.

#### `updatedAt`
- **Type**: Timestamp
- **Required**: Yes
- **Description**: Timestamp updated whenever the Category is modified.

### Relationships
- **One Category -> One Transaction Template**
- **One Category -> Many Transactions**

Transactions reference Categories using `categoryId`.
Fast Entries also reference Categories using `categoryId`.
Journal, Archive, and Reports use Categories for grouping and display, while History uses them for filtering.

### Business Rules
- **Rule 1**: Every Transaction must belong to exactly one Category.
- **Rule 2**: Every Category must reference exactly one Transaction Template.
- **Rule 3**: Changing a Category's display information (name, icon or colour) updates the application's presentation only. Existing Transactions remain associated with the same Category.
- **Rule 4**: Categories never store financial values. No balances, totals or reports belong to Categories.
- **Rule 5**: Categories only define transaction classification. Transaction behaviour is defined entirely by the linked Transaction Template.

### Validation Rules
- `categoryId`: Required, Must be unique
- `name`: Required, Cannot be empty
- `icon`: Required
- `color`: Required
- `displayOrder`: Must be greater than or equal to 0
- `templateId`: Required, Must reference an existing Transaction Template
- `isDefault`: Required

### Calculated Values
Categories do not contain calculated values.
They never store: Total Spending, Monthly Spending, Transaction Counts, Budget Allocation, Reports.
These values should always be calculated dynamically using Transactions.

### Default Categories
The application initially creates the following Categories:
- Groceries
- Food
- Transport
- House
- Personal
- Entertainment
- Medical
- College
- Balance Added

Each default Category references its own predefined Transaction Template.
Users may create additional custom Categories in the future.

### Future Expansion
This architecture supports:
- User-created Categories
- Category Icons
- Custom Colours
- Nested Categories
- Category Archiving
- Category-specific Budgets
- Shared Category Libraries

without requiring structural changes.

### Architecture Principles
Categories exist only to classify financial activity. They are intentionally lightweight.
Categories should never contain transaction form definitions or financial calculations.
Transaction recording behaviour belongs exclusively to Transaction Templates.
This separation ensures the backend remains modular, scalable and easy to maintain.

---

## 6. Transactions Architecture

### Overview
This document defines the data contract for every transaction category within Nukood.
It specifies exactly which data fields are collected for each category, how those fields behave, and how they are stored inside a Transaction document.

This document is referenced by:
- Frontend transaction forms
- Transaction validation
- Fast Entry creation
- Backend transaction services
- Future application development

This document does **not** define database collections.
It defines the structure of the `categoryData` object stored inside every Transaction document.

### Transaction Structure
Every Transaction consists of two parts: Core Transaction Fields and Category Data.

#### Core Transaction Fields
These fields exist on every Transaction regardless of Category.
```text
transactionId
userId
cycleId
categoryId
transactionType
title
amount
date
note
receiptUrl
fastEntryId
source
createdAt
updatedAt
```

#### Category Data
The `categoryData` object contains all user-entered information specific to the selected Category.
Each Category defines its own Transaction Data structure.

### Category Specifications

#### 1. Groceries
- **Purpose**: Records supermarket and grocery purchases while supporting quantity-based calculations.
- **Category Data**:
  ```json
  {
    "storeName": "",
    "quantity": 0,
    "unit": "",
    "pricePerUnit": 0
  }
  ```
- **Quick Suggestions**: Zepto, Blinkit, BigBasket
- **Behaviours**: Amount automatically updates when Quantity or Price Per Unit changes. If Amount is manually edited, Price Per Unit recalculates automatically.
- **Validation**:
  - Required: `quantity`, `unit`
  - Optional: `storeName`

#### 2. Food
- **Purpose**: Records meals, snacks and restaurant purchases.
- **Category Data**:
  ```json
  {
    "restaurantName": ""
  }
  ```
- **Quick Suggestions**: Swiggy, Zomato, Starbucks, VIT, Bava's
- **Behaviours**: Restaurant Name automatically becomes the Transaction Title.
- **Validation**:
  - Required: `restaurantName`

#### 3. Transport
- **Purpose**: Records travel and commuting expenses.
- **Category Data**:
  ```json
  {
    "mode": "",
    "startLocation": "",
    "destination": ""
  }
  ```
- **Behaviours**: No automatic calculations.
- **Validation**:
  - Required: `mode`
  - Optional: `startLocation`, `destination`

#### 4. House
- **Purpose**: Records household and accommodation expenses.
- **Category Data**:
  ```json
  {
    "expenseType": ""
  }
  ```
- **Behaviours**: Expense Type automatically becomes the Transaction Title.
- **Validation**:
  - Required: `expenseType`

#### 5. Personal
- **Purpose**: Records personal shopping and lifestyle expenses.
- **Category Data**:
  ```json
  {
    "subcategory": "",
    "quantity": 0
  }
  ```
- **Validation**:
  - Required: `subcategory`
  - Optional: `quantity`

#### 6. Entertainment
- **Purpose**: Records leisure and entertainment spending.
- **Category Data**:
  ```json
  {
    "activityType": "",
    "platformOrVenue": "",
    "groupOrOccasion": ""
  }
  ```
- **Validation**:
  - Required: `activityType`
  - Optional: `platformOrVenue`, `groupOrOccasion`

#### 7. Medical
- **Purpose**: Records healthcare-related expenses.
- **Category Data**:
  ```json
  {
    "expenseType": "",
    "providerName": ""
  }
  ```
- **Validation**:
  - Required: `expenseType`
  - Optional: `providerName`

#### 8. College
- **Purpose**: Records education and campus-related expenses.
- **Category Data**:
  ```json
  {
    "purpose": "",
    "quantity": 0,
    "pricePerUnit": 0
  }
  ```
- **Behaviours**: Purpose automatically becomes the Transaction Title. Amount automatically calculates from Quantity × Price Per Unit. Manual Amount updates recalculate Price Per Unit.
- **Validation**:
  - Required: `purpose`
  - Optional: `quantity`, `pricePerUnit`

#### 9. Balance Added
- **Purpose**: Records incoming money.
- **Category Data**:
  ```json
  {
    "sourceOfFunds": ""
  }
  ```
- **Validation**:
  - Required: `sourceOfFunds`

### Architecture Principles
Every Transaction always contains: Core Transaction Fields and Category Data.
Core Transaction Fields remain identical for every Transaction.
Only the Category Data changes according to the selected Category.
This architecture keeps the Transaction document consistent while allowing Categories to collect different information.
Future Categories should only require a new Category Data specification without changing the overall Transaction schema.

---

## 7. Fast Entries Architecture

### Overview
Fast Entries provide a quick way to recreate frequently used Transactions.
A Fast Entry is **not** a Transaction. It is a reusable shortcut that references an existing Transaction which has been marked as a Fast Entry.
The original Transaction remains the source of reusable transaction data.

Whenever a Fast Entry is used, the application reads the linked Transaction, copies its data, updates runtime values (such as the current date and Financial Cycle), and creates a completely new Transaction.
Fast Entries never represent financial activity and never affect balances.

### Firestore Path
`users/{userId}/fastEntries/{fastEntryId}`

### Responsibilities
Fast Entries are responsible for:
- Referencing reusable Transactions.
- Providing quick access to commonly used purchases.
- Prefilling Transaction forms.
- Tracking Fast Entry usage.

Fast Entries are **not** responsible for:
- Storing financial activity.
- Updating balances.
- Managing Financial Cycles.
- Replacing Transactions.

### Document Structure

#### `fastEntryId`
- **Type**: String
- **Required**: Yes
- **Description**: Unique identifier for the Fast Entry.

#### `transactionId`
- **Type**: String
- **Required**: Yes
- **Description**: References the Transaction that was originally marked as a Fast Entry. This Transaction acts as the reusable source when creating future Transactions.

#### `displayName`
- **Type**: String
- **Required**: Yes
- **Description**: Display name shown inside the Fast Entry list.
- **Examples**: Eggs (12 Pack), Chicken Breast (450g), Auto Ride, Milk (1L)

#### `usageCount`
- **Type**: Number
- **Required**: Yes
- **Default**: 0
- **Description**: Tracks how many times this Fast Entry has been used.

#### `lastUsedAt`
- **Type**: Timestamp
- **Required**: No
- **Description**: Stores the most recent usage timestamp.

#### `createdAt`
- **Type**: Timestamp
- **Required**: Yes

#### `updatedAt`
- **Type**: Timestamp
- **Required**: Yes

### Usage Workflow

#### Creating a Fast Entry
1. User enables "Save as Fast Entry" on a Transaction form.
2. Transaction saved normally.
3. Fast Entry document created, storing reference to `transactionId`.
4. Fast Entry appears inside Journal.

#### Using a Fast Entry
1. Read linked Transaction.
2. Copy entire Transaction data.
3. Replace runtime values: `date`, `time`, `cycleId`, `createdAt`, `updatedAt`.
4. Open pre-filled Transaction Form (User may edit any value).
5. Save -> Create completely NEW Transaction.

### Validation
- **Required**: `fastEntryId`, `transactionId`, `displayName`
- **Optional**: `lastUsedAt`
- **Automatically managed**: `usageCount`, `createdAt`, `updatedAt`

### Relationships
- **One Transaction -> Zero or One Fast Entry**
- **One Fast Entry -> Many Transactions Created From It**

Historical Transactions remain completely independent after creation.

### Architecture Principles
- Transactions are the single source of truth.
- Fast Entries are lightweight references to reusable Transactions.
- Fast Entries never duplicate Transaction data.
- Fast Entries never modify historical Transactions.
- Deleting a Fast Entry never deletes the linked Transaction.
- Using a Fast Entry always creates a brand new Transaction with updated runtime values while preserving the original reusable transaction data.

---

## 8. Transaction Lifecycle Service

### Overview
The Transaction Lifecycle Service is responsible for managing the complete lifecycle of every Transaction within Nukood.
It acts as the central orchestration layer between Transactions, Financial Cycles, Fast Entries and the Financial Engine.
The service ensures that every Transaction follows a consistent workflow from creation to deletion while maintaining financial integrity throughout the application.

The Transaction Lifecycle Service is **not** responsible for financial calculations.
Financial calculations are delegated to the Financial Engine.

### Responsibilities
The Transaction Lifecycle Service is responsible for:
- Creating Transactions.
- Validating Transaction data.
- Updating existing Transactions.
- Deleting Transactions.
- Assigning Transactions to Financial Cycles.
- Managing Fast Entry creation.
- Triggering Financial Engine recalculations.
- Maintaining data consistency.

The Transaction Lifecycle Service is **not** responsible for:
- Budget calculations.
- Dashboard calculations.
- Reports.
- Category definitions.
- Financial Settings.

### Service Operations
The Transaction Lifecycle Service exposes the following operations:
- Create Transaction
- Update Transaction
- Delete Transaction
- Retrieve Transaction
- Create Fast Entry
- Remove Fast Entry

### Transaction Creation Workflow
When a user creates a Transaction:
1. Validate all required fields.
2. Validate Category Data according to the selected Category Specification.
3. Determine the currently active Financial Cycle.
4. Generate a new Transaction ID.
5. Save the Transaction.
6. If "Save as Fast Entry" is enabled:
   - Create a Fast Entry linked to this Transaction.
7. Notify the Financial Engine.
8. Financial Engine updates:
   - Total Spent
   - Available Balance (if applicable)
   - Remaining Balance
   - Daily Available Budget
   - Budget Health
9. Return success.

### Transaction Update Workflow
When a user edits a Transaction:
1. Retrieve the existing Transaction.
2. Validate updated values.
3. Update the Transaction.
4. Notify the Financial Engine.
5. Recalculate all affected financial values.
6. Return success.

*If the Transaction is linked to a Fast Entry, the Fast Entry remains unchanged unless the user explicitly chooses to update it.*

### Transaction Deletion Workflow
When a user deletes a Transaction:
1. Retrieve the Transaction.
2. Check whether the Transaction is referenced by a Fast Entry.
3. If referenced:
   - Ask the user whether to remove the Fast Entry first.
   - Prevent orphaned Fast Entries.
4. Delete the Transaction.
5. Notify the Financial Engine.
6. Reverse the Transaction's financial impact.
7. Return success.

### Fast Entry Workflow
When a Transaction is marked as a Fast Entry:
1. Save the Transaction normally.
2. Create a Fast Entry linked to the Transaction ID.
3. Fast Entry becomes available in the Journal.

Using a Fast Entry:
1. Select Fast Entry.
2. Retrieve linked Transaction.
3. Copy Transaction data into a new Transaction form.
4. Replace runtime values: Date, Time, Financial Cycle, createdAt, updatedAt.
5. Allow the user to edit any field.
6. Save as a completely new Transaction.
7. Increment Fast Entry usage count.
8. Update lastUsedAt.

### Validation Rules
Before any Transaction is saved, the service must verify:
- Category exists.
- Financial Cycle exists and is active.
- Transaction data matches the selected Category Specification.
- Amount is valid.
- Required fields are present.
- Transaction type is valid.
- Date is valid.

*Transactions failing validation must not be saved.*

### Financial Engine Integration
The Transaction Lifecycle Service never performs financial calculations.
Instead, after every successful Transaction operation, it notifies the Financial Engine.

The Financial Engine is responsible for:
- Updating Total Spent.
- Updating Available Balance (where applicable).
- Updating Remaining Balance.
- Updating Daily Available Budget.
- Updating Budget Health.
- Updating Financial Cycle summaries.

### Firestore Interaction
The Transaction Lifecycle Service interacts with the following collections:
- Transactions
- Fast Entries
- Financial Cycles
- Financial Settings (read-only)

*No other collections should be modified by this service.*

### Error Handling
The service must gracefully handle:
- Missing Categories.
- Missing Financial Cycles.
- Invalid Transaction Data.
- Invalid Fast Entry references.
- Firestore write failures.
- Validation failures.

*No partial updates should occur. If any step fails, the operation should be rolled back or aborted before data becomes inconsistent.*

### Architecture Principles
- The Transaction Lifecycle Service is the single entry point for all Transaction operations.
- Transactions must never be written directly to Firestore from the UI.
- All Transaction creation, updates and deletions must pass through this service.
- The service guarantees consistent validation, correct Financial Cycle assignment, proper Financial Engine updates, safe Fast Entry management, and reliable backend behaviour across the application.

---

## 9. Daily Journals Architecture

### Overview

A Daily Journal represents a single calendar day within a Financial Cycle.

It acts as the parent container for all Transactions recorded on that day and serves as the backend representation of the Journal Card displayed throughout the application.

Daily Journals provide a structured way to organize daily financial activity, enabling efficient navigation, historical tracking, archive generation and reporting.

A Daily Journal is created automatically when the first Transaction of a new day is recorded.

No empty Daily Journals should ever exist.

### Firestore Path

`users/{userId}/financialCycles/{cycleId}/dailyJournals/{journalId}`

Every Daily Journal belongs to exactly one Financial Cycle.

### Responsibilities

Daily Journals are responsible for:

- Grouping Transactions by calendar day.
- Maintaining daily financial summaries.
- Powering the Journal carousel.
- Powering Archive daily cards.
- Acting as the source for daily reports.
- Providing quick daily financial overviews.

Daily Journals are **not** responsible for:

- Storing Transaction details.
- Performing financial calculations.
- Managing Categories.
- Managing Fast Entries.
- Managing Financial Cycles.

### Document Structure

#### `journalId`
- **Type**: String
- **Required**: Yes
- **Description**: Unique identifier for the Daily Journal.
- **Example**: `journal_2026_08_05`

#### `cycleId`
- **Type**: String
- **Required**: Yes
- **Description**: Reference to the Financial Cycle this journal belongs to.

#### `date`
- **Type**: Date
- **Required**: Yes
- **Description**: The calendar date represented by this Daily Journal.
- **Example**: `2026-08-05`

#### `dayName`
- **Type**: String
- **Required**: Yes
- **Description**: Human-readable weekday.
- **Examples**: Monday, Tuesday, Wednesday

#### `dayNumber`
- **Type**: Number
- **Required**: Yes
- **Description**: Calendar day number.
- **Example**: 5

#### `transactionCount`
- **Type**: Number
- **Required**: Yes
- **Default**: 0
- **Description**: Total number of Transactions recorded for this day. Automatically maintained.

#### `totalSpent`
- **Type**: Number
- **Required**: Yes
- **Default**: 0
- **Description**: Total Expense amount recorded for this day. Automatically maintained. Income Transactions do not contribute to this value.

#### `categorySummary`
- **Type**: Map (Record)
- **Required**: No
- **Default**: `{}`
- **Description**: Tracks aggregate spending metrics specifically for this day, grouped by category ID. Automatically maintained by the Financial Engine.

The `categorySummary` object contains keys matching `categoryId`, where each value is an object containing:
- `totalSpent` (Number): Total expense amount recorded under this category on this day.
- `transactionCount` (Number): Total number of transactions recorded under this category on this day.
- `lastTransactionAt` (Timestamp | null): Timestamp of the most recent transaction recorded under this category on this day.

#### `createdAt`
- **Type**: Timestamp
- **Required**: Yes
- **Description**: Timestamp indicating when the Daily Journal was created.

#### `updatedAt`
- **Type**: Timestamp
- **Required**: Yes
- **Description**: Timestamp updated whenever the journal summary changes.

### Relationships

- One Financial Cycle -> Many Daily Journals
- One Daily Journal -> Many Transactions

Every Transaction belongs to exactly one Daily Journal.
Transactions reference their parent Daily Journal using: `journalId`
The Daily Journal does **not** maintain a list of Transaction IDs.
Transactions are retrieved by querying: `WHERE journalId == currentJournalId` ordered by Transaction date and time.

### Creation Workflow

When the first Transaction is recorded for a calendar day:
1. Determine the active Financial Cycle.
2. Search for an existing Daily Journal for today's date.
3. If none exists:
   - Create a new Daily Journal.
4. Assign the Transaction to the Daily Journal.
5. Update:
   - transactionCount
   - totalSpent
6. Notify the Financial Engine.

### Transaction Workflow

Whenever a Transaction is created:
- Link the Transaction to its Daily Journal.
- Increment transactionCount.
- Update totalSpent if the Transaction is an Expense.

Whenever a Transaction is updated:
- Recalculate totalSpent if the amount changes.
- Update journal summary.

Whenever a Transaction is deleted:
- Decrement transactionCount.
- Reverse the Transaction's financial impact.
- Update totalSpent.

If a Daily Journal contains zero Transactions after deletion:
- Automatically delete the empty Daily Journal.
This ensures no empty Journal Cards exist.

### Journal Card Behaviour

Every Daily Journal is represented visually as a Journal Card.
The card displays:
- Date
- Total Spent
- Transaction Count

The card acts as a summary only.
Transaction details are displayed after opening the Journal.

### Journal Carousel Behaviour

The Journal screen displays one card per Daily Journal.
Rules:
- Newest Daily Journal appears first.
- Today's Daily Journal is automatically centred when available.
- Swipe left displays previous days.
- Swipe right displays newer days.
- Only days containing Transactions appear.

### Archive Integration

Completed Financial Cycles display Daily Journals as Archive Cards.
Archive Cards are strictly ordered chronologically (oldest first).
Each Archive Card represents one Daily Journal from that Financial Cycle.
Selecting a card opens all Transactions recorded on that day.

### History Integration

Unlike the Archive, the History Module spans active and completed cycles and does **not** use Daily Journals or Cards.
History directly retrieves all Transactions within a cycle, displaying them in a chronological flat list (newest first).
History is primarily a searchable, filterable timeline, rather than a visual calendar.

### Reports Integration

Reports use Daily Journals to:
- Calculate daily spending trends.
- Generate daily summaries.
- Display historical spending patterns.

Transactions remain the primary financial records.
Daily Journals provide efficient daily grouping.

### Validation Rules

- **date**: Required. One Daily Journal per calendar day within a Financial Cycle.
- **transactionCount**: Must be greater than or equal to 0.
- **totalSpent**: Must be greater than or equal to 0.
- **cycleId**: Must reference an existing Financial Cycle.

### Business Rules

- **Rule 1**: A Daily Journal is automatically created only when the first Transaction of a day is recorded.
- **Rule 2**: There can be only one Daily Journal for a calendar day within a Financial Cycle.
- **Rule 3**: Every Transaction must belong to exactly one Daily Journal.
- **Rule 4**: Daily Journals never exist without Transactions. If the final Transaction is removed, the Daily Journal is automatically deleted.
- **Rule 5**: Daily Journals are organizational containers. They never perform financial calculations.
- **Rule 6**: The Financial Engine updates Daily Journal summaries whenever Transactions change.

### Architecture Principles

Daily Journals organize financial activity by day.
Transactions remain the single source of financial records.
Daily Journals provide efficient daily grouping for the Journal, Archive, and Reports while maintaining a clean and scalable backend architecture.
