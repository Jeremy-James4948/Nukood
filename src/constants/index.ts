import {
  ShoppingBag,
  Coffee,
  Train,
  Home,
  User,
  Film,
  HeartPulse,
  Book,
  ArrowDownCircle
} from 'lucide-react';

export const COLORS = {
  sand: '#F5F2EC',        // Base background
  textPrimary: '#6A6356', // Warm dark gray/brown from the Neumorphic design
  textSecondary: '#9B968B', // Warm medium gray/brown
  
  // Vibrant, elegant, highly distinct palette
  coralRed: '#F26457',
  brightOrange: '#FF9F1C',
  sunflowerYellow: '#FFD166',
  emeraldGreen: '#06D6A0',
  skyBlue: '#118AB2',
  royalIndigo: '#073B4C',
  amethystPurple: '#9D4EDD',
  hotPink: '#F72585',
  slateGrey: '#8D99AE',
  neonGreen: '#00F5D4',
};

export const CATEGORY_COLORS = {
  Groceries: COLORS.emeraldGreen,
  Food: COLORS.coralRed,
  Transport: COLORS.skyBlue,
  Shopping: COLORS.hotPink,
  Entertainment: COLORS.amethystPurple,
  Medical: COLORS.neonGreen,
  House: COLORS.royalIndigo,
  Personal: COLORS.brightOrange,
  College: COLORS.slateGrey,
  BalanceAdded: COLORS.sunflowerYellow
};

export const CATEGORY_DEF = {
  'Groceries': { icon: ShoppingBag, color: CATEGORY_COLORS.Groceries, req: ['Item Name'], opt: ['Quantity', 'Unit', 'Store', 'Receipt', 'Notes'] },
  'Food': { icon: Coffee, color: CATEGORY_COLORS.Food, req: ['Item Name'], opt: ['Restaurant', 'Receipt', 'Notes'] },
  'Transport': { icon: Train, color: CATEGORY_COLORS.Transport, req: ['Transport Mode'], opt: ['From', 'To', 'Notes'] },
  'House': { icon: Home, color: CATEGORY_COLORS.House, req: ['Item Name'], opt: ['Shared Expense', 'Store', 'Receipt', 'Notes'] },
  'Personal': { icon: User, color: CATEGORY_COLORS.Personal, req: ['Item Name'], opt: ['Brand', 'Store', 'Receipt', 'Notes'] },
  'Entertainment': { icon: Film, color: CATEGORY_COLORS.Entertainment, req: ['Activity'], opt: ['People', 'Notes'] },
  'Medical': { icon: HeartPulse, color: CATEGORY_COLORS.Medical, req: ['Medicine'], opt: ['Pharmacy', 'Receipt', 'Notes'] },
  'College': { icon: Book, color: CATEGORY_COLORS.College, req: ['Item Name'], opt: ['Subject', 'Receipt', 'Notes'] },
  'Balance Added': { icon: ArrowDownCircle, color: COLORS.sage, req: ['Source'], opt: ['Notes'] }
};

export const FAST_ENTRIES = [
  { icon: '🥚', name: 'Eggs', category: 'Groceries', price: '12.00', quantity: '12', unit: 'Carton' },
  { icon: '🍗', name: 'Chicken Breast', category: 'Groceries', price: '20.00', quantity: '500', unit: 'grams' },
  { icon: '🚌', name: 'Auto Ride', category: 'Transport', price: '5.00' },
  { icon: '🥛', name: 'Milk', category: 'Groceries', price: '4.50', quantity: '1', unit: 'Liter' },
  { icon: '🍜', name: 'Lunch', category: 'Food', price: '15.00' },
];
