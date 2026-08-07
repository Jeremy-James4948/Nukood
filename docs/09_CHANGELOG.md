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

### Changed
- Renamed `transactionData` to `categoryData` within the Transaction documents to better reflect its dynamic nature based on Category selection.
