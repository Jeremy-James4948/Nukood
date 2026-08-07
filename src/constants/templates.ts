export interface TemplateField {
  name: string;
  type: 'text' | 'number' | 'dropdown' | 'file';
  label: string;
  options?: string[];
  suggestions?: string[];
  required: boolean;
  setsTitle?: boolean;
}

export interface TransactionTemplate {
  templateId: string;
  name: string;
  fields: TemplateField[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Transaction Templates define the dynamic schema for what fields 
 * should be rendered and collected for each category.
 */
export const TRANSACTION_TEMPLATES: Record<string, Omit<TransactionTemplate, 'createdAt' | 'updatedAt'>> = {
  groceries_template: {
    templateId: 'groceries_template',
    name: 'Groceries',
    fields: [
      { name: 'itemName', type: 'text', label: 'Name', required: true, setsTitle: true },
      { name: 'quantity', type: 'number', label: 'Quantity', required: true },
      { name: 'weight', type: 'number', label: 'Weight', required: false },
      { name: 'unit', type: 'dropdown', label: 'Unit', options: ['kg', 'grams', 'Liters', 'ml', 'Packets'], required: true },
      { name: 'pricePerUnit', type: 'number', label: 'Price per item', required: false },
      { name: 'storeName', type: 'text', label: 'Store Name', suggestions: ['Zepto', 'Blinkit', 'BigBasket'], required: false },
      { name: 'receipt', type: 'file', label: 'Receipt Attachment', required: false },
    ]
  },
  food_template: {
    templateId: 'food_template',
    name: 'Food',
    fields: [
      { name: 'restaurantName', type: 'text', label: 'Restaurant / App Name', suggestions: ['Swiggy', 'Zomato', 'Starbucks', 'VIT', 'Bava’s'], required: true, setsTitle: true },
      { name: 'receipt', type: 'file', label: 'Receipt Attachment', required: false },
    ]
  },
  transport_template: {
    templateId: 'transport_template',
    name: 'Transport',
    fields: [
      { name: 'mode', type: 'dropdown', label: 'Mode of Travel', options: ['Auto', 'Cab', 'Bike', 'Metro', 'Bus', 'Train', 'Flight'], required: true },
      { name: 'startLocation', type: 'text', label: 'Start Location', required: false },
      { name: 'destination', type: 'text', label: 'Destination', required: false },
      { name: 'receipt', type: 'file', label: 'Receipt Attachment', required: false },
    ]
  },
  house_template: {
    templateId: 'house_template',
    name: 'House',
    fields: [
      { name: 'expenseType', type: 'dropdown', label: 'Expense Type', options: ['Rent', 'Electricity', 'Wi-Fi', 'Maintenance', 'Water', 'Cleaning/Maid'], required: true, setsTitle: true },
      { name: 'receipt', type: 'file', label: 'Receipt Attachment', required: false },
    ]
  },
  personal_template: {
    templateId: 'personal_template',
    name: 'Personal',
    fields: [
      { name: 'subcategory', type: 'dropdown', label: 'Subcategory', options: ['Clothing', 'Grooming/Salon', 'Electronics', 'Personal Care', 'Gifts'], required: true },
      { name: 'quantity', type: 'number', label: 'Quantity', required: false },
      { name: 'receipt', type: 'file', label: 'Receipt Attachment', required: false },
    ]
  },
  entertainment_template: {
    templateId: 'entertainment_template',
    name: 'Entertainment',
    fields: [
      { name: 'activityType', type: 'dropdown', label: 'Activity Type', options: ['Movie', 'Gaming', 'Concert/Event', 'Sports', 'Streaming Subscription'], required: true },
      { name: 'platformOrVenue', type: 'text', label: 'Platform / Venue', required: false },
      { name: 'groupOrOccasion', type: 'text', label: 'Group / Occasion', required: false },
      { name: 'receipt', type: 'file', label: 'Receipt Attachment', required: false },
    ]
  },
  medical_template: {
    templateId: 'medical_template',
    name: 'Medical',
    fields: [
      { name: 'expenseType', type: 'dropdown', label: 'Expense Type', options: ['Pharmacy/Medicines', 'Doctor Consultation', 'Lab Test', 'Fitness'], required: true },
      { name: 'providerName', type: 'text', label: 'Provider / Clinic Name', required: false },
      { name: 'receipt', type: 'file', label: 'Receipt Attachment', required: false },
    ]
  },
  college_template: {
    templateId: 'college_template',
    name: 'College',
    fields: [
      { name: 'purpose', type: 'dropdown', label: 'Purpose', options: ['Printing', 'Stationery', 'Lab/Exam Fee', 'Events', 'Extra Curricular'], required: true, setsTitle: true },
      { name: 'quantity', type: 'number', label: 'Quantity', required: false },
      { name: 'pricePerUnit', type: 'number', label: 'Price per unit', required: false },
      { name: 'receipt', type: 'file', label: 'Receipt Attachment', required: false },
    ]
  },
  balance_added_template: {
    templateId: 'balance_added_template',
    name: 'Balance Added',
    fields: [
      { name: 'sourceOfFunds', type: 'dropdown', label: 'Source of Funds', options: ['Monthly Allowance', 'Refund', 'Settled Split', 'Side Income/Project', 'Gift'], required: true },
      { name: 'receipt', type: 'file', label: 'Receipt Attachment', required: false },
    ]
  },
};
