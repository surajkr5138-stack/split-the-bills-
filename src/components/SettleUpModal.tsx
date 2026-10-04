import React, { useState, useEffect } from 'react';
import { Group, Settlement } from '../types';
import { calculateFriendBalances, formatCurrency, simplifyDebts } from '../utils/calculations';
import { X, ArrowRight, Check, CreditCard, DollarSign } from 'lucide-react';

interface SettleUpModalProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
  onRecordSettlement: (settlementData: Omit<Settlement, 'id' | 'createdAt'>) => void;
  prefillFromId?: string;
  prefillToId?: string;
  prefillAmount?: number;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  group,
  isOpen,
  onClose,
  onRecordSettlement,
  prefillFromId,
  prefillToId,
  prefillAmount,
}) => {
  const [fromFriendId, setFromFriendId] = useState(group.friends[0]?.id || '');
  const [toFriendId, setToFriendId] = useState(group.friends[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Settlement['paymentMethod']>('Venmo');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const balances = calculateFriendBalances(group);
  const simplified = simplifyDebts(group);

  useEffect(() => {
    if (prefillFromId) setFromFriendId(prefillFromId);
    if (prefillToId) setToFriendId(prefillToId);
    if (prefillAmount && prefillAmount > 0) {
      setAmount(prefillAmount.toFixed(2));
    } else {
      // Find if there's a suggested transfer between these two
      const match = simplified.find(
        (s) => s.fromId === (prefillFromId || fromFriendId) && s.toId === (prefillToId || toFriendId)
      );
      if (match) {
        setAmount(match.amount.toFixed(2));
      }
    }
  }, [prefillFromId, prefillToId, prefillAmount, isOpen]);

  if (!isOpen) return null;

  const handleFromChange = (newFromId: string) => {
    setFromFriendId(newFromId);
    const match = simplified.find((s) => s.fromId === newFromId && s.toId === toFriendId);
    if (match) setAmount(match.amount.toFixed(2));
  };

  const handleToChange = (newToId: string) => {
    setToFriendId(newToId);
    const match = simplified.find((s) => s.fromId === fromFriendId && s.toId === newToId);
    if (match) setAmount(match.amount.toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fromFriendId === toFriendId) {
      setError('Payer and recipient cannot be the same person.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    onRecordSettlement({
      groupId: group.id,
      fromFriendId,
      toFriendId,
      amount: numAmount,
      date,
      paymentMethod,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const fromFriend = group.friends.find((f) => f.id === fromFriendId);
  const toFriend = group.friends.find((f) => f.id === toFriendId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg my-8 overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Record Settle Up Payment</h3>
            <p className="text-xs text-neutral-400">
              Direct transfer between friends to settle debts
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Direction: From -> To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
            <div>
              <label className="block text-[11px] text-neutral-400 uppercase tracking-wider font-semibold mb-1">
                Who is paying? (Debtor)
              </label>
              <select
                aria-label="Who is paying (Debtor)"
                value={fromFriendId}
                onChange={(e) => handleFromChange(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-neutral-600"
              >
                {group.friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-neutral-400 uppercase tracking-wider font-semibold mb-1">
                Who is receiving? (Creditor)
              </label>
              <select
                aria-label="Who is receiving (Creditor)"
                value={toFriendId}
                onChange={(e) => handleToChange(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-neutral-600"
              >
                {group.friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Payment Amount ({group.currencySymbol})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono">
                {group.currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-sm text-white font-mono tabular-nums rounded-lg pl-8 pr-3 py-2.5 focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>

          {/* Payment Method and Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Payment Channel
              </label>
              <select
                aria-label="Payment Channel"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as Settlement['paymentMethod'])}
                className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-neutral-600"
              >
                <option value="Venmo">Venmo</option>
                <option value="UPI">UPI / Google Pay</option>
                <option value="Cash">Cash</option>
                <option value="PayPal">PayPal</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Notes / Transaction ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Settle cabin balance, Venmo #9482"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-600"
            />
          </div>

          {/* Preview banner */}
          {fromFriend && toFriend && (
            <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg text-xs flex items-center justify-between text-neutral-300">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-white">{fromFriend.name}</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                <span className="font-semibold text-white">{toFriend.name}</span>
              </span>
              <span className="font-mono tabular-nums text-emerald-400 font-bold">
                {formatCurrency(parseFloat(amount) || 0, group.currencySymbol)}
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-sm"
            >
              Confirm Settlement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
