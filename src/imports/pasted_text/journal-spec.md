# Main Page (Journal) - Functional & UI Specification

## Purpose

The Journal is the heart of the application.

It is the page users interact with every day and should provide a fast, intuitive, and visually engaging experience.

The Journal is not intended to display every transaction ever made or provide deep analytics. Instead, it serves as today's workspace while allowing users to easily revisit previous or upcoming days.

The page should answer one simple question:

> **"What happened today, and what is my current financial status?"**

---

# Overall Layout

The Journal consists of three primary sections arranged vertically.

```
────────────────────────────

Daily Card Carousel

────────────────────────────

Financial Snapshot

────────────────────────────
```

The interface should remain clean with generous spacing, rounded corners, smooth animations, and minimal visual clutter.

---

# Daily Card Carousel

The primary feature of the Journal is a horizontally scrollable carousel of Daily Cards.

Each card represents one calendar day.

The current day is always positioned in the center and appears slightly larger than the surrounding cards.

Previous and future cards remain partially visible to indicate that additional days exist.

The interaction should feel similar to Apple Wallet or a premium card carousel.

---

# Card States

Each day automatically exists as a card.

Cards can be in one of three states.

### Previous Days

Completed days that already contain transactions.

### Current Day

The active working card where users add and manage today's transactions.

### Tomorrow

An empty card is automatically generated for the next day.

Users may optionally begin adding transactions before the day arrives.

At midnight, tomorrow's card automatically becomes today's active card, and a new empty tomorrow card is generated.

---

# Daily Card Contents

Every Daily Card should display:

* Date
* Day of the week
* Total Expenses
* Total Income
* Net Balance
* Number of Transactions
* Compact category summary

The card should provide a quick overview without requiring expansion.

---

# Opening a Card

Selecting the centered card smoothly expands it into a detailed daily view.

The expanded view should allow users to:

* View all transactions for that day
* Add a transaction
* Edit a transaction
* Delete a transaction
* View receipt images
* View category subtotals
* View total daily spending

The transition should feel smooth and premium rather than opening an entirely new page.

---

# Add Transaction

Transactions should be quick to create.

Each transaction supports:

* Expense or Income
* Amount
* Category
* Item Name
* Quantity (optional)
* Unit (optional)
* Notes (optional)
* Receipt/Bill Image (optional)
* Date
* Time

The complete process should require fewer than 10 seconds.

---

# Financial Snapshot Section

Below the Daily Card carousel should be a horizontal divider.

Under this divider sits a single large summary container that provides an overview of the user's current financial position.

This section remains visible regardless of which day is currently selected.

Its purpose is to answer:

> **"Where do I currently stand financially?"**

This is intentionally **not** an analytics dashboard.

It is a concise financial snapshot.

---

# Financial Snapshot Layout

The container is divided into two visual sections.

## Left Section

A segmented circular spending ring.

Unlike an activity ring, this ring represents spending distribution across categories.

Each category occupies a portion of the circle proportional to the amount spent.

Example:

* Groceries
* Food
* Transport
* Shopping
* Entertainment
* Medical

Every category maintains a consistent color throughout the application.

Below or beside the ring, display a compact legend showing the category colors.

The spending ring should animate smoothly whenever new transactions are added.

Selecting a category within the ring should optionally filter transactions belonging to that category.

---

## Right Section

The right side displays the user's **Available Balance** as the primary statistic.

The hierarchy should be:

### Available Balance (Largest Element)

This is calculated dynamically as:

**Available Balance = Total Income − Total Expenses**

Below the balance, display two supporting statistics:

* Total Income
* Total Expenses

These values should be smaller and act as supporting information rather than competing with the Available Balance.

Whenever transactions are added or edited, the balance should animate to its new value.

Positive balances should use a success color.

Negative balances should use an error color.

---

# Visual Style

The Financial Snapshot should appear as a premium card with:

* Large rounded corners
* Soft elevation
* Clean typography
* Spacious padding
* Minimal borders

The design should prioritize readability and elegance over excessive decoration.

The overall feeling should resemble Apple's design language rather than a traditional financial dashboard.

---

# User Experience Goals

The Journal should allow users to:

* Swipe naturally through days.
* Instantly understand today's financial status.
* Add transactions with minimal effort.
* Review previous days effortlessly.
* Always know their current available balance.
* Understand spending distribution at a glance through the segmented spending ring.

Every interaction should feel smooth, lightweight, and enjoyable enough to encourage daily use.
