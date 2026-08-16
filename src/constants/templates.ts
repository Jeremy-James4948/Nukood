export interface TemplateField {
  fieldId: string;
  type: 'TEXT' | 'NUMBER' | 'DROPDOWN';
  label: string;
  options?: string[];
  suggestions?: string[];
  required: boolean;
  setsTitle?: boolean; // If true, the selected/entered value populates the transaction title
}

export interface TransactionTemplate {
  templateId: string;
  categoryId: string;
  name: string;
  version: number;
  fields: TemplateField[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * GLOBAL TRANSACTION TEMPLATES
 * These define the dynamic schema for category-specific fields collected.
 * Note: Global fields (title, amount, date, note, receipt, fast entry) are handled by the core Transaction model.
 */
export const GLOBAL_TEMPLATES: Record<string, Omit<TransactionTemplate, 'createdAt' | 'updatedAt'>> = {
  tpl_groceries: {
    templateId: 'tpl_groceries',
    categoryId: 'cat_groceries',
    name: 'Groceries',
    version: 1,
    isActive: true,
    fields: [
      { fieldId: 'storeName', type: 'TEXT', label: 'Store Name', suggestions: ['Zepto', 'Blinkit', 'BigBasket'], required: false },
      { fieldId: 'quantity', type: 'NUMBER', label: 'Quantity', required: false },
      { fieldId: 'weight', type: 'NUMBER', label: 'Weight (per item)', required: false },
      { fieldId: 'unit', type: 'DROPDOWN', label: 'Unit', options: ['kg', 'grams', 'Liters', 'ml', 'Packets'], required: false },
      { fieldId: 'pricePerUnit', type: 'NUMBER', label: 'Price per Unit', required: false },
      // totalAmount is calculated dynamically
    ]
  },
  tpl_food: {
    templateId: 'tpl_food',
    categoryId: 'cat_food',
    name: 'Food',
    version: 1,
    isActive: true,
    fields: [
      { fieldId: 'restaurantOrAppName', type: 'TEXT', label: 'Restaurant / App Name', suggestions: ['Swiggy', 'Zomato', 'Starbucks', 'VIT', 'Bava’s'], required: true, setsTitle: true },
    ]
  },
  tpl_transport: {
    templateId: 'tpl_transport',
    categoryId: 'cat_transport',
    name: 'Transport',
    version: 1,
    isActive: true,
    fields: [
      { fieldId: 'modeOfTravel', type: 'DROPDOWN', label: 'Mode of Travel', options: ['Auto', 'Cab', 'Bike', 'Metro', 'Bus', 'Train', 'Flight'], required: true, setsTitle: true },
      { fieldId: 'startLocation', type: 'TEXT', label: 'Start Location', required: false },
      { fieldId: 'destination', type: 'TEXT', label: 'Destination', required: false },
    ]
  },
  tpl_house: {
    templateId: 'tpl_house',
    categoryId: 'cat_house',
    name: 'House',
    version: 1,
    isActive: true,
    fields: [
      { fieldId: 'expenseType', type: 'DROPDOWN', label: 'Expense Type', options: ['Rent', 'Electricity', 'Wi-Fi', 'Maintenance', 'Water', 'Cleaning/Maid'], required: true, setsTitle: true },
    ]
  },
  tpl_personal: {
    templateId: 'tpl_personal',
    categoryId: 'cat_personal',
    name: 'Personal',
    version: 1,
    isActive: true,
    fields: [
      { fieldId: 'subcategory', type: 'DROPDOWN', label: 'Subcategory', options: ['Clothing', 'Grooming/Salon', 'Electronics', 'Personal Care', 'Gifts'], required: true, setsTitle: true },
      { fieldId: 'quantity', type: 'NUMBER', label: 'Quantity', required: false },
    ]
  },
  tpl_entertainment: {
    templateId: 'tpl_entertainment',
    categoryId: 'cat_entertainment',
    name: 'Entertainment',
    version: 1,
    isActive: true,
    fields: [
      { fieldId: 'activityType', type: 'DROPDOWN', label: 'Activity Type', options: ['Movie', 'Gaming', 'Concert/Event', 'Sports', 'Streaming Subscription'], required: true, setsTitle: true },
      { fieldId: 'platformOrVenue', type: 'TEXT', label: 'Platform / Venue', required: false },
      { fieldId: 'groupOrOccasion', type: 'TEXT', label: 'Group / Occasion', required: false },
    ]
  },
  tpl_medical: {
    templateId: 'tpl_medical',
    categoryId: 'cat_medical',
    name: 'Medical',
    version: 1,
    isActive: true,
    fields: [
      { fieldId: 'expenseType', type: 'DROPDOWN', label: 'Expense Type', options: ['Pharmacy/Medicines', 'Doctor Consultation', 'Lab Test', 'Fitness'], required: true, setsTitle: true },
      { fieldId: 'providerOrClinicName', type: 'TEXT', label: 'Provider / Clinic Name', required: false },
    ]
  },
  tpl_college: {
    templateId: 'tpl_college',
    categoryId: 'cat_college',
    name: 'College',
    version: 1,
    isActive: true,
    fields: [
      { fieldId: 'purpose', type: 'DROPDOWN', label: 'Purpose', options: ['Printing', 'Stationery', 'Lab/Exam Fee', 'Events', 'Extra Curricular'], required: true, setsTitle: true },
      { fieldId: 'quantity', type: 'NUMBER', label: 'Quantity', required: false },
      { fieldId: 'pricePerUnit', type: 'NUMBER', label: 'Price per Unit', required: false },
    ]
  },
  tpl_balance_added: {
    templateId: 'tpl_balance_added',
    categoryId: 'cat_balance_added',
    name: 'Balance Added',
    version: 1,
    isActive: true,
    fields: [
      { fieldId: 'sourceOfFunds', type: 'DROPDOWN', label: 'Source of Funds', options: ['Monthly Allowance', 'Refund', 'Settled Split', 'Side Income/Project', 'Gift'], required: true, setsTitle: true },
    ]
  },
};
