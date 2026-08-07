# Archive Module - Functional & UI Design Specification

## Purpose

The Archive is the historical view of the application.

Unlike the Journal, which focuses on interacting with a single day, the Archive is designed to provide a compact overview of every recorded day and allow users to generate beautiful summaries across any combination of selected days.

The Archive is **not** a transaction list.

It is a collection of completed daily records.

---

# Core Concept

Every day that contains transactions is automatically stored inside the Archive.

Each archived day represents a complete daily financial snapshot.

The Archive exists to answer questions such as:

* How much did I spend during these few days?
* What categories did I spend on?
* Which days should be included in my report?
* How much have I spent over a selected period?

---

# User Interface

The Archive should display days using compact interactive tiles rather than cards.

The design should feel lightweight, clean, and fast to navigate.

Example layout:

July 2026

┌────────┐
│ 18 Jul │
│ ₹320   │
└────────┘

┌────────┐
│ 19 Jul │
│ ₹810   │
└────────┘

┌────────┐
│ 20 Jul │
│ ₹540   │
└────────┘

Each tile represents one calendar day.

Every tile should display:

* Date
* Total expenses for that day
* Visual indication if transactions exist

Optionally, a subtle color intensity can represent spending levels, allowing users to quickly identify high and low spending days.

---

# Day Selection

Users should be able to tap any number of day tiles.

Each selected tile becomes visually highlighted.

Selection should support:

* Single day
* Multiple consecutive days
* Multiple non-consecutive days
* Entire weeks
* Entire months

The interaction should feel similar to selecting photos in a gallery.

---

# Selection Bar

As soon as at least one day is selected, a floating action bar should appear.

Example:

────────────────────────

3 Days Selected

₹2,430 Combined Spending

[ Generate Summary ]

────────────────────────

The floating bar should disappear when no days are selected.

---

# Generate Summary

Pressing "Generate Summary" should create a dynamic Summary Card.

The Summary Card is not permanently stored.

It is generated live using all transactions contained within the selected days.

This ensures every report always reflects the latest data.

The Summary Card should animate into view from the bottom of the screen, creating a premium experience.

---

# Summary Card

The Summary Card is the centerpiece of the Archive.

It should feel visually rich, modern, and easy to understand.

The layout should prioritize hierarchy and readability.

The information should be organized as follows:

## Header

* "Expense Summary"
* Date range automatically calculated
* Individual selected dates displayed as chips or pills

Example:

18 Jul • 19 Jul • 20 Jul

---

## Hero Statistic

The largest element on the screen should be:

Total Spent

₹5,420

The amount should animate smoothly when displayed.

---

## Quick Statistics

Display compact information cards for:

* Total Expenses
* Total Income
* Net Balance
* Number of Transactions
* Number of Selected Days

These should appear as evenly spaced statistic tiles.

---

## Category Breakdown

The Summary Card should clearly communicate where the money was spent.

Each category should display:

* Category icon
* Category name
* Amount spent
* Percentage of total spending
* Visual progress indicator

Example:

Groceries

₹2,120

39%

██████████████░░░

Every category should always retain the same color throughout the application to build familiarity.

---

## Spending Distribution

Above the category list, include a single stacked horizontal distribution bar representing the proportion of spending across all categories.

Each colored segment corresponds to a category.

This allows users to understand the overall distribution instantly without reading numbers.

---

## Included Days

The report should clearly show which days are included.

Rather than displaying plain text, each day should appear as a pill.

Example:

[18 Jul]

[19 Jul]

[20 Jul]

This makes it immediately obvious what the report represents.

---

## Detailed Breakdown

The Summary Card should include a "View Detailed Breakdown" option.

Opening it reveals category-by-category transaction grouping.

Example:

Groceries

Chicken Breast

500g

₹210

Milk

2 Packets

₹140

Eggs

12

₹90

Subtotal

₹440

Each category should be collapsible to maintain readability.

---

# Report Philosophy

Reports are not separate database entities.

They are live summaries generated from selected daily records.

If transactions are edited later, generating the same report again should automatically reflect the updated information.

No duplicate report data should ever be stored.

---

# User Experience Principles

The Archive should feel more like selecting photos in a gallery than generating financial reports.

The flow should always remain:

Open Archive

↓

Select one or more days

↓

Generate Summary

↓

View beautiful interactive Summary Card

↓

Expand into detailed breakdown if needed

The experience should require minimal effort while providing maximum clarity.

The Summary Card should become one of the application's signature UI components, making financial summaries enjoyable to view rather than overwhelming.
