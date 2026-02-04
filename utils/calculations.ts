
import { Trip, Settlement, Person, Expense } from '../types';

export interface PersonBalance {
  totalPaid: number;
  share: number;
  netBalance: number;
  isMerged?: boolean;
  mergedWithNames?: string[];
}

export const formatCurrency = (amount: number, currencyCode: string = 'SEK'): string => {
  try {
    const locale = currencyCode === 'SEK' ? 'sv-SE' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch (e) {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
};

export const formatInputAmount = (val: string): string => {
  const clean = val.replace(/\s/g, '');
  const parts = clean.split(/[.,]/);
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const separator = val.includes(',') ? ',' : '.';
  return parts.length > 1 ? `${parts[0]}${separator}${parts[1]}` : parts[0];
};

export const parseInputAmount = (val: string): number => {
  const clean = val.replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export const getBalanceGroups = (people: Person[]): string[][] => {
  const groups: string[][] = [];
  const visited = new Set<string>();

  people.forEach(p => {
    if (visited.has(p.id)) return;
    
    if (p.mergedWithId) {
      const partner = people.find(other => other.id === p.mergedWithId);
      if (partner) {
        groups.push([p.id, partner.id]);
        visited.add(p.id);
        visited.add(partner.id);
        return;
      }
    }
    
    groups.push([p.id]);
    visited.add(p.id);
  });

  return groups;
};

export const calculateDetailedBalances = (trip: Trip): Record<string, PersonBalance> => {
  const groups = getBalanceGroups(trip.people);
  const breakdown: Record<string, PersonBalance> = {};
  
  const personToGroup: Record<string, string> = {};
  groups.forEach(groupIds => {
    const key = groupIds.sort().join('|');
    const isMerged = groupIds.length > 1;
    const names = groupIds.map(id => trip.people.find(p => p.id === id)?.name || '');
    
    breakdown[key] = { 
      totalPaid: 0, 
      share: 0, 
      netBalance: 0,
      isMerged,
      mergedWithNames: isMerged ? names : undefined
    };
    groupIds.forEach(id => personToGroup[id] = key);
  });

  trip.expenses.forEach(expense => {
    const groupKey = personToGroup[expense.paidById];
    const valueInBase = expense.amount * (expense.exchangeRate || 1);
    
    if (breakdown[groupKey]) {
      breakdown[groupKey].totalPaid += valueInBase;
    }

    const participants = expense.splitAmongIds === 'ALL' 
      ? trip.people.map(p => p.id) 
      : expense.splitAmongIds;

    if (participants.length > 0) {
      const perPerson = valueInBase / participants.length;
      participants.forEach(pId => {
        const pGroupKey = personToGroup[pId];
        if (breakdown[pGroupKey]) {
          breakdown[pGroupKey].share += perPerson;
        }
      });
    }
  });

  Object.keys(breakdown).forEach(key => {
    breakdown[key].netBalance = breakdown[key].totalPaid - breakdown[key].share;
  });

  return breakdown;
};

/**
 * Smarter Settlement Algorithm: "Best-Fit Sink"
 * 
 * Rules:
 * 1. Every person/group makes AT MOST one outbound payment.
 * 2. One person CAN receive multiple inbound payments.
 * 3. Priority is given to matching debts to creditors who can absorb them,
 *    minimizing "pass-through" volume and keeping payments direct.
 */
export const calculateOptimizedSettlements = (trip: Trip): Settlement[] => {
  const detailed = calculateDetailedBalances(trip);
  
  // Get entities with non-zero balances
  let participants = Object.entries(detailed)
    .map(([id, b]) => ({ id, balance: b.netBalance }))
    .filter(p => Math.abs(p.balance) > 0.01);

  const settlements: Settlement[] = [];

  // Loop until all balances are settled
  // We re-sort every time because "overpaying" a creditor can turn them into a debtor.
  while (participants.length > 1) {
    // Sort so most negative (debtors) are at the start, most positive (creditors) at the end
    participants.sort((a, b) => a.balance - b.balance);
    
    const debtor = participants[0];
    const debtAmount = Math.abs(debtor.balance);
    
    // Step 1: Find a "Sink"
    // Search for a creditor who is owed AT LEAST as much as this debtor owes.
    // We prefer the "smallest" creditor that fits to leave big creditors for big debts.
    let bestCreditorIndex = -1;
    for (let i = participants.length - 1; i > 0; i--) {
      if (participants[i].balance >= debtAmount - 0.01) {
        bestCreditorIndex = i;
        // Keep looking to find the *smallest* creditor that can still absorb this debt
      } else {
        // Since it's sorted, once we hit a creditor too small, we stop looking
        break;
      }
    }

    if (bestCreditorIndex !== -1) {
      // SUCCESS: Found a person who can receive the whole debt directly.
      const creditor = participants[bestCreditorIndex];
      settlements.push({
        from: debtor.id,
        to: creditor.id,
        amount: debtAmount
      });
      creditor.balance += debtor.balance; // debt is negative, reducing creditor balance
      debtor.balance = 0;
    } else {
      // NO SINK FOUND: Debtor owes more than any single person is currently owed.
      // We are forced to "overpay" the largest creditor. 
      // That creditor will then become a debtor for the remainder in the next loop.
      const largestCreditor = participants[participants.length - 1];
      const amountToTransfer = debtAmount;
      
      settlements.push({
        from: debtor.id,
        to: largestCreditor.id,
        amount: amountToTransfer
      });
      
      largestCreditor.balance += debtor.balance; // This will make largestCreditor's balance negative
      debtor.balance = 0;
    }

    // Remove people who are now square
    participants = participants.filter(p => Math.abs(p.balance) > 0.01);
  }

  return settlements;
};

export const fetchExchangeRate = async (from: string, to: string): Promise<number> => {
  if (from === to) return 1;
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    const data = await res.json();
    return data.rates[to] || 1;
  } catch (e) {
    return 1;
  }
};

export const ALL_CURRENCIES = [
  { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'DKK', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'PLN', name: 'Polish Zloty', flag: '🇵🇱' },
  { code: 'CZK', name: 'Czech Koruna', flag: '🇨🇿' },
  { code: 'HUF', name: 'Hungarian Forint', flag: '🇭🇺' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
];
