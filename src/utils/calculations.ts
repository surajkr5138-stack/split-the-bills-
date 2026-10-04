import { Group, FriendBalanceSummary, DebtTransfer, SplitType, BillItem, BillParticipant } from '../types';

export function formatCurrency(amount: number, symbol: string = '$'): string {
  const rounded = Math.round(amount * 100) / 100;
  const isNegative = rounded < -0.001;
  const absVal = Math.abs(rounded).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}${symbol}${absVal}`;
}

/**
 * Calculates for each friend:
 * - How much they have to pay (total share obligation)
 * - How much they paid (bills paid upfront + settlements paid)
 * - How much amount left on their share (pending balance left to settle)
 * - Net balance (> 0 means gets back, < 0 means owes)
 */
export function calculateFriendBalances(group: Group): FriendBalanceSummary[] {
  const summaryMap = new Map<string, {
    haveToPay: number;
    directPaid: number;
    settlementsPaid: number;
    settlementsReceived: number;
  }>();

  // Initialize for all friends
  for (const friend of group.friends) {
    summaryMap.set(friend.id, {
      haveToPay: 0,
      directPaid: 0,
      settlementsPaid: 0,
      settlementsReceived: 0,
    });
  }

  // Sum bills share (what they have to pay) and upfront payments
  for (const bill of group.bills) {
    // Who paid upfront
    for (const payer of bill.payers) {
      const current = summaryMap.get(payer.friendId);
      if (current) {
        current.directPaid += Number(payer.amount || 0);
      }
    }

    // What each participant's share is (have to pay)
    for (const participant of bill.participants) {
      const current = summaryMap.get(participant.friendId);
      if (current) {
        current.haveToPay += Number(participant.shareAmount || 0);
      }
    }
  }

  // Sum settlements
  for (const settlement of group.settlements) {
    const debtor = summaryMap.get(settlement.fromFriendId);
    if (debtor) {
      debtor.settlementsPaid += Number(settlement.amount || 0);
    }
    const creditor = summaryMap.get(settlement.toFriendId);
    if (creditor) {
      creditor.settlementsReceived += Number(settlement.amount || 0);
    }
  }

  // Build the balance list
  return group.friends.map((friend) => {
    const data = summaryMap.get(friend.id) || {
      haveToPay: 0,
      directPaid: 0,
      settlementsPaid: 0,
      settlementsReceived: 0,
    };

    const totalPaid = Math.round((data.directPaid + data.settlementsPaid) * 100) / 100;
    const haveToPay = Math.round(data.haveToPay * 100) / 100;
    const settlementsReceived = Math.round(data.settlementsReceived * 100) / 100;

    // Net balance = (money you paid) - (money you received) - (your share of bills)
    // Positive: you have overpaid / others owe you.
    // Negative: you underpaid / you owe others.
    const netBalance = Math.round((totalPaid - settlementsReceived - haveToPay) * 100) / 100;

    // Amount left on their share:
    // If they owe money (netBalance < 0), the amount left to pay is Math.abs(netBalance).
    // If netBalance >= 0, they have zero amount left on their share (they have settled or overpaid).
    const amountLeftOnShare = netBalance < -0.009 ? Math.abs(netBalance) : 0;

    let status: 'OWES' | 'GETS_BACK' | 'SETTLED' = 'SETTLED';
    if (netBalance < -0.009) {
      status = 'OWES';
    } else if (netBalance > 0.009) {
      status = 'GETS_BACK';
    }

    return {
      friendId: friend.id,
      name: friend.name,
      color: friend.color,
      upiId: friend.upiId,
      haveToPay,
      totalPaid,
      settlementsReceived,
      netBalance,
      amountLeftOnShare,
      status,
    };
  });
}

/**
 * Automated Debt Simplification Algorithm
 * Reduces N*(N-1) potential pairwise debts to a minimal set of transfers.
 * Uses greedy two-pointer maximum debtor to maximum creditor matching.
 */
export function simplifyDebts(group: Group): DebtTransfer[] {
  const balances = calculateFriendBalances(group);
  const friendNameMap = new Map(group.friends.map((f) => [f.id, f.name]));

  // Debtors have negative balance (they owe money)
  const debtors: { id: string; amount: number }[] = [];
  // Creditors have positive balance (they are owed money)
  const creditors: { id: string; amount: number }[] = [];

  for (const b of balances) {
    if (b.netBalance < -0.009) {
      debtors.push({ id: b.friendId, amount: Math.abs(b.netBalance) });
    } else if (b.netBalance > 0.009) {
      creditors.push({ id: b.friendId, amount: b.netBalance });
    }
  }

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: DebtTransfer[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const transferAmount = Math.min(debtor.amount, creditor.amount);
    const rounded = Math.round(transferAmount * 100) / 100;

    if (rounded > 0.009) {
      transfers.push({
        fromId: debtor.id,
        fromName: friendNameMap.get(debtor.id) || 'Friend',
        toId: creditor.id,
        toName: friendNameMap.get(creditor.id) || 'Friend',
        amount: rounded,
      });
    }

    debtor.amount = Math.round((debtor.amount - transferAmount) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - transferAmount) * 100) / 100;

    if (debtor.amount < 0.01) {
      dIdx++;
    }
    if (creditor.amount < 0.01) {
      cIdx++;
    }
  }

  return transfers;
}

/**
 * Calculates participants shares for a bill given split type and custom values
 */
export function calculateBillParticipants(
  totalAmount: number,
  splitType: SplitType,
  participantIds: string[],
  options?: {
    exactValues?: Record<string, number>;
    percentages?: Record<string, number>;
    shares?: Record<string, number>;
    items?: BillItem[];
    tax?: number;
    tip?: number;
  }
): BillParticipant[] {
  if (participantIds.length === 0) return [];

  const participants: BillParticipant[] = [];

  if (splitType === 'EQUAL') {
    const count = participantIds.length;
    const baseShare = Math.floor((totalAmount / count) * 100) / 100;
    let distributed = 0;

    participantIds.forEach((id, index) => {
      let share = baseShare;
      // Add remainder pennies to the first few people to make total match exact sum
      if (index === count - 1) {
        share = Math.round((totalAmount - distributed) * 100) / 100;
      } else {
        distributed = Math.round((distributed + share) * 100) / 100;
      }
      participants.push({ friendId: id, shareAmount: share });
    });
  } else if (splitType === 'EXACT') {
    const exact = options?.exactValues || {};
    participantIds.forEach((id) => {
      participants.push({
        friendId: id,
        shareAmount: Number(exact[id] || 0),
      });
    });
  } else if (splitType === 'PERCENTAGE') {
    const pcts = options?.percentages || {};
    participantIds.forEach((id) => {
      const pct = Number(pcts[id] || 0);
      const share = Math.round(((totalAmount * pct) / 100) * 100) / 100;
      participants.push({
        friendId: id,
        shareAmount: share,
        percentage: pct,
      });
    });
  } else if (splitType === 'SHARES') {
    const sharesMap = options?.shares || {};
    const totalShares = participantIds.reduce((sum, id) => sum + (Number(sharesMap[id]) || 1), 0);
    
    let distributed = 0;
    participantIds.forEach((id, index) => {
      const count = Number(sharesMap[id]) || 1;
      let share = totalShares > 0 ? Math.round(((totalAmount * count) / totalShares) * 100) / 100 : 0;
      
      if (index === participantIds.length - 1) {
        share = Math.round((totalAmount - distributed) * 100) / 100;
      } else {
        distributed = Math.round((distributed + share) * 100) / 100;
      }

      participants.push({
        friendId: id,
        shareAmount: Math.max(0, share),
        shares: count,
      });
    });
  } else if (splitType === 'ITEMIZED') {
    const items = options?.items || [];
    const tax = Number(options?.tax || 0);
    const tip = Number(options?.tip || 0);

    const subtotalMap: Record<string, number> = {};
    participantIds.forEach((id) => (subtotalMap[id] = 0));

    let itemsTotal = 0;
    for (const item of items) {
      itemsTotal += item.price;
      const assigned = item.assignedFriendIds.length > 0 ? item.assignedFriendIds : participantIds;
      const itemPerPerson = item.price / assigned.length;
      for (const id of assigned) {
        if (subtotalMap[id] !== undefined) {
          subtotalMap[id] += itemPerPerson;
        }
      }
    }

    // Distribute tax and tip proportionally to food subtotal
    const extraTotal = tax + tip;
    let distributed = 0;

    participantIds.forEach((id, index) => {
      const subtotal = subtotalMap[id] || 0;
      const extraRatio = itemsTotal > 0 ? subtotal / itemsTotal : 1 / participantIds.length;
      const extraShare = extraTotal * extraRatio;
      let totalShare = Math.round((subtotal + extraShare) * 100) / 100;

      if (index === participantIds.length - 1 && itemsTotal > 0) {
        // Adjust for rounding
        const expectedTotal = itemsTotal + extraTotal;
        totalShare = Math.round((expectedTotal - distributed) * 100) / 100;
      } else {
        distributed = Math.round((distributed + totalShare) * 100) / 100;
      }

      participants.push({
        friendId: id,
        shareAmount: Math.max(0, totalShare),
      });
    });
  }

  return participants;
}
