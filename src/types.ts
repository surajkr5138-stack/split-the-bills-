export type Category = 
  | 'Dining' 
  | 'Groceries' 
  | 'Travel' 
  | 'Lodging' 
  | 'Entertainment' 
  | 'Utilities' 
  | 'Transport' 
  | 'Shopping' 
  | 'Other';

export type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES' | 'ITEMIZED';

export interface Friend {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  upiId?: string; // UPI, Venmo handle, or PayPal
  color: string;
  notes?: string;
}

export interface BillPayer {
  friendId: string;
  amount: number;
}

export interface BillParticipant {
  friendId: string;
  shareAmount: number;
  percentage?: number;
  shares?: number;
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  assignedFriendIds: string[];
}

export interface Bill {
  id: string;
  groupId: string;
  title: string;
  category: Category;
  totalAmount: number;
  date: string; // ISO date string YYYY-MM-DD
  payers: BillPayer[]; // Who paid upfront
  splitType: SplitType;
  participants: BillParticipant[]; // What each person owes
  items?: BillItem[];
  tax?: number;
  tip?: number;
  notes?: string;
  createdAt: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromFriendId: string; // Debtor paying
  toFriendId: string; // Creditor receiving
  amount: number;
  date: string;
  paymentMethod: 'Cash' | 'Venmo' | 'UPI' | 'PayPal' | 'Bank Transfer' | 'Other';
  notes?: string;
  createdAt: string;
}

export interface RecurringExpense {
  id: string;
  groupId: string;
  title: string;
  category: Category;
  amount: number;
  frequency: 'Monthly' | 'Weekly' | 'Biweekly';
  payerId: string;
  splitType: SplitType;
  participantIds: string[];
  nextDueDate: string;
  active: boolean;
}

export interface ActivityLog {
  id: string;
  groupId: string;
  action: 'BILL_ADDED' | 'BILL_DELETED' | 'BILL_EDITED' | 'SETTLEMENT_RECORDED' | 'FRIEND_ADDED' | 'RECURRING_LOGGED';
  description: string;
  timestamp: string;
}

export interface Group {
  id: string;
  name: string;
  currency: string;
  currencySymbol: string;
  friends: Friend[];
  bills: Bill[];
  settlements: Settlement[];
  recurringExpenses: RecurringExpense[];
  activityLogs: ActivityLog[];
  createdAt: string;
}

// Calculated statistics for an individual friend
export interface FriendBalanceSummary {
  friendId: string;
  name: string;
  color: string;
  upiId?: string;
  // What they have to pay (their total share of expenses)
  haveToPay: number;
  // What they paid upfront for bills + settlements they paid out
  totalPaid: number;
  // Settlements received from other friends
  settlementsReceived: number;
  // Net balance: (totalPaid - settlementsReceived) - haveToPay
  // > 0 means they are owed money (others owe them)
  // < 0 means they owe money (amount left on their share)
  netBalance: number;
  // Absolute pending share left to settle (if netBalance < 0, this is Math.abs(netBalance), else 0)
  amountLeftOnShare: number;
  // Status tag
  status: 'OWES' | 'GETS_BACK' | 'SETTLED';
}

// Minimal debt transaction for automated settlement
export interface DebtTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}
