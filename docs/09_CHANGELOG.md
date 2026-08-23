# Changelog

All notable changes to the architecture, schemas, and specifications of this project will be documented in this file.

## [Unreleased]
### Added
- Documented Backend Architecture (Financial Settings, Financial Cycles, Transactions).
- Documented Business Rules.
- Defined Categories entity with distinct separation from Transaction Templates.
- Added Transaction Templates entity linked via `templateId`.
- Added Transactions entity to the Firestore schema document (`users/{userId}/transactions/{transactionId}`).
- Added Fast Entry toggle field to Category Specifications.
- Added Fast Entries backend architecture, schema, and business rules.
- Documented Financial Engine architecture, data flow, events, and business rules.
- Documented Transaction Lifecycle Service architecture, operations, and workflows.
- Implemented `OnboardingService` (`src/services/onboarding.service.ts`) as the single entry point for new-user account initialization (Phase 3).
- Added `OnboardingInput` interface mapping the Phase 2 data contract fields to their exact Firestore destinations.
- Added `OnboardingValidationError` with per-field validation before any Firestore write.
- Added `calculateCycleEndDate()` utility using calendar-month arithmetic (handles February, leap years, and month-length overflow correctly).
- Added `isOnboarded` field to `FinancialSettings` to track initialization state. Legacy users without this field are treated as already onboarded.
- Added Phase 3 Onboarding Guard to `FinancialEngineContext` — engine no longer auto-creates default settings or cycles for users who have not completed onboarding.
- Documented OnboardingService in `docs/03_BACKEND_ARCHITECTURE.md` (Section 2).
- Documented `isOnboarded` field in `docs/08_FIELD_NAMES.md` and `docs/04_FIRESTORE_SCHEMA.md`.
- Documented Onboarding Guard and Rule 10 in `docs/05_FINANCIAL_ENGINE.md`.
- Added `OnboardingInput` type to the data dictionary (`docs/08_FIELD_NAMES.md` Section 2a).
- Added `src/scripts/test_phase3.ts` — full test suite covering existing user protection, new user initialization, invalid input rejection, duplicate submission idempotency, and 7 `calculateCycleEndDate` edge cases.

### Changed
- Renamed `transactionData` to `categoryData` within the Transaction documents to better reflect its dynamic nature based on Category selection.
- Renumbered `docs/03_BACKEND_ARCHITECTURE.md` sections 3–8 to 4–9 to accommodate the new OnboardingService section (Section 2).
- Patched `src/lib/firebase.ts` to fall back to `process.env` when `import.meta.env` is unavailable (Node/tsx test scripts). No browser behavior change.
