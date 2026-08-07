# Firestore Schema

This document provides a high-level visual map of the NoSQL collections, documents, and fields within the Firestore database.

## 1. Financial Settings

```text
users
└── {userId}
    └── settings
        └── financial
            ├── monthlyBudget
            ├── carryForwardEnabled
            ├── budgetThresholds
            ├── currency
            └── cycleConfiguration
```

## 2. Financial Cycles

```text
users
└── {userId}
    └── financialCycles
         └── {cycleId}
              ├── cycleName
              ├── startDate
              ├── endDate
              ├── cycleLengthDays
              ├── budgetSnapshot
              ├── totalSpent
              ├── transactionCount
              ├── status
              ├── createdAt
              ├── updatedAt
              └── dailyJournals (Subcollection)
                   └── {journalId}
                        ├── journalId
                        ├── cycleId
                        ├── date
                        ├── dayName
                        ├── dayNumber
                        ├── transactionCount
                        ├── totalSpent
                        ├── categorySummary: map // Derived. Daily category breakdown.
                        │     └── [categoryId]: map
                        │           ├── totalSpent: number
                        │           ├── transactionCount: number
                        │           └── lastTransactionAt: timestamp | null
                        ├── createdAt
                        └── updatedAt
```

## 3. Categories Collection

**Path:** `users/{userId}/categories/{categoryId}`

```text
users
└── {userId}
    └── categories
         └── {categoryId}
              ├── categoryId
              ├── name
              ├── description
              ├── icon
              ├── color
              ├── displayOrder
              ├── templateId
              ├── isDefault
              ├── createdAt
              └── updatedAt
```

## 4. Transaction Templates Collection

**Path:** `users/{userId}/transactionTemplates/{templateId}`

```text
users
└── {userId}
    └── transactionTemplates
         └── {templateId}
              ├── templateId
              ├── fields
              ├── defaultTitle
              ├── isCalculated
              ├── createdAt
              └── updatedAt
```

## 5. Transactions Collection

**Path:** `users/{userId}/transactions/{transactionId}`

```text
users
└── {userId}
    └── transactions
         └── {transactionId}
              ├── transactionId
              ├── userId
              ├── cycleId
              ├── categoryId
              ├── transactionType
              ├── title
              ├── amount
              ├── date
              ├── note
              ├── receiptUrl
              ├── fastEntryId
              ├── source
              ├── createdAt
              ├── updatedAt
              └── categoryData (Dynamic based on Category)
```

## 6. Fast Entries Collection

**Path:** `users/{userId}/fastEntries/{fastEntryId}`

```text
users
└── {userId}
    └── fastEntries
         └── {fastEntryId}
              ├── fastEntryId
              ├── transactionId
              ├── displayName
              ├── usageCount
              ├── lastUsedAt
              ├── createdAt
              └── updatedAt
```
