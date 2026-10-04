export interface FriendShare {
  id: string;
  name: string;
  paid: number; // How much they paid upfront
  share: number; // How much they have to pay (calculated to sum exactly to bill)
  amountLeft: number; // How much amount left on their share (Math.max(0, share - paid))
  netBalance: number; // paid - share (> 0 gets back, < 0 owes)
  customShare?: number; // Optional user override if not equal
}

export interface OccasionHistoryItem {
  id: string;
  occasionName: string;
  billAmount: number;
  numPeople: number;
  date: string;
  currencySymbol: string;
  friends: {
    name: string;
    paid: number;
    share: number;
    amountLeft: number;
    netBalance: number;
  }[];
  totalPaid: number;
  settled: boolean;
}

export interface SimplifiedDebt {
  from: string;
  to: string;
  amount: number;
}

/**
 * Validates the bill amount and number of people according to requirements:
 * Must not be empty, zero, or negative.
 */
export function validateSplitInputs(
  billAmountStr: string,
  numPeopleStr: string
): { isValid: boolean; errorMessage: string | null } {
  const trimmedBill = billAmountStr.trim();
  const trimmedPeople = numPeopleStr.trim();

  if (trimmedBill === '' || trimmedPeople === '') {
    return {
      isValid: false,
      errorMessage: 'Please enter both the bill amount and the number of people.',
    };
  }

  const bill = parseFloat(trimmedBill);
  const people = parseInt(trimmedPeople, 10);

  if (isNaN(bill)) {
    return {
      isValid: false,
      errorMessage: 'Bill amount must be a valid number.',
    };
  }

  if (isNaN(people)) {
    return {
      isValid: false,
      errorMessage: 'Number of people must be a valid number.',
    };
  }

  if (bill <= 0 && people <= 0) {
    return {
      isValid: false,
      errorMessage: 'Bill amount and number of people must both be greater than zero.',
    };
  }

  if (bill <= 0) {
    return {
      isValid: false,
      errorMessage: bill === 0
        ? 'Bill amount cannot be zero. Please enter an amount greater than 0.'
        : 'Bill amount cannot be negative. Please enter a positive amount.',
    };
  }

  if (people <= 0) {
    return {
      isValid: false,
      errorMessage: people === 0
        ? 'Number of people cannot be zero. Please enter at least 1 person.'
        : 'Number of people cannot be negative. Please enter a positive number of people.',
    };
  }

  return { isValid: true, errorMessage: null };
}

/**
 * Distributes bill amount among friends such that the sum of shares
 * EXACTLY equals the bill amount down to the last penny, without any rounding loss.
 */
export function calculateExactShares(
  totalBill: number,
  friends: { id: string; name: string; paid: number; customShare?: number }[],
  mode: 'equal' | 'custom' = 'equal'
): FriendShare[] {
  const count = friends.length;
  if (count === 0 || totalBill <= 0) return [];

  // Round total bill to 2 decimal places to avoid floating point issues
  const roundedTotal = Math.round(totalBill * 100) / 100;

  if (mode === 'equal') {
    // Exact penny distribution:
    // Base amount in cents:
    const totalCents = Math.round(roundedTotal * 100);
    const baseCentsPerPerson = Math.floor(totalCents / count);
    const remainderCents = totalCents % count; // Extra pennies to distribute to the first N people

    return friends.map((f, index) => {
      // First 'remainderCents' people get 1 extra cent so the total matches exactly
      const personCents = baseCentsPerPerson + (index < remainderCents ? 1 : 0);
      const share = personCents / 100;
      const paid = Math.round((Number(f.paid) || 0) * 100) / 100;
      const amountLeft = Math.round(Math.max(0, share - paid) * 100) / 100;
      const netBalance = Math.round((paid - share) * 100) / 100;

      return {
        id: f.id,
        name: f.name,
        paid,
        share,
        amountLeft,
        netBalance,
      };
    });
  } else {
    // Custom amounts
    let allocated = 0;
    return friends.map((f, index) => {
      let share = Number(f.customShare) || 0;
      if (index === count - 1) {
        // Last person absorbs remaining to make sum exact
        share = Math.round((roundedTotal - allocated) * 100) / 100;
      } else {
        allocated = Math.round((allocated + share) * 100) / 100;
      }
      const paid = Math.round((Number(f.paid) || 0) * 100) / 100;
      const amountLeft = Math.round(Math.max(0, share - paid) * 100) / 100;
      const netBalance = Math.round((paid - share) * 100) / 100;

      return {
        id: f.id,
        name: f.name,
        paid,
        share,
        amountLeft,
        netBalance,
        customShare: f.customShare,
      };
    });
  }
}

/**
 * Debt Simplification Algorithm
 * Given a list of friend shares with netBalances, calculates minimal direct transfers.
 */
export function simplifyDebts(friends: FriendShare[]): SimplifiedDebt[] {
  const debtors: { name: string; amount: number }[] = [];
  const creditors: { name: string; amount: number }[] = [];

  for (const f of friends) {
    if (f.netBalance < -0.009) {
      debtors.push({ name: f.name, amount: Math.abs(f.netBalance) });
    } else if (f.netBalance > 0.009) {
      creditors.push({ name: f.name, amount: f.netBalance });
    }
  }

  // Sort descending
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: SimplifiedDebt[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const amount = Math.min(debtor.amount, creditor.amount);
    const rounded = Math.round(amount * 100) / 100;

    if (rounded > 0.009) {
      transfers.push({
        from: debtor.name,
        to: creditor.name,
        amount: rounded,
      });
    }

    debtor.amount = Math.round((debtor.amount - amount) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - amount) * 100) / 100;

    if (debtor.amount < 0.01) d++;
    if (creditor.amount < 0.01) c++;
  }

  return transfers;
}

export function formatCurrency(amount: number, symbol: string = '$'): string {
  const rounded = Math.round(amount * 100) / 100;
  const isNegative = rounded < -0.001;
  const abs = Math.abs(rounded).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}${symbol}${abs}`;
}
