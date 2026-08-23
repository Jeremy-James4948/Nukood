# Overall Architecture & Audit Views

This document compiles the evidence-based audits of the Nukood codebase, specifically focusing on user initialization, authentication, routing, data isolation, and the transaction engine.

---

## 1. Authentication Implementation

### A. Where is authentication implemented?
- **Auth Context/Provider:** Implemented as `AuthProvider` and exported as a context in `src/context/AuthContext.tsx`. 
- **Hooks:** `useAuth` hook is provided to consume the auth state.
- **Auth Service:** `AuthService` in `src/services/auth/authService.ts` acts as an interface wrapper.
- **Provider Implementation:** The actual authentication logic is in `DevelopmentAuthProvider` at `src/services/auth/developmentAuthProvider.ts`.
- **Types/Interfaces:** Defined in `src/types/auth.ts`.
- **Routes involved:** Route protection is handled by `ProtectedRoute` (`src/app/ProtectedRoute.tsx`).

### B. What authentication method is CURRENTLY being used?
**Method:** Mock Authentication (Development Provider)
The application instantiates a development provider that simulates network delays and persists the session using the browser's `localStorage` under the key `nukood_dev_auth_session`. Firebase Authentication is **NOT** currently used for user authentication.

### C. How are the current development users represented?
The development users are hardcoded in `src/services/auth/developmentAuthProvider.ts`:
```typescript
const DEV_USERS: Record<string, AuthUser & { password: string }> = {
  'JJ': { userId: 'dev_jj', username: 'JJ', password: 'jj123' },
  'jeremy': { userId: 'dev_jeremy', username: 'jeremy', password: 'jeremy123' }
};
```
- **Identifiers:** Users log in using their `username` (dictionary key) and `password`.
- **Identity Representation:** Their unique identity in the system is represented by the `userId` field (e.g., `dev_jj`).

### D. What is the current authenticated-user object?
Defined in `src/types/auth.ts`:
```typescript
export interface AuthUser {
  userId: string;
  username: string;
}
```

---

## 2. Onboarding & Initialization

**No existing onboarding UI mechanism was found.** 
There are no flags, states, or UI components in the codebase to track or present an interactive onboarding flow (such as `isNewUser` or `onboardingCompleted`). 

### Silent Data Initialization Flow
However, there is a silent automatic data initialization that occurs in the background when a user logs in for the first time.
**File:** `src/context/FinancialEngineContext.tsx`
1. **Settings Initialization:** If no settings exist, it silently creates them with hardcoded defaults (e.g., 1500 INR monthly budget).
2. **Cycle Initialization:** If no cycle exists, it silently creates a new one called "Current Cycle".

---

## 3. Login → Routing Flow

1. **Login:** The user enters credentials in `src/pages/Login.tsx` and submits.
2. **Authentication Function:** Calls `await signIn(username, password)`.
3. **Auth State Update:** `DevelopmentAuthProvider` updates its state. `AuthContext` receives the update, setting `isAuthenticated = !!user`.
4. **Navigation/Router:** `Login.tsx` explicitly calls `navigate('/', { replace: true });`. Additionally, `<PublicOnlyRoute>` in `main.tsx` observes the state and navigates to `/`.
5. **Destination Page:** The root path (`/`), which loads `<App />` (protected by `<ProtectedRoute />`).
6. **Data Loading:** Inside `<App />`, the `<FinancialEngineProvider>` mounts and fetches (or silently initializes) the user's data.

**NEW USER vs EXISTING USER Distinction:**
**NOT IMPLEMENTED.** There is no routing logic or user state flag that differentiates a first-time user from a returning user.

---

## 4. Financial Settings Implementation

- **Storage Location:** Firestore Document at `users/{userId}/settings/financial`
- **Service:** `FinancialSettingsService` (`src/services/financialSettings.service.ts`)
- **Structure:**
```typescript
export interface FinancialSettings {
  profileName?: string;
  profilePicture?: string;
  hiddenCategoryIds?: string[];
  monthlyBudget: number;
  carryForwardEnabled: boolean;
  budgetThresholds: { comfortable: number; onTrack: number; tight: number; };
  currency: string;
  cycleConfiguration: { startDate: Date; cycleLengthDays: number; autoCreateNextCycle: boolean; };
}
```
- **Ownership:** The settings document is strictly isolated per user via the path structure.

---

## 5. Connection Between Settings and Cycles

The architecture uses a **Snapshot Model**:
```text
User
 ├──> Financial Settings (Global / Living Document)
 │
 └──> Financial Cycle (Time-bounded Document)
       └──> Budget Snapshot (Copied from Settings at creation)
```
When `FinancialCycleService.createNewCycle()` is called, it extracts values from the global `settings` object and hard-copies (snapshots) them into the new cycle's document (e.g., `budgetSnapshot`). Changing global settings later does not automatically update an existing cycle's budget snapshot.

---

## 6. Transaction Model & Service

- **Service:** `TransactionService` (`src/services/transaction.service.ts`)
- **Existing Required Fields:** `transactionId`, `userId`, `cycleId`, `categoryId`, `templateId`, `transactionType`, `amount`, `date`, `transactionDetails`.
- **Querying:** Scoped by cycle (`where('cycleId', '==', cycleId)`) or journal IDs (`where('journalId', 'in', chunk)`).
- **Creation/Update/Deletion:** Uses Firestore `writeBatch` to atomically update the transaction document alongside aggregate totals in both the `DailyJournal` and the `FinancialCycle` documents.
- **Ownership Enforcement:** 
  - **User:** Enforced via Path-Based Isolation: `collection(db, 'users', userId, 'transactions')`.
  - **Cycle:** Enforced via Foreign Key: The `cycleId` field on the transaction document payload.

---

## 7. User Data Isolation Verification

All core user data structures are strictly isolated using path-based namespaces in Firestore.

| Data Type | Firestore Path | Isolation Status |
| :--- | :--- | :--- |
| **Financial Settings** | `users/{userId}/settings/financial` | **VERIFIED** |
| **Financial Cycles** | `users/{userId}/financialCycles/{cycleId}` | **VERIFIED** |
| **Transactions** | `users/{userId}/transactions/{transactionId}` | **VERIFIED** |
| **Daily Journals** | `users/{userId}/financialCycles/{cycleId}/dailyJournals/{journalId}` | **VERIFIED** |
| **Fast Entries** | `users/{userId}/fastEntries/{fastEntryId}` | **VERIFIED** |

*Note: Global configuration definitions like `Categories` and `Templates` exist outside the `users` namespace as they are shared system read-only definitions.*

---

## 8. Context / State Management Audit

### Identified Contexts & Stores
The application relies on two primary React contexts for global state management:
1. **`AuthContext`** (`src/context/AuthContext.tsx`): Manages authentication state.
2. **`FinancialEngineContext`** (`src/context/FinancialEngineContext.tsx`): Manages all financial and user-specific data state.

*Note: There are no external state stores like Redux or Zustand.*

### State Categorization

| Domain / Concept | State Store | Global or User-Specific? | Persisted or Derived? |
| :--- | :--- | :--- | :--- |
| **Auth User** | `AuthContext` | Global (to the session) | Persisted (`localStorage`) |
| **Financial Settings** | `FinancialEngineContext` | **User-Specific** | Persisted (Firestore) |
| **Financial Cycles** | `FinancialEngineContext` | **User-Specific** | Persisted (Firestore) |
| **Transactions** | `FinancialEngineContext` | **User-Specific** | Persisted (Firestore) |
| **Daily Journals** | `FinancialEngineContext` | **User-Specific** | Persisted (Firestore) |
| **Fast Entries** | `FinancialEngineContext` | **User-Specific** | Persisted (Firestore) |
| **Global Categories**| `FinancialEngineContext` | **Global** (Shared definitions) | Persisted (Firestore) |
| **Global Templates** | `FinancialEngineContext` | **Global** (Shared definitions) | Persisted (Firestore) |

### Specific Determinations

- **Where is current user information available?**
  Available via the `useAuth()` hook (exposing the `user` object containing `userId` and `username`). This `userId` is then consumed by the `FinancialEngineContext` to scope all subsequent data fetching.
  
- **What state is derived?**
  - `isAuthenticated` inside `AuthContext` is derived dynamically (`!!user`).
  - Arrays like `transactions` and `dailyJournals` are held in local React state (`useState`) but are direct reflections (queries) of persisted Firestore data.
  
- **Does any context currently load ALL users' financial data into frontend state?**
  **NO.** 
  The `FinancialEngineContext` strictly fetches data using the specific `userId` provided by `useAuth()`. All service calls (e.g., `TransactionService.getTransactionsForCycle(userId, cycleId)`) explicitly require the `userId` as an argument to construct isolated Firestore queries (e.g., `collection(db, 'users', userId, ...)`). No cross-user data is ever loaded into the frontend state.
