# Entry Experience E0 — Architecture Audit

This document provides a complete architecture audit of Nukood's current Login, Authentication, Initialization, and Onboarding flow, strictly based on the existing codebase without making any modifications.

## 1. Trace the Current Login Flow
The exact path a user takes from the Login page to the main application:
1. **Login UI** (`src/pages/Login.tsx`): User clicks sign-in.
2. **Auth Action**: Calls `signIn(identifier, password)` from `AuthContext.tsx`.
3. **Auth Service**: `AuthContext` delegates to `AuthService.signIn`, which uses `DevelopmentAuthProvider` to validate credentials against a hardcoded dictionary.
4. **User Identification**: `AuthContext` updates its `user` state and sets `isAuthenticated = true`.
5. **Routing**: `PublicOnlyRoute` (in `main.tsx`) detects `isAuthenticated` and redirects the user from `/login` to `/`.
6. **Protection**: The `/` route is guarded by `<ProtectedRoute>`, which verifies authentication and allows the request through.
7. **Initialization Check**: The request hits `<InitializedRoute>`, which reads `isOnboarded` from `InitializationContext.tsx`.
8. **Onboarding / Main App**:
   - If `isOnboarded === false`: Redirects to `/onboarding`.
   - If `isOnboarded === true`: Renders the main `<App />`.

## 2. Authentication & User Identity
- **How users are authenticated**: Handled completely client-side in dev mode using a simulated network delay and local verification.
- **Active Provider**: `DevelopmentAuthProvider` (in `src/services/auth/developmentAuthProvider.ts`).
- **Where the ID comes from**: A hardcoded dictionary `DEV_USERS` (e.g., `'jeremy' -> 'dev_jeremy'`).
- **How the app obtains the ID**: Extracted via the `useAuth().user.userId` hook.
- **Client Spoofing**: Since the session is stored in `localStorage` (`nukood_dev_auth_session`), the ID can theoretically be spoofed by editing local storage in the browser, though the UI provides no way to do this.
- **Distinguishing users**: Purely by the `userId` string.
- **New user success**: If a brand-new user ID were to log in, `InitializationContext` would fetch their settings, find nothing, return `isOnboarded = false`, and route them to Onboarding.

## 3. Existing User vs New User
Nukood determines initialization state via the `isOnboarded` flag in `InitializationContext`.
- **Where state is stored**: Firestore document at `users/{userId}/settings/financial`.
- **How it is retrieved**: `FinancialSettingsService.getUserInitializationState(userId)`.
- **If document exists**: Returns the `isOnboarded` boolean field.
- **Legacy users**: If the document exists but the `isOnboarded` field is undefined, it safely assumes `true`.
- **If document does not exist**: Returns `false` (genuinely new user).
- **Bypass risk**: No automatic default initialization happens during this check. It is purely a read operation. Onboarding cannot be bypassed accidentally.

## 4. Initialization Provider
`InitializationContext.tsx` manages the setup state.
- **State managed**: `isOnboarded` (boolean | null), `isLoadingInitState` (boolean), `initError` (Error | null).
- **When it runs**: Mounts at the root and re-runs whenever `userId` changes.
- **What it fetches**: The financial settings document via `FinancialSettingsService`.
- **What it creates**: **Nothing.** It is strictly read-only.
- **Assumptions**: Assumes the user is authenticated (bails out if `userId` is null).
- **Decision logic**: `InitializedRoute` handles the redirect logic based on the context's three-state model.
- **Interference**: Since no default values are written during initialization, there is zero risk of it interfering with the future onboarding flow's data creation.

## 5. Current Onboarding
Onboarding **does exist** from Phase 5 work.
- **Location**: `src/features/onboarding/OnboardingPage.tsx`.
- **Routing**: Accessed at `/onboarding`, protected by `<OnboardingRoute>`.
- **Slides**: WELCOME → DISPLAY_NAME → BUDGET → CYCLE_DATE → CYCLE_NAME → CARRY_FORWARD → REVIEW → CONFIRM.
- **Answers**: Held entirely in a local React state object (`OnboardingDraft`).
- **Persistence**: Nothing is persisted immediately.
- **Navigation**: Going back retains answers in the draft state.
- **Interruptions**: Closing/reloading the app halfway through completely destroys all progress (the component unmounts and state is lost).
- **Completion**: On the CONFIRM slide, `OnboardingService.completeOnboarding()` is called to write the data, followed by `markAsOnboarded()` to trigger the router redirect.

## 6. Data Routing Audit
| Question / Value | Current UI Source | Destination | Firestore Path | Field | Persistence |
|---|---|---|---|---|---|
| Name | DisplayNameSlide | `profileName` | `users/{userId}/settings/financial` | `profileName` | On Confirm |
| Monthly Budget | BudgetSlide | `monthlyBudget` | `users/{userId}/settings/financial` | `monthlyBudget` | On Confirm |
| Cycle Start | CycleStartDateSlide | `cycleStartDate` | `users/{userId}/settings/financial` | `cycleConfiguration.startDate` | On Confirm |
| Cycle Name | CycleNameSlide | `cycleName` | `users/{userId}/financialCycles/{id}` | `cycleName` | On Confirm |
| Categories | **NOT IMPLEMENTED** | **NOT IMPLEMENTED** | **NOT IMPLEMENTED** | **NOT IMPLEMENTED** | **NOT IMPLEMENTED** |

## 7. Main Application Transition
- **Post-Completion**: `markAsOnboarded()` updates `InitializationContext` to `true`.
- **Routing**: `OnboardingRoute` detects `isOnboarded = true` and navigates to `/`. `<InitializedRoute>` then allows the `<App />` component to render.
- **Engine Start**: The `FinancialEngineProvider` initializes **after** onboarding is complete (since it sits inside `<App />`).
- **Duplicate Prevention**: The engine fetches the newly created settings and cycle. Since they already exist, it does not auto-create any defaults, preventing duplicate initialization.

## 8. Theme Interaction
- **Provider Location**: `<ThemeProvider>` wraps `<BrowserRouter>` in `main.tsx`.
- **Leakage**: The current application themes (Normal/Light/Dark) **completely leak** into both Login and Onboarding because they inherit global CSS variables from the `body` tag and `index.css`.
- **Safest Boundary**: The future `Entry Experience Theme` must operate *outside* or *above* the main `<ThemeProvider>`, or require a dedicated `theme-entry` class on the root layout that explicitly overrides or pauses the application design tokens.

## 9. Data Isolation & Security
- **CLIENT-SIDE LOGIC**: Excellent isolation. All reads/writes strictly use the `userId` provided by `AuthContext`. One user cannot initialize another's data via the UI flow.
- **DATABASE-LEVEL SECURITY**: Not verifiable from client code. Firestore Security Rules (`firestore.rules`) would dictate true security, but the client safely scopes all paths.

## 10. Potential Duplication / Race Conditions
- **Duplicate Initialization**: Prevented by `alreadyOnboarded` guard inside `OnboardingService.completeOnboarding()`.
- **Double Clicks**: Prevented by a `submittingRef.current` guard in the UI.
- **Refresh**: Results in a total loss of onboarding data (starts over from slide 0).
- **Auth State Changes**: Handled safely; `InitializationContext` immediately cancels in-flight fetches if `userId` changes.
- **Duplicate Cycles**: Prevented by the atomic batch write using a deterministic date-based `cycleId`.

## 11. Recommended Future Boundary
To properly isolate the new visual identity of the Entry Experience from the heavily themed main application, the architecture should be structured as follows in `main.tsx`:

```text
LOGIN / ENTRY SYSTEM (Isolated Theme)
  ↓
AUTHENTICATED USER
  ↓
INITIALIZATION CHECK
  ↓
┌─────────────────────────────────────────┐
│ isOnboarded === false                   │
│ ↓                                       │
│ Entry Experience Router                 │
│ (Custom layout, isolated design tokens) │
│ ↓                                       │
│ Onboarding Flow                         │
└─────────────────────────────────────────┘
          OR
┌─────────────────────────────────────────┐
│ isOnboarded === true                    │
│ ↓                                       │
│ Main Application Router                 │
│ (ThemeProvider, FinancialEngine, etc.)  │
└─────────────────────────────────────────┘
```
This ensures that the complex Application Theme does not bleed into the pristine Entry Experience.
