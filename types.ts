
export interface Person {
  id: string;
  name: string;
  mergedWithId?: string; // ID of the person this person shares a balance with
}

export interface Expense {
  id: string;
  description: string;
  category?: string;
  amount: number; // The original amount in the original currency
  currency: string;
  exchangeRate: number; // 1 unit of currency = X units of base currency
  paidById: string;
  splitAmongIds: string[] | 'ALL';
  date: number;
}

export interface Trip {
  id: string;
  name: string;
  baseCurrency: string;
  people: Person[];
  expenses: Expense[];
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface TripHistoryItem {
  id: string;
  name: string;
  lastVisited: number;
}

export type AppView = 'ONBOARDING' | 'PEOPLE_SETUP' | 'DASHBOARD' | 'ADD_EXPENSE' | 'EDIT_EXPENSE';
