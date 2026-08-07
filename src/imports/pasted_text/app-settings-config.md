The Settings module should act as the Configuration Center of the application.

This is not simply a page for changing preferences.

Every setting should directly affect how the rest of the application behaves.

The Settings module controls:

User identity
Financial configuration
Categories
Fast Entries
Application appearance
Data management

Every other module (Journal, Transactions, Archive, Reports) should reference these settings rather than storing duplicate information.

The Settings module should remain clean, minimal, and easy to understand.

👤 Profile Settings

This section manages the user's personal profile.

Edit Name

Allows the user to update their display name.

This name should appear throughout the application wherever the user's profile is shown.

Examples:

Welcome message
Profile
User Avatar

No financial logic depends on this field.

Profile Picture

Allows the user to upload or replace their avatar.

This is used only for personalization.

Currency

Allows the user to choose the application's currency.

Examples:

₹ INR
$ USD
€ EUR
£ GBP

Changing the currency should automatically update every monetary value displayed throughout the application.

No conversion should occur.

Only the displayed currency symbol changes.

💰 Financial Settings

This section defines how the application's financial calculations work.

Monthly Budget

Rename "Starting Balance" to Monthly Budget.

This represents the amount of money available at the beginning of each month.

Example:

₹18,000

The application's Available Balance should always be calculated as:

Available Balance

=

Monthly Budget

Balance Added

−

Total Expenses

The user should never manually edit the Available Balance.

It is always calculated.

Reset Date

Allows the user to define when a new financial month begins.

Examples:

1st
5th
10th

On this date the application automatically starts a new monthly cycle.

Carry Forward

Boolean option.

ON

Unused balance carries into the next month.

OFF

Every month starts fresh using the Monthly Budget.

Daily Budget Mode

Allows the user to choose how Daily Budget is calculated.

Automatic

Remaining Balance ÷ Remaining Days

Manual

User manually specifies their preferred daily spending target.

Budget Health Indicator

Configure the thresholds used by the application's Budget Health Indicator.

The indicator is shown next to the Daily Budget value inside the Financial Snapshot.

The user should be able to edit the thresholds.

Default values:

🟢 Comfortable

Average Daily Spend ≤ 80% of Recommended Daily Budget

🟡 On Track

80%–100%

🟠 Tight

100%–120%

🔴 Overspending

Above 120%

The application should automatically calculate the indicator throughout the month.

📂 Categories

Categories define how transactions are organized.

Categories should not create custom forms.

Instead they enable predefined fields from the application's Field Library.

Create Category

Users should be able to create new categories.

When creating a category they configure:

Name
Icon
Color

Then choose which fields should appear whenever transactions belonging to this category are created.

Available fields include:

Item Name
Amount
Quantity
Unit
Store
Brand
Restaurant
Transport Mode
From
To
Shared Expense
Subject
Source
Receipt
Notes

The selected fields define that category's transaction form.

Manage Categories

Displays every category.

Selecting a category allows the user to:

Rename
Change icon
Change color
Modify enabled fields
Delete

Deleting categories that already contain transactions should require confirmation.

⚡ Fast Entries

Fast Entries are saved purchase presets.

They are not categories.

They are not transactions.

They are simply reusable purchases that the user records frequently.

The goal is to allow common purchases to be recorded in only a few seconds.

Add Fast Entry

The user creates a Fast Entry by defining:

Name
Icon
Category
Default Price
Default Quantity (optional)
Default Unit (optional)
Default Notes (optional)

Examples:

🥚 Eggs

Category

Groceries

Price

₹102

Quantity

12

Unit

Eggs

🍗 Chicken Breast

Category

Groceries

Price

₹200

Quantity

500

Unit

grams

🚌 Auto Ride

Category

Transport

Price

₹40

These values are simply defaults.

Every transaction created from a Fast Entry remains fully editable.

Editing a transaction must never modify the Fast Entry.

Manage Fast Entries

Displays every Fast Entry.

Users can:

Edit
Delete
Change icon
Change default values
Change assigned category

The Journal should only display Fast Entries.

All management occurs inside Settings.

Fast Entry Workflow

When creating a transaction from the Journal:

Users may select one of their Fast Entries.

Selecting one automatically fills:

Item Name
Category
Default Price
Quantity
Unit
Notes

The user only edits values that differ for today's purchase.

Example:

Chicken

↓

Price

₹220

instead of

₹200

↓

Save

The saved transaction becomes completely independent from the Fast Entry.

Updating the Fast Entry later never changes historical transactions.

📦 Data Management

This section allows the user to manage their data.

Include:

Export JSON
Export CSV
Backup
Restore
Reset Application Data

These functions should never modify the application's logic.

🎨 Appearance

Allow users to personalize the interface.

Include:

Theme

Light
Dark
System

Accent Color

Future UI customization options may also be placed here.