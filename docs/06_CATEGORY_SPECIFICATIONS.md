# Nukood — Category Templates & Field Specifications

This document defines the functional specifications and UI field requirements for the expense entry templates in Nukood.

## 1. Global Specifications

### Standard Fields (Present on All Entry Forms)
Every transaction form includes the following core fields by default:

- **Transaction Title / Name**: String input (auto-populated or overridden by specific category selections where noted).
- **Amount**: Number input (Currency symbol: ₹).
- **Date & Time**: Timestamp picker (defaults to current date and time; fully editable).
- **Note / Memo**: Optional text input for additional context.
- **Receipt Attachment**: Media picker / camera toggle allowing users to upload or snap an image of a physical or digital receipt.

## 2. Category Specifications

### 1. Groceries Form
Designed to track consumable goods, quantities, and per-unit math efficiently.
- **Name**: Text Input (e.g., Apples, Milk). The value entered here dynamically sets the main Transaction Title.
- **Quantity**: Number Input (Total No. Bought, e.g., 2, 500)
- **Weight**: Number Input (Weight per single item)
- **Unit**: Dropdown [ kg | grams | Liters | ml | Packets ]
- **Advanced Calculation Section**:
  - **Price per item**: Number Input
  - **Total Amount**: Auto-calculated (Quantity × Price per item) securely before hitting the database.
- **Store Name**: Text Input with quick-suggestions [ Zepto | Blinkit | BigBasket | Custom Text ]

### 2. Food Form
Optimized for quick logging of meals, drinks, and dining apps.
- **Restaurant / App Name**: Text Input with quick-suggestions [ Swiggy | Zomato | Starbucks | VIT | Bava’s | Custom Text ]
- **Behavior**: The value entered in this field dynamically sets the main Transaction Title / Name.

### 3. Transport Form
Tracks transit modes and commute routes.
- **Mode of Travel**: Dropdown [ Auto | Cab | Bike | Metro | Bus | Train | Flight ]
- **Start Location**: Text Input (e.g., Home, Campus)
- **Destination**: Text Input (e.g., Chennai Central, Mambakkam)

### 4. House Form
Handles recurring household and living expenses.
- **Expense Type**: Dropdown [ Rent | Electricity | Wi-Fi | Maintenance | Water | Cleaning/Maid ]
- **Behavior**: The selected type automatically sets the main Transaction Title / Name.

### 5. Personal Form
Tracks personal care, apparel, and discretionary purchases.
- **Subcategory**: Dropdown [ Clothing | Grooming/Salon | Electronics | Personal Care | Gifts ]
- **Quantity (QTY)**: Number Input

### 6. Entertainment Form
Monitors leisure, outings, and subscription costs.
- **Activity Type**: Dropdown [ Movie | Gaming | Concert/Event | Sports | Streaming Subscription ]
- **Platform / Venue**: Text Input (e.g., PVR Cinemas, Steam, Netflix)
- **Group / Occasion (Optional)**: Text Input (e.g., Weekend with Friends)

### 7. Medical Form
Tracks healthcare, consultation, and pharmacy expenses.
- **Expense Type**: Dropdown [ Pharmacy/Medicines | Doctor Consultation | Lab Test | Fitness ]
- **Provider / Clinic Name**: Text Input (e.g., Apollo Pharmacy, Fortis)

### 8. College Form
Tailored specifically for academic and campus life.
- **Purpose**: Dropdown [ Printing | Stationery | Lab/Exam Fee | Events | Extra Curricular ]
- **Behavior**: The selected purpose automatically sets the main Transaction Title / Name.
- **Quantity (Optional)**: Number Input (e.g., 30 pages)
- **Advanced Calculation Section**:
  - **Price per unit**: Number Input
  - **Total Amount**: Auto-calculates (Quantity × Price per unit) or recalculates unit price if total amount is manually adjusted.

### 9. Balance Added Form (Inflow)
Logs income, allowances, and incoming money.
- **Source of Funds**: Dropdown [ Monthly Allowance | Refund | Settled Split | Side Income/Project | Gift ]
