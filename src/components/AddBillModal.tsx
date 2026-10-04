import React, { useState, useEffect } from 'react';
import { Group, Bill, Category, SplitType, BillItem } from '../types';
import { autoCategorize, CATEGORIES } from '../utils/categorizer';
import { calculateBillParticipants, formatCurrency } from '../utils/calculations';
import { X, Plus, Trash2, Check, AlertCircle, Sparkles } from 'lucide-react';

interface AddBillModalProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
  onSaveBill: (billData: Omit<Bill, 'id' | 'createdAt'>) => void;
  initialBill?: Bill | null;
}

export const AddBillModal: React.FC<AddBillModalProps> = ({
  group,
  isOpen,
  onClose,
  onSaveBill,
  initialBill,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Dining');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payerType, setPayerType] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [singlePayerId, setSinglePayerId] = useState(group.friends[0]?.id || '');
  const [multiPayerAmounts, setMultiPayerAmounts] = useState<Record<string, string>>({});
  
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(
    group.friends.map((f) => f.id)
  );
  const [exactShares, setExactShares] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [sharesWeights, setSharesWeights] = useState<Record<string, string>>({});
  
  // Itemized split fields
  const [items, setItems] = useState<Array<{ id: string; name: string; price: string; assignedIds: string[] }>>([]);
  const [tax, setTax] = useState('');
  const [tip, setTip] = useState('');
  const [notes, setNotes] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize or reset form
  useEffect(() => {
    if (initialBill) {
      setTitle(initialBill.title);
      setAmount(initialBill.totalAmount.toString());
      setCategory(initialBill.category);
      setDate(initialBill.date);
      setNotes(initialBill.notes || '');
      setSplitType(initialBill.splitType);

      if (initialBill.payers.length === 1) {
        setPayerType('SINGLE');
        setSinglePayerId(initialBill.payers[0].friendId);
      } else {
        setPayerType('MULTI');
        const m: Record<string, string> = {};
        initialBill.payers.forEach((p) => (m[p.friendId] = p.amount.toString()));
        setMultiPayerAmounts(m);
      }

      setSelectedParticipantIds(initialBill.participants.map((p) => p.friendId));

      if (initialBill.splitType === 'EXACT') {
        const exact: Record<string, string> = {};
        initialBill.participants.forEach((p) => (exact[p.friendId] = p.shareAmount.toString()));
        setExactShares(exact);
      } else if (initialBill.splitType === 'PERCENTAGE') {
        const pcts: Record<string, string> = {};
        initialBill.participants.forEach((p) => (pcts[p.friendId] = (p.percentage || 0).toString()));
        setPercentages(pcts);
      } else if (initialBill.splitType === 'SHARES') {
        const sh: Record<string, string> = {};
        initialBill.participants.forEach((p) => (sh[p.friendId] = (p.shares || 1).toString()));
        setSharesWeights(sh);
      } else if (initialBill.splitType === 'ITEMIZED' && initialBill.items) {
        setItems(
          initialBill.items.map((it) => ({
            id: it.id,
            name: it.name,
            price: it.price.toString(),
            assignedIds: it.assignedFriendIds,
          }))
        );
        setTax(initialBill.tax ? initialBill.tax.toString() : '');
        setTip(initialBill.tip ? initialBill.tip.toString() : '');
      }
    } else {
      // Default clean form
      setTitle('');
      setAmount('');
      setCategory('Dining');
      setDate(new Date().toISOString().split('T')[0]);
      setPayerType('SINGLE');
      setSinglePayerId(group.friends[0]?.id || '');
      setMultiPayerAmounts({});
      setSplitType('EQUAL');
      setSelectedParticipantIds(group.friends.map((f) => f.id));
      setExactShares({});
      setPercentages({});
      setSharesWeights({});
      setItems([]);
      setTax('');
      setTip('');
      setNotes('');
      setValidationError(null);
    }
  }, [initialBill, group.friends, isOpen]);

  if (!isOpen) return null;

  // Auto-categorize as title changes
  const handleTitleChange = (val: string) => {
    setTitle(val);
    const predicted = autoCategorize(val);
    if (predicted !== 'Other') {
      setCategory(predicted);
    }
  };

  const toggleParticipant = (friendId: string) => {
    if (selectedParticipantIds.includes(friendId)) {
      if (selectedParticipantIds.length > 1) {
        setSelectedParticipantIds(selectedParticipantIds.filter((id) => id !== friendId));
      }
    } else {
      setSelectedParticipantIds([...selectedParticipantIds, friendId]);
    }
  };

  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        id: `item_${Date.now()}`,
        name: `Item ${items.length + 1}`,
        price: '',
        assignedIds: selectedParticipantIds,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const numAmount = parseFloat(amount) || 0;

  // Real-time split preview calculation
  let calculatedShares: { friendId: string; shareAmount: number }[] = [];
  try {
    const exactNumeric: Record<string, number> = {};
    Object.entries(exactShares).forEach(([k, v]) => (exactNumeric[k] = parseFloat(v) || 0));

    const pctsNumeric: Record<string, number> = {};
    Object.entries(percentages).forEach(([k, v]) => (pctsNumeric[k] = parseFloat(v) || 0));

    const sharesNumeric: Record<string, number> = {};
    Object.entries(sharesWeights).forEach(([k, v]) => (sharesNumeric[k] = parseFloat(v) || 1));

    const convertedItems: BillItem[] = items.map((it) => ({
      id: it.id,
      name: it.name,
      price: parseFloat(it.price) || 0,
      assignedFriendIds: it.assignedIds,
    }));

    calculatedShares = calculateBillParticipants(numAmount, splitType, selectedParticipantIds, {
      exactValues: exactNumeric,
      percentages: pctsNumeric,
      shares: sharesNumeric,
      items: convertedItems,
      tax: parseFloat(tax) || 0,
      tip: parseFloat(tip) || 0,
    });
  } catch (err) {
    console.error(err);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title.trim()) {
      setValidationError('Please enter a bill title.');
      return;
    }

    if (numAmount <= 0) {
      setValidationError('Please enter a valid bill amount greater than 0.');
      return;
    }

    if (selectedParticipantIds.length === 0) {
      setValidationError('Select at least one participant.');
      return;
    }

    // Build Payers
    let finalPayers: { friendId: string; amount: number }[] = [];
    if (payerType === 'SINGLE') {
      if (!singlePayerId) {
        setValidationError('Please select who paid the bill.');
        return;
      }
      finalPayers = [{ friendId: singlePayerId, amount: numAmount }];
    } else {
      let payerSum = 0;
      finalPayers = Object.entries(multiPayerAmounts)
        .map(([friendId, amtStr]) => {
          const amt = parseFloat(amtStr) || 0;
          payerSum += amt;
          return { friendId, amount: amt };
        })
        .filter((p) => p.amount > 0);

      if (Math.abs(payerSum - numAmount) > 0.05) {
        setValidationError(
          `The sum of payers (${formatCurrency(payerSum, group.currencySymbol)}) must equal the total bill amount (${formatCurrency(numAmount, group.currencySymbol)}).`
        );
        return;
      }
    }

    // Validation for split types
    if (splitType === 'EXACT') {
      const sumExact = selectedParticipantIds.reduce(
        (sum, id) => sum + (parseFloat(exactShares[id]) || 0),
        0
      );
      if (Math.abs(sumExact - numAmount) > 0.05) {
        setValidationError(
          `Exact shares sum (${formatCurrency(sumExact, group.currencySymbol)}) must match total bill (${formatCurrency(numAmount, group.currencySymbol)}). Difference: ${formatCurrency(numAmount - sumExact, group.currencySymbol)}`
        );
        return;
      }
    } else if (splitType === 'PERCENTAGE') {
      const sumPct = selectedParticipantIds.reduce(
        (sum, id) => sum + (parseFloat(percentages[id]) || 0),
        0
      );
      if (Math.abs(sumPct - 100) > 0.1) {
        setValidationError(`Percentages must sum to 100%. Current total: ${sumPct.toFixed(1)}%`);
        return;
      }
    }

    const convertedItems: BillItem[] =
      splitType === 'ITEMIZED'
        ? items.map((it) => ({
            id: it.id,
            name: it.name || 'Item',
            price: parseFloat(it.price) || 0,
            assignedFriendIds: it.assignedIds,
          }))
        : [];

    onSaveBill({
      groupId: group.id,
      title: title.trim(),
      category,
      totalAmount: numAmount,
      date,
      payers: finalPayers,
      splitType,
      participants: calculatedShares,
      items: convertedItems.length > 0 ? convertedItems : undefined,
      tax: parseFloat(tax) || undefined,
      tip: parseFloat(tip) || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">
              {initialBill ? 'Edit Bill' : 'Add New Bill'}
            </h3>
            <p className="text-xs text-neutral-400">
              Record expense and configure friends' shares
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {validationError && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Title and Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Bill Title / Description
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Dinner at Olive Garden, Groceries, Uber ride"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Total Amount ({group.currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white font-mono tabular-nums rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Expense Category (Auto-predicted)
              </label>
              <select
                aria-label="Expense Category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-600"
              >
                {Object.keys(CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>

          {/* Who Paid Upfront */}
          <div className="p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-200">
                Who Paid for This Bill?
              </label>
              <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-md border border-neutral-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPayerType('SINGLE')}
                  className={`px-2 py-0.5 rounded ${
                    payerType === 'SINGLE'
                      ? 'bg-neutral-800 text-white font-medium'
                      : 'text-neutral-400'
                  }`}
                >
                  Single Payer
                </button>
                <button
                  type="button"
                  onClick={() => setPayerType('MULTI')}
                  className={`px-2 py-0.5 rounded ${
                    payerType === 'MULTI'
                      ? 'bg-neutral-800 text-white font-medium'
                      : 'text-neutral-400'
                  }`}
                >
                  Multiple People Paid
                </button>
              </div>
            </div>

            {payerType === 'SINGLE' ? (
              <select
                aria-label="Single Payer"
                value={singlePayerId}
                onChange={(e) => setSinglePayerId(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-600"
              >
                {group.friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} paid full {formatCurrency(numAmount, group.currencySymbol)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-neutral-400 block">
                  Enter how much each person contributed upfront:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.friends.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2 rounded bg-neutral-900 border border-neutral-800/80 text-xs"
                    >
                      <span className="text-neutral-300 truncate max-w-[120px]">{f.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-neutral-500 font-mono">{group.currencySymbol}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={multiPayerAmounts[f.id] || ''}
                          onChange={(e) =>
                            setMultiPayerAmounts({
                              ...multiPayerAmounts,
                              [f.id]: e.target.value,
                            })
                          }
                          className="w-20 bg-neutral-950 border border-neutral-800 text-right px-1.5 py-1 rounded text-xs text-white font-mono tabular-nums"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Split Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-2">
              Split Option
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
              {(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES', 'ITEMIZED'] as SplitType[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSplitType(mode)}
                  className={`py-1.5 px-2 rounded-md font-medium transition-colors text-center ${
                    splitType === mode
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {mode === 'EQUAL' && 'Split Equally'}
                  {mode === 'EXACT' && 'Exact Amounts'}
                  {mode === 'PERCENTAGE' && 'By Percentage'}
                  {mode === 'SHARES' && 'By Shares'}
                  {mode === 'ITEMIZED' && 'Itemized'}
                </button>
              ))}
            </div>
          </div>

          {/* Participants Selection & Custom Split Fields */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300">
                Split Among Friends ({selectedParticipantIds.length}/{group.friends.length})
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedParticipantIds(group.friends.map((f) => f.id))}
                  className="text-emerald-400 hover:underline"
                >
                  Select All
                </button>
              </div>
            </div>

            {/* Split Type Specific Input Controls */}
            {splitType === 'EQUAL' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {group.friends.map((f) => {
                  const isChecked = selectedParticipantIds.includes(f.id);
                  const share = calculatedShares.find((p) => p.friendId === f.id)?.shareAmount || 0;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleParticipant(f.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        isChecked
                          ? 'bg-neutral-800/80 border-neutral-600 text-white'
                          : 'bg-neutral-950/40 border-neutral-800 text-neutral-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs truncate">{f.name}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <span className="text-[11px] font-mono tabular-nums mt-1 text-neutral-300">
                        {isChecked ? formatCurrency(share, group.currencySymbol) : 'Excluded'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {splitType === 'EXACT' && (
              <div className="space-y-1.5">
                {group.friends.map((f) => {
                  const isChecked = selectedParticipantIds.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleParticipant(f.id)}
                          className="rounded border-neutral-700 bg-neutral-900"
                        />
                        <span className="text-neutral-200">{f.name}</span>
                      </div>
                      {isChecked && (
                        <div className="flex items-center gap-1">
                          <span className="text-neutral-500 font-mono">{group.currencySymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={exactShares[f.id] || ''}
                            onChange={(e) =>
                              setExactShares({ ...exactShares, [f.id]: e.target.value })
                            }
                            className="w-24 bg-neutral-900 border border-neutral-800 text-right px-2 py-1 rounded text-xs text-white font-mono tabular-nums"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {splitType === 'PERCENTAGE' && (
              <div className="space-y-1.5">
                {group.friends.map((f) => {
                  const isChecked = selectedParticipantIds.includes(f.id);
                  const share = calculatedShares.find((p) => p.friendId === f.id)?.shareAmount || 0;
                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleParticipant(f.id)}
                          className="rounded border-neutral-700 bg-neutral-900"
                        />
                        <span className="text-neutral-200">{f.name}</span>
                      </div>
                      {isChecked && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              placeholder="0"
                              value={percentages[f.id] || ''}
                              onChange={(e) =>
                                setPercentages({ ...percentages, [f.id]: e.target.value })
                              }
                              className="w-16 bg-neutral-900 border border-neutral-800 text-right px-2 py-1 rounded text-xs text-white font-mono tabular-nums"
                            />
                            <span className="text-neutral-400">%</span>
                          </div>
                          <span className="text-neutral-400 font-mono tabular-nums text-[11px] w-20 text-right">
                            {formatCurrency(share, group.currencySymbol)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {splitType === 'SHARES' && (
              <div className="space-y-1.5">
                {group.friends.map((f) => {
                  const isChecked = selectedParticipantIds.includes(f.id);
                  const share = calculatedShares.find((p) => p.friendId === f.id)?.shareAmount || 0;
                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleParticipant(f.id)}
                          className="rounded border-neutral-700 bg-neutral-900"
                        />
                        <span className="text-neutral-200">{f.name}</span>
                      </div>
                      {isChecked && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              placeholder="1"
                              value={sharesWeights[f.id] || '1'}
                              onChange={(e) =>
                                setSharesWeights({ ...sharesWeights, [f.id]: e.target.value })
                              }
                              className="w-16 bg-neutral-900 border border-neutral-800 text-right px-2 py-1 rounded text-xs text-white font-mono tabular-nums"
                            />
                            <span className="text-neutral-400">shares</span>
                          </div>
                          <span className="text-neutral-400 font-mono tabular-nums text-[11px] w-20 text-right">
                            {formatCurrency(share, group.currencySymbol)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {splitType === 'ITEMIZED' && (
              <div className="space-y-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300">Bill Items</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Item name (e.g. Steak, Pasta)"
                          value={item.name}
                          onChange={(e) => {
                            const copy = [...items];
                            copy[idx].name = e.target.value;
                            setItems(copy);
                          }}
                          className="flex-1 bg-neutral-950 border border-neutral-800 px-2 py-1 rounded text-white text-xs"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-neutral-500 font-mono">{group.currencySymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.price}
                            onChange={(e) => {
                              const copy = [...items];
                              copy[idx].price = e.target.value;
                              setItems(copy);
                            }}
                            className="w-20 bg-neutral-950 border border-neutral-800 px-2 py-1 rounded text-right text-white font-mono tabular-nums text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1 text-neutral-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Who ate/used this item */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-neutral-500 mr-1">Assigned to:</span>
                        {group.friends.map((f) => {
                          const isAssigned = item.assignedIds.includes(f.id);
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                const copy = [...items];
                                const currentAssigned = copy[idx].assignedIds;
                                if (currentAssigned.includes(f.id)) {
                                  copy[idx].assignedIds = currentAssigned.filter((id) => id !== f.id);
                                } else {
                                  copy[idx].assignedIds = [...currentAssigned, f.id];
                                }
                                setItems(copy);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                isAssigned
                                  ? 'bg-neutral-800 border-neutral-600 text-white'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-500'
                              }`}
                            >
                              {f.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="w-full py-4 border border-dashed border-neutral-800 rounded-lg text-xs text-neutral-500 hover:text-neutral-300 text-center"
                    >
                      + Click to add your first item line
                    </button>
                  )}
                </div>

                {/* Tax & Tip for Itemized */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Tax (Divided proportionally)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white px-2 py-1 rounded font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Tip (Divided proportionally)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={tip}
                      onChange={(e) => setTip(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white px-2 py-1 rounded font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Receipt photo #42, reimbursed by company"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-lg px-3 py-2 focus:outline-none focus:border-neutral-600"
            />
          </div>

          {/* Summary Preview */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium block mb-1.5">
              Live Split Share Summary:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {calculatedShares.map((cs) => {
                const friend = group.friends.find((f) => f.id === cs.friendId);
                return (
                  <div key={cs.friendId} className="flex justify-between py-1 border-b border-neutral-900">
                    <span className="text-neutral-400 truncate max-w-[100px]">
                      {friend?.name || 'Friend'}
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-neutral-200">
                      {formatCurrency(cs.shareAmount, group.currencySymbol)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

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
              {initialBill ? 'Update Bill' : 'Save Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
