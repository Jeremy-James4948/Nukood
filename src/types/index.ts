import { LucideIcon } from 'lucide-react';

export interface FastEntry {
  icon: string;
  name?: string;
  category: string;
  price?: string;
  quantity?: string;
  unit?: string;
  notes?: string;
}

export interface CategoryDefinition {
  icon: LucideIcon;
  color: string;
  req: string[];
  opt: string[];
}

export interface Transaction {
  id?: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  time: string;
  icon: LucideIcon;
  color?: string;
  emoji?: string;
  quantity?: string;
  unit?: string;
  store?: string;
  restaurant?: string;
  receipt?: boolean;
  notes?: string;
}

export interface DailyCardData {
  id: number;
  date: string;
  day: string;
  spent: string;
  transactions: number;
  type: 'past' | 'today' | 'future';
  recent?: { name: string; price: string; icon: string }[];
}
