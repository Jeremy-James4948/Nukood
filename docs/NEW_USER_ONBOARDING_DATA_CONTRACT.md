# Nukood — New User Onboarding Data Contract

## 1. Purpose

This document defines the complete functional and data contract for Nukood's first-time user onboarding flow.

The onboarding experience is not merely a questionnaire. It is the controlled initialization process that converts a newly authenticated user into a usable Nukood account.

The system must ensure that:

- Each user's data is isolated from every other user's data.
- Every onboarding answer has a clearly defined destination.
- Answers are validated before being committed.
- The user can move backward and change answers before confirmation.
- Nothing is permanently initialized until the user confirms.
- Account initialization is idempotent and recoverable.
- Existing users are not accidentally sent through onboarding.
- Global Categories and Global Templates remain shared system definitions and are not duplicated per user.

---

# 2. Core Architecture

The overall flow is:

```text
LOGIN
  ↓
AUTHENTICATE USER
  ↓
IDENTIFY USER
  ↓
LOAD USER PROFILE / INITIALIZATION STATE
  ↓
Is onboarding completed?
  │
  ├── YES → LOAD USER DATA → DASHBOARD
  │
  └── NO
        ↓
   ONBOARDING FLOW
        ↓
   TEMPORARY ONBOARDING STATE
        ↓
   REVIEW
        ↓
   USER CONFIRMS
        ↓
   SECURE ACCOUNT INITIALIZATION
        ↓
   MARK ONBOARDING COMPLETE
        ↓
   DASHBOARD
```

---

# 3. Authentication and Identity

## 3.1 Current Development Authentication

The current development authentication system uses the development users:

```text
dev_jeremy
dev_jj
```

This is for development and architecture testing only.

It must not be treated as production-grade identity protection.

## 3.2 Future Production Authentication

The architecture must be compatible with Firebase Authentication.

The future identity flow will be:

```text
Firebase Authentication
        ↓
Firebase UID
        ↓
User Profile
        ↓
User-owned Firestore data
```

The application must avoid hardcoding user-specific logic such as:

```text
if user == Jeremy
if userId == dev_jeremy
```

All user-specific operations must use the currently authenticated user's identity generically.

---

# 4. User Initialization State

Every user needs an explicit onboarding/initialization state.

Conceptually:

```json
{
  "userId": "firebase_uid",
  "onboarding": {
    "completed": false,
    "completedAt": null
  }
}
```

After successful initialization:

```json
{
  "onboarding": {
    "completed": true,
    "completedAt": "..."
  }
}
```

The application must use this backend state to determine whether onboarding is required.

Do not rely only on:

- localStorage
- sessionStorage
- React state
- browser cookies
- a frontend-only flag

---

# 5. Login Routing

After authentication:

```text
Authenticated User
      ↓
Load User Profile
      ↓
Check onboarding.completed
```

If:

```text
onboarding.completed = true
```

route to the normal application/dashboard.

If:

```text
onboarding.completed = false
```

route to the onboarding experience.

The routing decision must be based on the authenticated user's own profile.

---

# 6. Existing User Handling

Existing users who already have valid Nukood data must not accidentally be treated as new users.

For the current development environment:

```text
dev_jeremy
```

already has existing application/financial data.

That data must remain intact.

Jeremy should not be forced through onboarding merely because the new onboarding feature has been introduced.

The implementation should establish an explicit initialized/onboarding-complete state for existing users where appropriate.

The development user:

```text
dev_jj
```

may be used as the new-user onboarding test account.

---

# 7. Onboarding Questions

Categories are NOT included as an onboarding question.

All global categories are available to all users.

Global categories currently include:

- Groceries
- Food
- Transport
- House
- Personal
- Entertainment
- Medical
- College
- Balance Added

The onboarding should instead collect only information required to initialize the user's personal financial environment.

---

# 8. Final Question Set

## 8.1 Welcome

### Purpose

Introduce Nukood and explain that the user is about to configure their financial environment.

### Backend Destination

None.

This is presentation-only.

### Required

No.

---

## 8.2 Display Name

### Question

> What should we call you?

### Answer Type

String.

### Backend Destination

```text
UserProfile.displayName
```

### Validation

- Must not be empty.
- Trim surrounding whitespace.
- Apply a sensible maximum length.
- Do not accept excessively long input.

### Required

Yes.

---

## 8.3 Monthly Budget

### Question

> How much would you like to budget for this cycle?

### Answer Type

Positive monetary number.

### Backend Destination

```text
FinancialSettings.monthlyBudget
```

### Validation

- Must be numeric.
- Must be greater than or equal to zero.
- Store as a numeric monetary value according to the application's existing money representation.
- Do not store formatted currency strings such as `"₹15,000"` as the canonical value.

### Default

A sensible zero/unconfigured value may be used if the application permits a zero-budget cycle, otherwise require an explicit positive amount.

### Required

Yes.

---

## 8.4 Cycle Start Date

### Question

> When should your financial cycle begin?

### Answer Type

Date.

### Backend Destination

```text
FinancialCycle.startDate
```

### Validation

- Must be a valid date.
- Normalize the stored value consistently.
- Respect the user's configured/local timezone when determining the calendar date.

### Required

Yes.

---

# 9. Financial Cycle End Date

The user does NOT manually enter the end date.

The system calculates it from the selected start date.

For a cycle beginning on the 15th:

```text
15 Aug → 14 Sep
```

For a cycle beginning on the 1st:

```text
1 Aug → 31 Aug
```

The implementation must use calendar-month logic rather than simply adding 30 days.

Conceptually:

```text
cycleEndDate =
the day before the same calendar day in the following month
```

The calculated result is stored as:

```text
FinancialCycle.endDate
```

The exact date arithmetic must correctly handle:

- February
- leap years
- months with 30 days
- months with 31 days
- start dates near the end of a month

The date calculation must be implemented centrally in the Financial Cycle service rather than duplicated in UI components.

---

# 10. Cycle Name

### Question

> What would you like to call this cycle?

### Answer Type

String.

### Backend Destination

```text
FinancialCycle.name
```

### Examples

```text
August
My August Budget
Semester Start
Monthly Cycle
```

### Validation

- Must not be empty.
- Trim whitespace.
- Apply a sensible maximum length.

### Required

Yes.

---

# 11. Carry Forward Preference

### Question

> Would you like unused budget to carry into your next cycle?

### Answer Type

Boolean.

### Backend Destination

```text
FinancialSettings.carryForward
```

### Options

```text
Yes
No
```

### Required

Yes.

A default may be provided, but the user should be able to change it.

---

# 12. Currency

Currency should not necessarily be asked during the initial onboarding if the application is currently designed around INR.

For the current Nukood implementation:

```text
currency = INR
```

may be initialized automatically.

### Backend Destination

```text
FinancialSettings.currency
```

If multi-currency support is introduced later, currency can become an onboarding question or settings option.

---

# 13. Question-to-Backend Mapping

Every onboarding answer must have an explicit destination.

| Onboarding Element | Answer | Destination |
|---|---|---|
| Welcome | None | None |
| Display Name | String | `UserProfile.displayName` |
| Monthly Budget | Number | `FinancialSettings.monthlyBudget` |
| Cycle Start Date | Date | `FinancialCycle.startDate` |
| Cycle End Date | Calculated | `FinancialCycle.endDate` |
| Cycle Name | String | `FinancialCycle.name` |
| Carry Forward | Boolean | `FinancialSettings.carryForward` |
| Currency | System default | `FinancialSettings.currency` |

This mapping is a hard architectural requirement.

No question should be added to the UI without defining its destination.

---

# 14. Temporary Onboarding State

During the onboarding slides, answers should initially exist in a temporary onboarding state.

Conceptually:

```json
{
  "displayName": "Jeremy",
  "monthlyBudget": 15000,
  "cycleStartDate": "2026-08-15",
  "cycleName": "August",
  "carryForward": true,
  "currency": "INR"
}
```

This state allows:

```text
Next
↓
Next
↓
Back
↓
Change Answer
↓
Next
```

without creating partially initialized financial records.

The UI should not independently write each answer into multiple backend collections.

---

# 15. Review Screen

After completing the questions, display a review screen.

The review should summarize the actual configuration that will be created.

Example:

```text
August

15 Aug → 14 Sep

Budget
₹15,000

Unused Budget
Carry Forward: Yes
```

The user has two choices:

```text
I like these choices
```

or:

```text
Nahh, let's start over
```

---

# 16. Restart Behaviour

If the user chooses:

```text
Nahh, let's start over
```

reset the onboarding draft state.

Do not delete:

- Financial cycles
- Financial settings
- Transactions

because no permanent initialization should have occurred yet.

---

# 17. Final Confirmation

After the review/confirmation stage, present a final confirmation message:

> Let's begin your journey?

The final confirmation is the point at which the user's onboarding data is committed to their account.

---

# 18. Account Initialization

The final confirmation should call a centralized onboarding orchestration service.

Conceptually:

```text
OnboardingService.completeOnboarding()
```

The service receives the validated onboarding data and initializes the account.

The process should conceptually be:

```text
Validate onboarding data
        ↓
Create/update User Profile
        ↓
Create Financial Settings
        ↓
Create First Financial Cycle
        ↓
Set Active Cycle
        ↓
Mark onboarding completed
        ↓
Return success
```

The UI should not individually orchestrate these writes.

---

# 19. Initial User Profile

The initialization should create/update the user's profile.

Conceptually:

```json
{
  "userId": "firebase_uid",
  "displayName": "Jeremy",
  "onboarding": {
    "completed": true,
    "completedAt": "..."
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

Use the existing User/Profile schema if one already exists.

Do not create a duplicate user identity system.

---

# 20. Initial Financial Settings

The initialization should create:

```json
{
  "monthlyBudget": 15000,
  "currency": "INR",
  "carryForward": true
}
```

under the authenticated user's financial settings.

These settings must belong exclusively to that user.

---

# 21. Initial Financial Cycle

The initialization creates the user's first active financial cycle.

Conceptually:

```json
{
  "cycleId": "cycle_...",
  "userId": "firebase_uid",
  "name": "August",
  "startDate": "...",
  "endDate": "...",
  "status": "ACTIVE"
}
```

The cycle must be associated with the authenticated user.

---

# 22. Active Cycle

The user's initialized state should know which financial cycle is currently active.

Conceptually:

```text
User
  ↓
activeCycleId
  ↓
First Financial Cycle
```

Use the existing application architecture if an equivalent active-cycle mechanism already exists.

Do not create duplicate sources of truth for the active cycle.

---

# 23. Global Categories and Templates

Categories and templates are NOT created during onboarding.

They already exist globally.

Onboarding does not create:

```text
userCategories
```

or:

```text
userTemplates
```

Every user accesses the same:

```text
categories/
templates/
```

The user's transactions reference:

```text
categoryId
templateId
```

while financial records remain user-owned.

---

# 24. Security and User Isolation

This is a core requirement.

The onboarding system must never allow one authenticated user to initialize or modify another user's account.

The production architecture must eventually use:

```text
Firebase Authentication
        ↓
Firebase UID
        ↓
Firestore Security Rules
        ↓
User-owned documents
```

User-owned records must be protected by ownership rules.

Examples include:

- User Profile
- Financial Settings
- Financial Cycles
- Transactions
- Daily Journals
- Fast Entries
- Other private financial data

A user must not be able to modify another user's records by changing a userId in a frontend request.

The frontend must NOT be treated as the security boundary.

---

# 25. Global Data Security

Global Categories and Templates are shared system definitions.

Normal authenticated users may read them.

Normal users must not be allowed to modify the global definitions.

Conceptually:

```text
categories/*
    READ → authenticated users
    WRITE → authorized admin/backend only

templates/*
    READ → authenticated users
    WRITE → authorized admin/backend only
```

The exact Firebase Security Rules should be implemented separately as part of the security phase.

---

# 26. User-Scoped Services

All private-data services must operate against the currently authenticated user.

Conceptually:

```text
Auth UID
   ↓
Service
   ↓
user-scoped query
   ↓
Firestore
```

Do not implement logic such as:

```text
getTransactions("dev_jeremy")
```

from normal UI components.

The service should derive the current authenticated identity through the application's auth layer.

---

# 27. Onboarding Must Be Idempotent

Calling:

```text
completeOnboarding()
```

twice must not create two initial financial cycles.

The service must detect an already initialized account or otherwise use a transaction/atomic initialization mechanism appropriate to the chosen Firebase architecture.

Desired result:

```text
First call:
Create initial configuration.

Second call:
Do not create duplicate configuration.
Return existing initialized state or safely complete missing initialization.
```

---

# 28. Partial Failure Handling

Initialization involves multiple pieces of data.

The system must account for failure.

Example:

```text
User Profile       ✓
Financial Settings ✓
Financial Cycle    ✗
```

The application must not blindly show:

```text
Onboarding Complete
```

if required initialization has failed.

The initialization mechanism should be designed to be atomic where practical, or explicitly recoverable and idempotent if multiple writes are required.

---

# 29. App Closure During Onboarding

Initially, the onboarding draft may remain in temporary frontend state.

If the application is closed before final confirmation:

```text
No account initialization is committed.
```

The user can restart onboarding on their next login.

Persistent draft/resume support may be added later if desired.

This should not be confused with the permanent onboarding completion state.

---

# 30. Dashboard Entry

After successful initialization:

```text
Onboarding Complete
        ↓
Load Active Cycle
        ↓
Load User Financial Settings
        ↓
Initialize Financial Engine
        ↓
Dashboard
```

The Dashboard should therefore immediately know:

```text
Budget
Active Cycle
Cycle Name
Cycle Dates
Currency
Carry Forward Preference
```

No manual configuration should be required after onboarding.

---

# 31. Existing User Migration

Existing users with valid Nukood data must be initialized safely.

For example:

```text
dev_jeremy
```

already has financial data.

The migration should:

- Preserve existing data.
- Establish onboarding completion state.
- Avoid creating a duplicate first cycle.
- Avoid overwriting existing settings.
- Avoid changing existing transactions.
- Avoid changing historical records.

Existing users should enter the Dashboard normally after migration.

---

# 32. New User Example

A new user:

```text
dev_jj
```

logs in.

The system detects:

```text
onboarding.completed = false
```

The user completes:

```text
Display Name:
JJ

Monthly Budget:
₹12,000

Cycle Start:
15 August

Cycle Name:
August

Carry Forward:
Yes
```

After confirmation, the system creates:

```text
User Profile
    displayName = JJ

Financial Settings
    monthlyBudget = 12000
    currency = INR
    carryForward = true

Financial Cycle
    name = August
    startDate = 15 Aug
    endDate = 14 Sep
    status = ACTIVE

Onboarding
    completed = true
```

Then the user enters the Dashboard.

---

# 33. Data Isolation Example

Jeremy:

```text
userId = dev_jeremy
```

JJ:

```text
userId = dev_jj
```

Jeremy's:

```text
Financial Settings
Financial Cycles
Transactions
Journals
Fast Entries
History
```

must never be returned to JJ.

JJ's data must never be returned to Jeremy.

Both can access:

```text
Global Categories
Global Templates
```

because those are system definitions rather than private financial data.

---

# 34. Onboarding UI Requirements

The onboarding must eventually be implemented as a polished slide-based experience.

It should NOT resemble a traditional multi-field form.

Each slide should focus on one question.

Requirements:

- Strong typography.
- Clear visual hierarchy.
- Generous whitespace.
- Smooth slide transitions.
- Back navigation.
- Forward navigation.
- Clear progress indication.
- Good selected/unselected states.
- Responsive design.
- Keyboard accessibility.
- Appropriate input controls.
- Minimal visual clutter.
- Consistent Nukood visual language.

The UI should feel like:

> "Nukood is being set up around me."

rather than:

> "I am filling out a registration form."

---

# 35. UI/Data Separation

The onboarding UI must not directly know how Firestore documents are structured.

Preferred flow:

```text
Onboarding UI
      ↓
Onboarding State
      ↓
Validation
      ↓
Onboarding Service
      ↓
Existing Domain Services
      ↓
Firestore
```

Avoid:

```text
Question Component
      ↓
Firestore write
```

for every individual question.

---

# 36. Required Validation Before Commit

Before final initialization:

```text
displayName
monthlyBudget
cycleStartDate
cycleName
carryForward
currency
```

must be validated.

The backend/service layer must not blindly trust frontend validation.

---

# 37. Future Firebase Migration

The onboarding architecture must not depend on the current development username/password authentication.

The development system:

```text
dev_jeremy
dev_jj
```

should eventually map naturally to:

```text
Firebase UID
```

The rest of the onboarding architecture should remain conceptually unchanged.

The permanent ownership key should ultimately be the authenticated Firebase UID.

---

# 38. Out of Scope

This document does NOT define:

- Global Category implementation.
- Global Template implementation.
- Firebase Authentication implementation itself.
- Complete Firestore Security Rules.
- Dashboard UI.
- Activity Ring implementation.
- Pantry module.
- Reports.
- Roomies functionality.
- Full financial engine implementation.

Those systems may consume the initialized data defined by this contract.

---

# 39. Implementation Order

The recommended implementation sequence is:

```text
PHASE 1
Finalize this data contract
        ↓
PHASE 2
Implement backend onboarding initialization
        ↓
PHASE 3
Implement login → onboarding routing
        ↓
PHASE 4
Implement polished slide-based onboarding UI
        ↓
PHASE 5
Connect UI answers to onboarding service
        ↓
PHASE 6
Integrate initialized account with Dashboard
        ↓
PHASE 7
Test user isolation and failure scenarios
        ↓
PHASE 8
Finalize Firebase Authentication + Firestore Security Rules
```

The UI should not become the source of truth for the data architecture.

---

# 40. Definition of Done

The onboarding system is considered complete only when:

- A new authenticated user is detected correctly.
- An existing initialized user bypasses onboarding.
- Every question has a defined backend destination.
- Every answer is validated.
- Users can navigate backward and modify answers.
- Restarting onboarding clears only the draft.
- Review accurately reflects the final configuration.
- Confirmation initializes the user's account.
- The first financial cycle is created correctly.
- The cycle dates are calculated correctly.
- Financial settings are created correctly.
- Onboarding completion is persisted.
- Duplicate initialization is prevented.
- Partial failures are recoverable.
- Existing users retain their existing data.
- User data is scoped to the authenticated identity.
- Global Categories and Templates remain shared.
- No user-specific category/template duplication is created.
- The Dashboard loads using the newly initialized configuration.
- Production authentication and Firestore ownership rules can be layered onto the architecture without redesigning the onboarding flow.
