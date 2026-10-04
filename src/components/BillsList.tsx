import React, { useState } from 'react';
import { Group, Bill, Category } from '../types';
import { formatCurrency } from '../utils/calculations';
import { CATEGORIES } from '../utils/categorizer';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  Receipt, 
  Users, 
  Calendar, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  Tag
} from 'lucide-react';

interface BillsListProps {
  group: Group;
  onOpenAddBill: () => void;
  onEditBill: (bill: Bill) => void;
  onDeleteBill: (billId: string) => void;
}

export const BillsList: React.FC<BillsListProps> = ({
  group,
  onOpenAddBill,
  onEditBill,
  onDeleteBill,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPayer, setSelectedPayer] = useState<string>('ALL');
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  const friendMap = new Map(group.friends.map((f) => [f.id, f]));

  const filteredBills = group.bills.filter((bill) => {
    const matchesSearch =
      bill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'ALL' || bill.category === selectedCategory;
    const matchesPayer =
      selectedPayer === 'ALL' || bill.payers.some((p) => p.friendId === selectedPayer);

    return matchesSearch && matchesCategory && matchesPayer;
  });

  const toggleExpand = (billId: string) => {
    setExpandedBillId(expandedBillId === billId ? null : billId);
  };

  return (
    <div className="space-y-6">
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Bills & Expenses
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            All group purchases with automated participant split breakdowns.
          </p>
        </div>

        <button
          onClick={onOpenAddBill}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add New Bill</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by title or note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-neutral-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Filter by category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-neutral-600"
          >
            <option value="ALL">All Categories</option>
            {Object.keys(CATEGORIES).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by payer"
            value={selectedPayer}
            onChange={(e) => setSelectedPayer(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-neutral-600"
          >
            <option value="ALL">All Payers</option>
            {group.friends.map((f) => (
              <option key={f.id} value={f.id}>
                Paid by {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bills Cards List */}
      <div className="space-y-3">
        {filteredBills.map((bill) => {
          const isExpanded = expandedBillId === bill.id;
          const catMeta = CATEGORIES[bill.category] || CATEGORIES.Other;
          const payersText = bill.payers
            .map((p) => {
              const friend = friendMap.get(p.friendId);
              return `${friend ? friend.name : 'Unknown'} (${formatCurrency(p.amount, group.currencySymbol)})`;
            })
            .join(', ');

          return (
            <div
              key={bill.id}
              className="bg-neutral-900/40 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors"
            >
              {/* Main Summary Row */}
              <div
                onClick={() => toggleExpand(bill.id)}
                className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: `${catMeta.color}15`,
                      borderColor: `${catMeta.color}35`,
                      color: catMeta.color,
                    }}
                  >
                    <Receipt className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                      <span>{bill.title}</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-0.5">
                      <span className="text-neutral-300 font-medium">Paid by {payersText}</span>
                      <span aria-hidden="true" className="text-neutral-600">·</span>
                      <span>{bill.date}</span>
                      <span aria-hidden="true" className="text-neutral-600">·</span>
                      <span className="text-neutral-400">{bill.category}</span>
                      <span aria-hidden="true" className="text-neutral-600">·</span>
                      <span className="text-neutral-500">{bill.splitType} split</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-13 sm:pl-0">
                  <div className="text-right">
                    <span className="text-base font-bold font-mono tabular-nums text-white block">
                      {formatCurrency(bill.totalAmount, group.currencySymbol)}
                    </span>
                    <span className="text-[11px] text-neutral-400 block">
                      {bill.participants.length} shares
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditBill(bill);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition-colors"
                      title="Edit Bill"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${bill.title}"?`)) {
                          onDeleteBill(bill.id);
                        }
                      }}
                      className="p-1.5 text-neutral-500 hover:text-red-400 rounded-md hover:bg-neutral-800 transition-colors"
                      title="Delete Bill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-neutral-500 pl-1">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Breakdown Drawer */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-neutral-800/60 bg-neutral-950/40 text-xs">
                  {bill.notes && (
                    <p className="text-neutral-400 mb-3 italic">
                      Note: {bill.notes}
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Participant Shares */}
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium mb-2">
                        How much each friend has to pay:
                      </h4>
                      <div className="space-y-1.5">
                        {bill.participants.map((p) => {
                          const friend = friendMap.get(p.friendId);
                          return (
                            <div
                              key={p.friendId}
                              className="flex items-center justify-between py-1 px-2 rounded bg-neutral-900/60"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: friend?.color || '#3B82F6' }}
                                />
                                <span className="text-neutral-200 font-medium">
                                  {friend ? friend.name : 'Unknown'}
                                </span>
                                {p.percentage !== undefined && (
                                  <span className="text-[10px] text-neutral-500">
                                    ({p.percentage}%)
                                  </span>
                                )}
                                {p.shares !== undefined && (
                                  <span className="text-[10px] text-neutral-500">
                                    ({p.shares} shares)
                                  </span>
                                )}
                              </div>
                              <span className="font-mono tabular-nums text-neutral-100 font-semibold">
                                {formatCurrency(p.shareAmount, group.currencySymbol)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bill Metadata / Items */}
                    <div>
                      <h4 className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium mb-2">
                        Payment & Itemization Details:
                      </h4>
                      <div className="space-y-1 bg-neutral-900/40 p-2.5 rounded-lg border border-neutral-800/60">
                        <div className="flex justify-between text-neutral-400">
                          <span>Split Engine:</span>
                          <span className="text-neutral-200">{bill.splitType}</span>
                        </div>
                        {bill.tax !== undefined && bill.tax > 0 && (
                          <div className="flex justify-between text-neutral-400">
                            <span>Tax:</span>
                            <span className="text-neutral-200 font-mono tabular-nums">
                              {formatCurrency(bill.tax, group.currencySymbol)}
                            </span>
                          </div>
                        )}
                        {bill.tip !== undefined && bill.tip > 0 && (
                          <div className="flex justify-between text-neutral-400">
                            <span>Tip:</span>
                            <span className="text-neutral-200 font-mono tabular-nums">
                              {formatCurrency(bill.tip, group.currencySymbol)}
                            </span>
                          </div>
                        )}
                        {bill.items && bill.items.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-neutral-800">
                            <span className="text-[11px] text-neutral-400 block mb-1">
                              Itemized Breakdown:
                            </span>
                            <div className="space-y-1">
                              {bill.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-[11px]">
                                  <span className="text-neutral-300">{item.name}</span>
                                  <span className="font-mono tabular-nums text-neutral-200">
                                    {formatCurrency(item.price, group.currencySymbol)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredBills.length === 0 && (
          <div className="text-center py-16 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
            <Receipt className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white">No expenses found</h3>
            <p className="text-xs text-neutral-400 mt-1">
              Add your first bill to start tracking and splitting automatically.
            </p>
            <button
              onClick={onOpenAddBill}
              className="mt-4 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors inline-block"
            >
              + Add Bill
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
