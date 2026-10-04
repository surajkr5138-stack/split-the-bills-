import { Category, Friend, BillItem } from '../types';
import { autoCategorize } from './categorizer';

export interface ParsedExpenseResult {
  title: string;
  totalAmount: number;
  category: Category;
  payerFriendId?: string;
  participantFriendIds: string[];
  items: BillItem[];
  tax?: number;
  tip?: number;
  notes: string;
  confidence: number;
}

export function parseReceiptOrExpenseText(
  text: string,
  friends: Friend[]
): ParsedExpenseResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let title = 'Expense';
  let totalAmount = 0;
  let tax = 0;
  let tip = 0;
  let payerFriendId: string | undefined;
  const participantFriendIds: string[] = [];
  const items: BillItem[] = [];

  // Match friend names in text (case-insensitive)
  const lowerText = text.toLowerCase();
  for (const friend of friends) {
    const friendNameLower = friend.name.toLowerCase();
    // Check if name is mentioned as payer: "paid by X", "X paid", "from X"
    const paidByRegex = new RegExp(`(?:paid by|by|payer:?|from)\\s+${friendNameLower}\\b`, 'i');
    const xPaidRegex = new RegExp(`\\b${friendNameLower}\\s+paid\\b`, 'i');
    
    if (paidByRegex.test(lowerText) || xPaidRegex.test(lowerText)) {
      payerFriendId = friend.id;
    }

    // Check if friend is mentioned as a participant
    if (lowerText.includes(friendNameLower)) {
      if (!participantFriendIds.includes(friend.id)) {
        participantFriendIds.push(friend.id);
      }
    }
  }

  // If no payer explicitly identified, but 1 friend is mentioned, or default to first
  if (!payerFriendId && participantFriendIds.length === 1) {
    payerFriendId = participantFriendIds[0];
  } else if (!payerFriendId && friends.length > 0) {
    payerFriendId = friends[0].id;
  }

  // If no specific participants were mentioned, include everyone in group
  const finalParticipants =
    participantFriendIds.length > 0 ? participantFriendIds : friends.map((f) => f.id);

  // Extract total amount: look for "total:? $?XX.XX" or biggest dollar amount
  const totalMatches = text.match(/(?:total|amount|balance due|final|sum)[\s:]*[$€£]?\s*(\d+(?:\.\d{1,2})?)/i);
  if (totalMatches && totalMatches[1]) {
    totalAmount = parseFloat(totalMatches[1]);
  }

  // Extract Tax
  const taxMatches = text.match(/(?:tax|sales tax|vat)[\s:]*[$€£]?\s*(\d+(?:\.\d{1,2})?)/i);
  if (taxMatches && taxMatches[1]) {
    tax = parseFloat(taxMatches[1]);
  }

  // Extract Tip
  const tipMatches = text.match(/(?:tip|gratuity)[\s:]*[$€£]?\s*(\d+(?:\.\d{1,2})?)/i);
  if (tipMatches && tipMatches[1]) {
    tip = parseFloat(tipMatches[1]);
  }

  // Extract Title from first line or merchant line
  if (lines.length > 0) {
    // Clean first line from prefixes like "Receipt from" or "Bill:"
    const firstLine = lines[0].replace(/^(receipt for|receipt from|bill for|expense:)\s*/i, '');
    title = firstLine.length > 40 ? firstLine.slice(0, 37) + '...' : firstLine;
  }

  // Extract line items: matches patterns like "Pizza 18.50" or "2x Latte $9.00" or "- Salad: $12"
  const itemRegex = /^(?:[-*•]\s*)?([A-Za-z0-9\s&'/]+?)(?:\s*[:=-]|\s+)\s*[$€£]?\s*(\d+(?:\.\d{1,2})?)$/;
  let lineItemSum = 0;

  lines.forEach((line, index) => {
    // Skip if line says "total", "subtotal", "tax", "tip", "paid by"
    if (/(?:total|subtotal|tax|tip|paid by|amount due)/i.test(line)) {
      return;
    }

    const match = line.match(itemRegex);
    if (match) {
      const itemName = match[1].trim();
      const itemPrice = parseFloat(match[2]);
      if (itemPrice > 0 && itemName.length > 1 && !/^(cash|card|visa|mastercard|change|date|time)$/i.test(itemName)) {
        // Try to see if this item line mentions a specific friend name
        const assignedFriends: string[] = [];
        for (const friend of friends) {
          if (line.toLowerCase().includes(friend.name.toLowerCase())) {
            assignedFriends.push(friend.id);
          }
        }

        items.push({
          id: `item_${Date.now()}_${index}`,
          name: itemName,
          price: itemPrice,
          assignedFriendIds: assignedFriends.length > 0 ? assignedFriends : finalParticipants,
        });
        lineItemSum += itemPrice;
      }
    }
  });

  // If totalAmount was not found, check if we have line items or any dollar amount
  if (totalAmount === 0) {
    if (lineItemSum > 0) {
      totalAmount = Math.round((lineItemSum + tax + tip) * 100) / 100;
    } else {
      // Find all currency matches in text and take the largest number
      const allNumbers = [...text.matchAll(/[$€£]\s*(\d+(?:\.\d{1,2})?)/g)].map((m) =>
        parseFloat(m[1])
      );
      if (allNumbers.length > 0) {
        totalAmount = Math.max(...allNumbers);
      } else {
        // Generic number scan
        const nums = [...text.matchAll(/\b(\d+\.\d{2})\b/g)].map((m) => parseFloat(m[1]));
        if (nums.length > 0) {
          totalAmount = Math.max(...nums);
        }
      }
    }
  }

  // Predict category
  const category = autoCategorize(`${title} ${text}`);

  return {
    title: title || 'Shared Expense',
    totalAmount: Math.max(0, totalAmount),
    category,
    payerFriendId,
    participantFriendIds: finalParticipants,
    items,
    tax: tax > 0 ? tax : undefined,
    tip: tip > 0 ? tip : undefined,
    notes: text.trim().slice(0, 300),
    confidence: totalAmount > 0 ? (items.length > 0 ? 95 : 80) : 50,
  };
}
