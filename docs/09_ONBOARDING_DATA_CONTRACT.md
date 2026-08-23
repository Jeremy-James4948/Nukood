# Onboarding Data Routing Contract

This document defines the exact onboarding questionnaire and its data routing contract. It serves as the source of truth for mapping onboarding UI inputs to the existing Firestore database architecture.

## 1. Onboarding Questions & Field Mapping

### QUESTION 1 — DISPLAY NAME
- **Proposed Question:** "What should we call you?"
- **Purpose:** Personalize the user experience.
- **Answer Type:** `string`
- **Validation:** Optional, maximum 50 characters.
- **Onboarding Draft State:** `onboardingDraft.profileName`
- **Destination Entity:** Financial Settings (`users/{userId}/settings/financial`)
- **Exact Existing Field:** `profileName`
- **Requirement:** OPTIONAL

### QUESTION 2 — MONTHLY BUDGET
- **Proposed Question:** "How much would you like to budget for this cycle?"
- **Purpose:** Set the baseline monthly budget.
- **Answer Type:** `number`
- **Validation:** Required, positive monetary value > 0.
- **Onboarding Draft State:** `onboardingDraft.monthlyBudget`
- **Destination Entity:** Financial Settings (`users/{userId}/settings/financial`)
- **Exact Existing Field:** `monthlyBudget`
- **Requirement:** REQUIRED
- **Conflict Note:** The `FinancialEngineContext` currently hardcodes a default of `1500` upon auto-initialization. This must be bypassed/intercepted in future UI phases so the user's answer is respected instead.

### QUESTION 3 — CYCLE START DATE
- **Proposed Question:** "When should your financial cycle begin?"
- **Purpose:** Determine cycle rollover boundaries.
- **Answer Type:** `Date`
- **Validation:** Required, valid Date object.
- **Onboarding Draft State:** `onboardingDraft.cycleStartDate`
- **Destination Entity:** Financial Settings (`users/{userId}/settings/financial`)
- **Exact Existing Field:** `cycleConfiguration.startDate`
- **Requirement:** REQUIRED (Defaults to the current day in the UI).

### QUESTION 4 — CYCLE NAME
- **Proposed Question:** "What would you like to call this cycle?"
- **Purpose:** Naming the very first financial cycle.
- **Answer Type:** `string`
- **Validation:** Required, non-empty, max 30 characters.
- **Onboarding Draft State:** `onboardingDraft.cycleName`
- **Destination Entity:** Financial Cycle (`users/{userId}/financialCycles/{cycleId}`)
- **Exact Existing Field:** `cycleName`
- **Requirement:** REQUIRED (Defaults to "Current Cycle" or "First Cycle" in the UI).

### QUESTION 5 — CARRY-FORWARD
- **Proposed Question:** "Would you like unused budget to carry into your next cycle?"
- **Purpose:** Establish rollover logic for future cycles.
- **Answer Type:** `boolean`
- **Validation:** Required, `true` or `false`.
- **Onboarding Draft State:** `onboardingDraft.carryForwardEnabled`
- **Destination Entity:** Financial Settings (`users/{userId}/settings/financial`)
- **Exact Existing Field:** `carryForwardEnabled`
- **Requirement:** REQUIRED (Defaults to `true` in the UI).

---

## 2. Presentation-Only Screens (No Data Storage)
The following screens do not require backend storage fields and will be mapped to a destination of `NONE`.
- **Welcome Screen:** Introductory greeting. (Destination: NONE)
- **Review/Confirmation Screen:** Final review before submission. (Destination: NONE)

---

## 3. Excluded Concepts
The following concepts are strictly EXCLUDED from the onboarding flow:
- **Category Selection:** Categories are global and available to everyone automatically.
- **Template Selection:** Templates are global system definitions.

---

## 4. Final Temporary Onboarding State (`OnboardingDraft`)

During the onboarding flow, the data must be temporarily held in React state before final submission. The strict contract for this draft state is:

```typescript
export interface OnboardingDraft {
  profileName?: string;             // Maps to settings.profileName
  monthlyBudget: number;            // Maps to settings.monthlyBudget
  cycleStartDate: Date;             // Maps to settings.cycleConfiguration.startDate
  cycleName: string;                // Maps to Cycle.cycleName during creation
  carryForwardEnabled: boolean;     // Maps to settings.carryForwardEnabled
}
```

When the user clicks "Submit" on the final confirmation screen, this exact object will be passed to the backend services to hydrate the fields defined in Section 1.
