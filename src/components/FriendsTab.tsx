import React, { useState } from 'react';
import { Group, FriendBalanceSummary, Friend } from '../types';
import { calculateFriendBalances, formatCurrency } from '../utils/calculations';
import { 
  UserPlus, 
  ArrowRight, 
  Share2, 
  Check, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  Copy,
  ChevronRight
} from 'lucide-react';

interface FriendsTabProps {
  group: Group;
  onOpenAddFriend: () => void;
  onSelectFriendLedger: (friendId: string) => void;
  onQuickSettle: (fromId: string, toId: string, amount: number) => void;
}

export const FriendsTab: React.FC<FriendsTabProps> = ({
  group,
  onOpenAddFriend,
  onSelectFriendLedger,
  onQuickSettle,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const balances = calculateFriendBalances(group);
  const totalGroupExpenses = group.bills.reduce((sum, b) => sum + b.totalAmount, 0);

  const filteredBalances = balances.filter((b) =>
    b.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const copyReminderMessage = (b: FriendBalanceSummary) => {
    let msg = '';
    if (b.status === 'OWES') {
      msg = `Hey ${b.name}! Quick split update for "${group.name}":\n` +
        `• Your total share: ${formatCurrency(b.haveToPay, group.currencySymbol)}\n` +
        `• Total you've paid so far: ${formatCurrency(b.totalPaid, group.currencySymbol)}\n` +
        `• Amount left on your share: ${formatCurrency(b.amountLeftOnShare, group.currencySymbol)}\n` +
        (b.upiId ? `Payment handle: ${b.upiId}\n` : '') +
        `Thanks!`;
    } else if (b.status === 'GETS_BACK') {
      msg = `Hey ${b.name}! Balance update for "${group.name}":\n` +
        `• Your total share: ${formatCurrency(b.haveToPay, group.currencySymbol)}\n` +
        `• Total you've paid: ${formatCurrency(b.totalPaid, group.currencySymbol)}\n` +
        `• You are owed back: ${formatCurrency(b.netBalance, group.currencySymbol)}`;
    } else {
      msg = `Hey ${b.name}! All settled up for "${group.name}". Balance is $0.00!`;
    }

    navigator.clipboard.writeText(msg);
    setCopiedId(b.friendId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Friends Share & Balance Ledger
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time tracking of what each friend has to pay, paid upfront, and remaining balance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search friend..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-600 w-40 sm:w-56"
          />
          <button
            onClick={onOpenAddFriend}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Friend</span>
          </button>
        </div>
      </div>

      {/* Aggregate Group Share Overview Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4">
        <div>
          <span className="text-xs text-neutral-400 block">Total Group Expenses</span>
          <span className="text-xl font-bold text-white font-mono tabular-nums mt-0.5 block">
            {formatCurrency(totalGroupExpenses, group.currencySymbol)}
          </span>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">
            Across {group.bills.length} shared bills
          </span>
        </div>

        <div>
          <span className="text-xs text-neutral-400 block">Group Members</span>
          <span className="text-xl font-bold text-white font-mono tabular-nums mt-0.5 block">
            {group.friends.length} friends
          </span>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">
            Average share: {formatCurrency(group.friends.length > 0 ? totalGroupExpenses / group.friends.length : 0, group.currencySymbol)}
          </span>
        </div>

        <div>
          <span className="text-xs text-neutral-400 block">Pending to Settle</span>
          <span className="text-xl font-bold text-amber-400 font-mono tabular-nums mt-0.5 block">
            {formatCurrency(
              balances.filter((b) => b.status === 'OWES').reduce((sum, b) => sum + b.amountLeftOnShare, 0),
              group.currencySymbol
            )}
          </span>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">
            {balances.filter((b) => b.status === 'OWES').length} friends with pending share
          </span>
        </div>

        <div>
          <span className="text-xs text-neutral-400 block">Settled Transactions</span>
          <span className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-0.5 block">
            {group.settlements.length} recorded
          </span>
          <span className="text-[11px] text-neutral-500 mt-0.5 block">
            Total settled: {formatCurrency(group.settlements.reduce((sum, s) => sum + s.amount, 0), group.currencySymbol)}
          </span>
        </div>
      </div>

      {/* Friends Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredBalances.map((b) => {
          const friend = group.friends.find((f) => f.id === b.friendId);
          const percentPaid = b.haveToPay > 0 ? Math.min(100, Math.round((b.totalPaid / b.haveToPay) * 100)) : 100;

          return (
            <div
              key={b.friendId}
              className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header row: Avatar, Name, Handle, Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-inner"
                      style={{ backgroundColor: b.color || '#3B82F6' }}
                    >
                      {b.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                        {b.name}
                      </h3>
                      <div className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                        {friend?.upiId ? (
                          <span>{friend.upiId}</span>
                        ) : friend?.phone ? (
                          <span>{friend.phone}</span>
                        ) : (
                          <span className="text-neutral-500">Group Member</span>
                        )}
                        {friend?.notes && (
                          <>
                            <span aria-hidden="true" className="text-neutral-600">·</span>
                            <span className="text-neutral-400 truncate max-w-[180px]">{friend.notes}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Net Status Indicator (clean unboxed text) */}
                  <div className="text-right shrink-0">
                    {b.status === 'OWES' && (
                      <div>
                        <span className="text-[11px] font-medium text-amber-400 flex items-center justify-end gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Owes Group</span>
                        </span>
                        <span className="text-base font-bold text-amber-400 font-mono tabular-nums block">
                          -{formatCurrency(b.amountLeftOnShare, group.currencySymbol)}
                        </span>
                      </div>
                    )}
                    {b.status === 'GETS_BACK' && (
                      <div>
                        <span className="text-[11px] font-medium text-emerald-400 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Gets Back</span>
                        </span>
                        <span className="text-base font-bold text-emerald-400 font-mono tabular-nums block">
                          +{formatCurrency(b.netBalance, group.currencySymbol)}
                        </span>
                      </div>
                    )}
                    {b.status === 'SETTLED' && (
                      <div>
                        <span className="text-[11px] font-medium text-neutral-400 flex items-center justify-end gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>All Settled</span>
                        </span>
                        <span className="text-base font-bold text-neutral-400 font-mono tabular-nums block">
                          {formatCurrency(0, group.currencySymbol)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* THE 3 CORE PROMPT METRICS: HAVE TO PAY | PAID | LEFT ON SHARE */}
                <div className="grid grid-cols-3 gap-2 mt-5 p-3 rounded-lg bg-neutral-950/60 border border-neutral-800/60">
                  {/* Metric 1: Have to Pay */}
                  <div>
                    <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-medium">
                      Have to Pay
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-neutral-200 font-mono tabular-nums mt-0.5 block">
                      {formatCurrency(b.haveToPay, group.currencySymbol)}
                    </span>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">
                      Total bill share
                    </span>
                  </div>

                  {/* Metric 2: Paid */}
                  <div>
                    <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-medium">
                      Total Paid
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-neutral-200 font-mono tabular-nums mt-0.5 block">
                      {formatCurrency(b.totalPaid, group.currencySymbol)}
                    </span>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">
                      Upfront + settlements
                    </span>
                  </div>

                  {/* Metric 3: Amount Left on Share */}
                  <div>
                    <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-medium">
                      Left on Share
                    </span>
                    <span
                      className={`text-sm sm:text-base font-bold font-mono tabular-nums mt-0.5 block ${
                        b.amountLeftOnShare > 0 ? 'text-amber-400' : 'text-neutral-400'
                      }`}
                    >
                      {formatCurrency(b.amountLeftOnShare, group.currencySymbol)}
                    </span>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">
                      {b.amountLeftOnShare > 0 ? 'Remaining to pay' : 'Zero debt'}
                    </span>
                  </div>
                </div>

                {/* Progress bar of share completion */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Share settlement progress</span>
                    <span className="font-mono tabular-nums">
                      {b.haveToPay === 0 ? '100%' : `${Math.round((b.totalPaid / (b.haveToPay || 1)) * 100)}%`}
                    </span>
                  </div>
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        b.status === 'GETS_BACK'
                          ? 'bg-emerald-400'
                          : b.status === 'SETTLED'
                          ? 'bg-neutral-500'
                          : 'bg-amber-400'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(5, (b.totalPaid / (b.haveToPay || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-neutral-800/80">
                <button
                  onClick={() => onSelectFriendLedger(b.friendId)}
                  className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white font-medium transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  <span>View Member Ledger</span>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyReminderMessage(b)}
                    title="Copy polite breakdown message for WhatsApp / SMS"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors"
                  >
                    {copiedId === b.friendId ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-neutral-400" />
                        <span>Copy Summary</span>
                      </>
                    )}
                  </button>

                  {b.status === 'OWES' && (
                    <button
                      onClick={() => onSelectFriendLedger(b.friendId)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors"
                    >
                      Settle Debt
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBalances.length === 0 && (
        <div className="text-center py-12 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
          <p className="text-neutral-400 text-sm">No friends match your search query.</p>
        </div>
      )}
    </div>
  );
};
