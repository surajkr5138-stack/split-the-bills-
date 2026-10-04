import React from 'react';
import { Group, DebtTransfer } from '../types';
import { calculateFriendBalances, formatCurrency, simplifyDebts } from '../utils/calculations';
import { CATEGORIES } from '../utils/categorizer';
import { 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  ArrowLeftRight, 
  Zap, 
  PieChart, 
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';

interface GroupOverviewProps {
  group: Group;
  onOpenAddBill: () => void;
  onOpenSmartReceipt: () => void;
  onOpenSettleUp: () => void;
  onOpenRecurring: () => void;
  onQuickSettle: (fromId: string, toId: string, amount: number) => void;
  onNavigateTab: (tab: 'friends' | 'bills' | 'recurring' | 'analytics') => void;
}

export const GroupOverview: React.FC<GroupOverviewProps> = ({
  group,
  onOpenAddBill,
  onOpenSmartReceipt,
  onOpenSettleUp,
  onOpenRecurring,
  onQuickSettle,
  onNavigateTab,
}) => {
  const balances = calculateFriendBalances(group);
  const simplifiedTransfers: DebtTransfer[] = simplifyDebts(group);

  const totalExpense = group.bills.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalSettled = group.settlements.reduce((sum, s) => sum + s.amount, 0);

  // Calculate category distribution
  const categoryTotals = group.bills.reduce((acc, bill) => {
    acc[bill.category] = (acc[bill.category] || 0) + bill.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Hero Welcome / Group Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span>Active Ledger</span>
            <span aria-hidden="true">·</span>
            <span>{group.friends.length} Friends Participating</span>
            <span aria-hidden="true">·</span>
            <span>{group.bills.length} Bills Tracked</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            {group.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSmartReceipt}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/40 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Receipt Parser</span>
          </button>
          <button
            onClick={onOpenAddBill}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors"
          >
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* Key Financial Health Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4">
          <span className="text-xs text-neutral-400 block font-medium">Total Group Spend</span>
          <span className="text-2xl font-bold text-white font-mono tabular-nums mt-1 block">
            {formatCurrency(totalExpense, group.currencySymbol)}
          </span>
          <span className="text-xs text-neutral-500 mt-1 block">
            Across {group.bills.length} recorded items
          </span>
        </div>

        <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4">
          <span className="text-xs text-neutral-400 block font-medium">Simplified Transfers Left</span>
          <span className="text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1 block">
            {simplifiedTransfers.length} {simplifiedTransfers.length === 1 ? 'payment' : 'payments'}
          </span>
          <span className="text-xs text-neutral-500 mt-1 block">
            Automated debt minimization active
          </span>
        </div>

        <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4">
          <span className="text-xs text-neutral-400 block font-medium">Total Amount Settled</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1 block">
            {formatCurrency(totalSettled, group.currencySymbol)}
          </span>
          <span className="text-xs text-neutral-500 mt-1 block">
            {group.settlements.length} payments recorded
          </span>
        </div>

        <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4">
          <span className="text-xs text-neutral-400 block font-medium">Recurring Bills</span>
          <span className="text-2xl font-bold text-neutral-200 font-mono tabular-nums mt-1 block">
            {group.recurringExpenses.length} automated
          </span>
          <button
            onClick={onOpenRecurring}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium mt-1 flex items-center gap-1"
          >
            <span>Manage schedules</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* AUTOMATED DEBT SIMPLIFICATION / SETTLE-UP ENGINE */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800/80">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-tight">
                Automated Debt Minimization (Smart Settle-Up)
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Graph algorithm resolves cross-debts into the fewest direct transfers.
            </p>
          </div>

          <button
            onClick={onOpenSettleUp}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-neutral-400" />
            <span>Record Custom Payment</span>
          </button>
        </div>

        {simplifiedTransfers.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-90" />
            <h4 className="text-sm font-semibold text-white">All Balances Settled</h4>
            <p className="text-xs text-neutral-400 mt-1">
              Nobody in {group.name} owes any money right now.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/60 mt-2">
            {simplifiedTransfers.map((transfer, idx) => (
              <div
                key={`${transfer.fromId}-${transfer.toId}-${idx}`}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-900/30 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-neutral-800 text-neutral-300 font-mono text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-amber-300">{transfer.fromName}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="font-semibold text-emerald-300">{transfer.toName}</span>
                    </div>
                    <span className="text-xs text-neutral-400">
                      Resolves remaining share of group expenses
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className="text-base font-bold font-mono tabular-nums text-white">
                    {formatCurrency(transfer.amount, group.currencySymbol)}
                  </span>
                  <button
                    onClick={() => onQuickSettle(transfer.fromId, transfer.toId, transfer.amount)}
                    className="px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors whitespace-nowrap shadow-sm"
                  >
                    Mark as Settled
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dual Section: Quick Friends Share Summary & Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Friends Share Ledger Preview */}
        <div className="lg:col-span-2 bg-neutral-900/40 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Friends Share Breakdown
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Have to pay vs. paid vs. remaining on share
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('friends')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <span>View Full Ledger</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 font-medium">
                  <th className="pb-2.5 font-normal">Friend</th>
                  <th className="pb-2.5 font-normal text-right">Have to Pay</th>
                  <th className="pb-2.5 font-normal text-right">Total Paid</th>
                  <th className="pb-2.5 font-normal text-right">Left on Share</th>
                  <th className="pb-2.5 font-normal text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/40">
                {balances.map((b) => (
                  <tr key={b.friendId} className="hover:bg-neutral-900/30">
                    <td className="py-2.5 font-medium text-white flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: b.color || '#3B82F6' }}
                      />
                      <span>{b.name}</span>
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-neutral-300">
                      {formatCurrency(b.haveToPay, group.currencySymbol)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-neutral-300">
                      {formatCurrency(b.totalPaid, group.currencySymbol)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold">
                      <span className={b.amountLeftOnShare > 0 ? 'text-amber-400' : 'text-neutral-400'}>
                        {formatCurrency(b.amountLeftOnShare, group.currencySymbol)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      {b.status === 'OWES' && (
                        <span className="text-amber-400 font-medium text-[11px]">
                          Owes {formatCurrency(b.amountLeftOnShare, group.currencySymbol)}
                        </span>
                      )}
                      {b.status === 'GETS_BACK' && (
                        <span className="text-emerald-400 font-medium text-[11px]">
                          Gets back {formatCurrency(b.netBalance, group.currencySymbol)}
                        </span>
                      )}
                      {b.status === 'SETTLED' && (
                        <span className="text-neutral-400 text-[11px]">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Top Expense Categories & Automated Tagging */}
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Spending by Category
              </h3>
              <button
                onClick={() => onNavigateTab('analytics')}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Details
              </button>
            </div>

            <div className="space-y-3.5">
              {sortedCategories.map(([categoryKey, amount]) => {
                const meta = CATEGORIES[categoryKey as keyof typeof CATEGORIES] || CATEGORIES.Other;
                const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;

                return (
                  <div key={categoryKey} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-sm"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.label}
                      </span>
                      <span className="font-mono tabular-nums text-neutral-200">
                        {formatCurrency(amount, group.currencySymbol)}{' '}
                        <span className="text-neutral-500">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {sortedCategories.length === 0 && (
                <p className="text-xs text-neutral-500 py-4 text-center">
                  No expense data to analyze yet.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-neutral-800/80">
            <button
              onClick={onOpenSmartReceipt}
              className="w-full py-2 px-3 text-xs font-medium text-emerald-400 bg-emerald-950/30 hover:bg-emerald-900/30 border border-emerald-800/40 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Parse Unstructured Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
