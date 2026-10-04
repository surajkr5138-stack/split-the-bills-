import React, { useState } from 'react';
import { Group, Bill, Friend } from '../types';
import { parseReceiptOrExpenseText, ParsedExpenseResult } from '../utils/smartParser';
import { formatCurrency } from '../utils/calculations';
import { CATEGORIES } from '../utils/categorizer';
import { Sparkles, X, Check, ArrowRight, FileText, Zap } from 'lucide-react';

interface SmartReceiptModalProps {
  group: Group;
  isOpen: boolean;
  onClose: () => void;
  onImportBill: (billData: Omit<Bill, 'id' | 'createdAt'>) => void;
}

const SAMPLE_TEMPLATES = [
  {
    label: 'Restaurant Dinner with Items',
    text: `Dinner at Timber Smokehouse
Brisket Platter $38.00
Craft Burger $22.50
Salmon Fillet $32.00
Shared Appetizer $16.50
Tax: $9.50
Tip: $18.00
Total: $136.50
Paid by Sarah Chen`,
  },
  {
    label: 'Costco Grocery Run',
    text: `Costco Wholesale Groceries
Total: $248.90
Paid by Alex Rivera
Groceries and drinks for all friends`,
  },
  {
    label: 'Road Trip Gas & Highway Toll',
    text: `Chevron Highway Fuel & Bay Tolls
Amount: $78.40
Paid by Priya Sharma
Split equally`,
  },
];

export const SmartReceiptModal: React.FC<SmartReceiptModalProps> = ({
  group,
  isOpen,
  onClose,
  onImportBill,
}) => {
  const [inputText, setInputText] = useState(SAMPLE_TEMPLATES[0].text);
  const [parsed, setParsed] = useState<ParsedExpenseResult>(() =>
    parseReceiptOrExpenseText(SAMPLE_TEMPLATES[0].text, group.friends)
  );

  if (!isOpen) return null;

  const handleTextChange = (text: string) => {
    setInputText(text);
    const result = parseReceiptOrExpenseText(text, group.friends);
    setParsed(result);
  };

  const handleApplyTemplate = (sampleText: string) => {
    setInputText(sampleText);
    const result = parseReceiptOrExpenseText(sampleText, group.friends);
    setParsed(result);
  };

  const handleConfirmImport = () => {
    if (parsed.totalAmount <= 0) return;

    const payerId = parsed.payerFriendId || group.friends[0]?.id || '';
    const participants =
      parsed.participantFriendIds.length > 0
        ? parsed.participantFriendIds
        : group.friends.map((f) => f.id);

    // If itemized items exist, use ITEMIZED split
    if (parsed.items.length > 0) {
      const subtotalMap: Record<string, number> = {};
      participants.forEach((id) => (subtotalMap[id] = 0));

      let itemsSum = 0;
      for (const item of parsed.items) {
        itemsSum += item.price;
        const assigned = item.assignedFriendIds.length > 0 ? item.assignedFriendIds : participants;
        const perPerson = item.price / assigned.length;
        for (const id of assigned) {
          if (subtotalMap[id] !== undefined) subtotalMap[id] += perPerson;
        }
      }

      const extraTotal = (parsed.tax || 0) + (parsed.tip || 0);
      const participantShares = participants.map((id) => {
        const sub = subtotalMap[id] || 0;
        const ratio = itemsSum > 0 ? sub / itemsSum : 1 / participants.length;
        return {
          friendId: id,
          shareAmount: Math.round((sub + extraTotal * ratio) * 100) / 100,
        };
      });

      onImportBill({
        groupId: group.id,
        title: parsed.title,
        category: parsed.category,
        totalAmount: parsed.totalAmount,
        date: new Date().toISOString().split('T')[0],
        payers: [{ friendId: payerId, amount: parsed.totalAmount }],
        splitType: 'ITEMIZED',
        participants: participantShares,
        items: parsed.items,
        tax: parsed.tax,
        tip: parsed.tip,
        notes: `Imported via Smart Receipt Parser\n${parsed.notes}`,
      });
    } else {
      // Split equally among participants
      const count = participants.length;
      const baseShare = Math.floor((parsed.totalAmount / count) * 100) / 100;
      let dist = 0;
      const participantShares = participants.map((id, index) => {
        let sh = baseShare;
        if (index === count - 1) {
          sh = Math.round((parsed.totalAmount - dist) * 100) / 100;
        } else {
          dist = Math.round((dist + sh) * 100) / 100;
        }
        return { friendId: id, shareAmount: sh };
      });

      onImportBill({
        groupId: group.id,
        title: parsed.title,
        category: parsed.category,
        totalAmount: parsed.totalAmount,
        date: new Date().toISOString().split('T')[0],
        payers: [{ friendId: payerId, amount: parsed.totalAmount }],
        splitType: 'EQUAL',
        participants: participantShares,
        notes: `Imported via Smart Receipt Parser`,
      });
    }

    onClose();
  };

  const detectedPayer = group.friends.find((f) => f.id === parsed.payerFriendId);
  const catMeta = CATEGORIES[parsed.category] || CATEGORIES.Other;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Automated Smart Receipt & Text Ingestion
              </h3>
              <p className="text-xs text-neutral-400">
                Paste receipt text, SMS summary, or items list to auto-extract expenses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
          {/* Left: Raw Text Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300">
                Paste Receipt or Expense Note
              </label>
            </div>

            {/* Quick Templates */}
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-500">Quick Test Templates:</span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl.text)}
                    className="text-[11px] px-2 py-1 rounded bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition-colors"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={9}
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Paste raw receipt text or expense message here..."
              className="w-full bg-neutral-950 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-600 rounded-lg p-3 font-mono focus:outline-none focus:border-neutral-600 leading-relaxed resize-none"
            />
          </div>

          {/* Right: Automated Extracted Data Preview */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Automated Extraction Result</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  {parsed.confidence}% confidence
                </span>
              </div>

              <div className="space-y-3 mt-3 text-xs">
                <div>
                  <span className="text-[11px] text-neutral-500 block">Extracted Title</span>
                  <span className="text-sm font-semibold text-white block mt-0.5">
                    {parsed.title}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-neutral-500 block">Detected Amount</span>
                    <span className="text-lg font-bold text-white font-mono tabular-nums block mt-0.5">
                      {formatCurrency(parsed.totalAmount, group.currencySymbol)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-neutral-500 block">Auto-Categorized</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: catMeta.color }}
                      />
                      <span className="font-medium text-neutral-200">{catMeta.label}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-neutral-500 block">Identified Payer</span>
                    <span className="font-semibold text-neutral-200 block mt-0.5">
                      {detectedPayer ? detectedPayer.name : 'Unknown (Defaults to first)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-neutral-500 block">Participants</span>
                    <span className="text-neutral-300 block mt-0.5">
                      {parsed.participantFriendIds.length} friends included
                    </span>
                  </div>
                </div>

                {parsed.items.length > 0 && (
                  <div className="pt-2 border-t border-neutral-800/80">
                    <span className="text-[11px] text-neutral-500 block mb-1">
                      Parsed Items ({parsed.items.length}):
                    </span>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                      {parsed.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-[11px] py-0.5 text-neutral-300 border-b border-neutral-900"
                        >
                          <span className="truncate max-w-[160px]">{item.name}</span>
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

            <div className="pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parsed.totalAmount <= 0}
                className="w-full py-2.5 px-4 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Save & Split This Expense</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
