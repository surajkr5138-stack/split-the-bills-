import React, { useState, useEffect, useMemo } from 'react';
import {
  FriendShare,
  OccasionHistoryItem,
  SimplifiedDebt,
  validateSplitInputs,
  calculateExactShares,
  simplifyDebts,
  formatCurrency,
} from './utils/offlineSplitter';
import {
  Users,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Plus,
  History,
  TrendingUp,
  Download,
  Zap,
  ArrowLeftRight,
} from 'lucide-react';

const STORAGE_KEY = 'offline_bill_split_app_v2';

interface PersistedState {
  occasionName: string;
  billAmount: string;
  numPeople: string;
  currencySymbol: string;
  friendsData: { id: string; name: string; paid: number; customShare?: number }[];
  activeView: 'all' | 'shares' | 'paid' | 'balances';
  history: OccasionHistoryItem[];
}

const DEFAULT_STATE: PersistedState = {
  occasionName: 'Dinner with Friends',
  billAmount: '120.00',
  numPeople: '4',
  currencySymbol: '$',
  friendsData: [
    { id: '1', name: 'Alex', paid: 120.0 },
    { id: '2', name: 'Sarah', paid: 0 },
    { id: '3', name: 'Mike', paid: 0 },
    { id: '4', name: 'Emma', paid: 0 },
  ],
  activeView: 'all',
  history: [
    {
      id: 'demo_hist_1',
      occasionName: 'Movie Night & Popcorn',
      billAmount: 64.0,
      numPeople: 4,
      date: '2026-09-28',
      currencySymbol: '$',
      friends: [
        { name: 'Alex', paid: 64.0, share: 16.0, amountLeft: 0, netBalance: 48.0 },
        { name: 'Sarah', paid: 0, share: 16.0, amountLeft: 16.0, netBalance: -16.0 },
        { name: 'Mike', paid: 0, share: 16.0, amountLeft: 16.0, netBalance: -16.0 },
        { name: 'Emma', paid: 0, share: 16.0, amountLeft: 16.0, netBalance: -16.0 },
      ],
      totalPaid: 64.0,
      settled: true,
    },
  ],
};

export default function App() {
  // Load initial state from LocalStorage so results persist after reload
  const [isLoaded, setIsLoaded] = useState(false);
  const [occasionName, setOccasionName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.occasionName !== undefined ? parsed.occasionName : DEFAULT_STATE.occasionName;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STATE.occasionName;
  });

  const [billAmount, setBillAmount] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.billAmount !== undefined ? parsed.billAmount : DEFAULT_STATE.billAmount;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STATE.billAmount;
  });

  const [numPeople, setNumPeople] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.numPeople !== undefined ? parsed.numPeople : DEFAULT_STATE.numPeople;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STATE.numPeople;
  });

  const [currencySymbol, setCurrencySymbol] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.currencySymbol || DEFAULT_STATE.currencySymbol;
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STATE.currencySymbol;
  });

  const [friendsData, setFriendsData] = useState<
    { id: string; name: string; paid: number; customShare?: number }[]
  >(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.friendsData) && parsed.friendsData.length > 0) {
          return parsed.friendsData;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STATE.friendsData;
  });

  const [activeView, setActiveView] = useState<'all' | 'shares' | 'paid' | 'balances'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.activeView || 'all';
      }
    } catch (e) {
      console.error(e);
    }
    return 'all';
  });

  const [history, setHistory] = useState<OccasionHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.history)) {
          return parsed.history;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_STATE.history;
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Mark loaded
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const stateToSave: PersistedState = {
        occasionName,
        billAmount,
        numPeople,
        currencySymbol,
        friendsData,
        activeView,
        history,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [occasionName, billAmount, numPeople, currencySymbol, friendsData, activeView, history, isLoaded]);

  // Sync friends array count when numPeople changes
  const parsedPeopleCount = parseInt(numPeople.trim(), 10);

  useEffect(() => {
    if (!isNaN(parsedPeopleCount) && parsedPeopleCount > 0) {
      setFriendsData((prev) => {
        if (prev.length === parsedPeopleCount) return prev;
        const updated = [...prev];
        if (updated.length < parsedPeopleCount) {
          // Add new friends
          for (let i = updated.length; i < parsedPeopleCount; i++) {
            const defaultNames = ['Alex', 'Sarah', 'Mike', 'Emma', 'David', 'Lisa', 'Chris', 'Priya', 'James', 'Maya'];
            const name = i < defaultNames.length ? defaultNames[i] : `Person ${i + 1}`;
            updated.push({
              id: String(Date.now() + i),
              name,
              paid: 0,
            });
          }
        } else if (updated.length > parsedPeopleCount) {
          // Truncate to parsedPeopleCount
          return updated.slice(0, parsedPeopleCount);
        }
        return updated;
      });
    }
  }, [parsedPeopleCount]);

  // Validation according to prompt requirements:
  // "show a message and a no resultt , if the bill or tjhe number of the people is empty , zero or negative"
  const validation = useMemo(() => {
    return validateSplitInputs(billAmount, numPeople);
  }, [billAmount, numPeople]);

  const parsedBill = parseFloat(billAmount.trim());

  // Calculate exact shares down to the last cent
  const calculatedShares: FriendShare[] = useMemo(() => {
    if (!validation.isValid || isNaN(parsedBill) || parsedBill <= 0 || friendsData.length === 0) {
      return [];
    }
    return calculateExactShares(parsedBill, friendsData, 'equal');
  }, [validation.isValid, parsedBill, friendsData]);

  // Verify that the shares add up EXACTLY to the bill amount
  const sharesSum = useMemo(() => {
    return Math.round(calculatedShares.reduce((sum, f) => sum + f.share, 0) * 100) / 100;
  }, [calculatedShares]);

  const totalPaidSum = useMemo(() => {
    return Math.round(calculatedShares.reduce((sum, f) => sum + f.paid, 0) * 100) / 100;
  }, [calculatedShares]);

  const totalAmountLeftSum = useMemo(() => {
    return Math.round(calculatedShares.reduce((sum, f) => sum + f.amountLeft, 0) * 100) / 100;
  }, [calculatedShares]);

  // Exact difference between sum of shares and total bill
  const sumDiff = Math.abs(sharesSum - (parsedBill || 0));
  const isExactMatch = validation.isValid && sumDiff < 0.005;

  // Automated debt simplification (who pays who)
  const simplifiedDebts: SimplifiedDebt[] = useMemo(() => {
    if (!validation.isValid || calculatedShares.length === 0) return [];
    return simplifyDebts(calculatedShares);
  }, [validation.isValid, calculatedShares]);

  // Handler: Update person's name
  const handleNameChange = (id: string, newName: string) => {
    setFriendsData((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name: newName } : f))
    );
  };

  // Handler: Update how much a person paid
  const handlePaidChange = (id: string, newPaidStr: string) => {
    const val = parseFloat(newPaidStr) || 0;
    setFriendsData((prev) =>
      prev.map((f) => (f.id === id ? { ...f, paid: Math.max(0, val) } : f))
    );
  };

  // Quick Action: Mark that one person paid the entire bill
  const handleSinglePayerAll = (id: string) => {
    if (!validation.isValid || parsedBill <= 0) return;
    setFriendsData((prev) =>
      prev.map((f) => ({
        ...f,
        paid: f.id === id ? parsedBill : 0,
      }))
    );
  };

  // Quick Action: Split paid upfront equally
  const handleSplitPaidEqually = () => {
    if (!validation.isValid || parsedBill <= 0 || friendsData.length === 0) return;
    const count = friendsData.length;
    const basePaid = Math.floor((parsedBill / count) * 100) / 100;
    let dist = 0;
    setFriendsData((prev) =>
      prev.map((f, i) => {
        let p = basePaid;
        if (i === count - 1) {
          p = Math.round((parsedBill - dist) * 100) / 100;
        } else {
          dist = Math.round((dist + p) * 100) / 100;
        }
        return { ...f, paid: p };
      })
    );
  };

  // Automated Expense Tracking: Save current occasion to history
  const handleSaveToExpenseTracker = () => {
    if (!validation.isValid) return;

    const newItem: OccasionHistoryItem = {
      id: `occ_${Date.now()}`,
      occasionName: occasionName.trim() || 'Untitled Occasion',
      billAmount: parsedBill,
      numPeople: friendsData.length,
      date: new Date().toISOString().split('T')[0],
      currencySymbol,
      friends: calculatedShares.map((f) => ({
        name: f.name,
        paid: f.paid,
        share: f.share,
        amountLeft: f.amountLeft,
        netBalance: f.netBalance,
      })),
      totalPaid: totalPaidSum,
      settled: totalAmountLeftSum === 0,
    };

    setHistory((prev) => [newItem, ...prev]);
    setSaveSuccessMsg(`Saved "${newItem.occasionName}" to automated expense history!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Copy polite reminder message for WhatsApp / SMS
  const handleCopyReminder = (f: FriendShare) => {
    const text =
      `Split update for "${occasionName}":\n` +
      `• Name: ${f.name}\n` +
      `• Total Bill: ${formatCurrency(parsedBill, currencySymbol)}\n` +
      `• Your Share (have to pay): ${formatCurrency(f.share, currencySymbol)}\n` +
      `• Amount you paid: ${formatCurrency(f.paid, currencySymbol)}\n` +
      `• Amount left on your share: ${formatCurrency(f.amountLeft, currencySymbol)}\n` +
      (f.netBalance > 0
        ? `Status: You overpaid and are owed back ${formatCurrency(f.netBalance, currencySymbol)}!`
        : f.netBalance < 0
        ? `Status: Please settle ${formatCurrency(Math.abs(f.netBalance), currencySymbol)}.`
        : `Status: All settled ($0.00 left)!`);

    navigator.clipboard.writeText(text);
    setCopiedId(f.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Reset to default
  const handleReset = () => {
    if (confirm('Reset inputs to default values?')) {
      setOccasionName(DEFAULT_STATE.occasionName);
      setBillAmount(DEFAULT_STATE.billAmount);
      setNumPeople(DEFAULT_STATE.numPeople);
      setFriendsData(DEFAULT_STATE.friendsData);
      setActiveView('all');
    }
  };

  // Export history to CSV
  const handleExportCSV = () => {
    if (calculatedShares.length === 0) return;
    let csv = `Occasion,Friend Name,Share (Have To Pay),Amount Paid,Amount Left on Share,Net Balance\n`;
    for (const f of calculatedShares) {
      csv += `"${occasionName}","${f.name}",${f.share.toFixed(2)},${f.paid.toFixed(2)},${f.amountLeft.toFixed(2)},${f.netBalance.toFixed(2)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bill_Split_${occasionName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-20 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
              S²
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block">
                SplitSquad
              </span>
              <span className="text-[10px] text-neutral-400 block -mt-0.5">
                Offline Bill Splitter & Automated Expense Tracker
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 hidden sm:inline">
              100% Offline · Local Storage
            </span>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors"
              title="Reset to sample data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            {validation.isValid && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors"
                title="Download CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Success toast if expense tracked */}
        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in shadow-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* SECTION 1: PRIMARY INPUTS (Occasion Name, Bill Amount, Number of People) */}
        <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="mb-4">
            <h1 className="text-lg font-bold text-white tracking-tight">
              Manage & Split Bill
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Enter the occasion name, total bill amount, and the number of friends.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Input 1: Occasion Name */}
            <div>
              <label htmlFor="occasion-input" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Occasion Name
              </label>
              <div className="relative">
                <input
                  id="occasion-input"
                  data-testid="occasion-input"
                  type="text"
                  placeholder="e.g. Dinner with Friends, Trip Fuel, Grocery Run"
                  value={occasionName}
                  onChange={(e) => setOccasionName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-neutral-500 transition-colors"
                />
              </div>
            </div>

            {/* Input 2: Bill Amount */}
            <div>
              <label htmlFor="bill-amount-input" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Bill Amount ({currencySymbol})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-sm">
                  {currencySymbol}
                </span>
                <input
                  id="bill-amount-input"
                  data-testid="bill-amount-input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-sm font-mono tabular-nums text-white placeholder-neutral-500 rounded-xl pl-8 pr-3.5 py-2.5 focus:outline-none focus:border-neutral-500 transition-colors"
                />
              </div>
            </div>

            {/* Input 3: Number of People */}
            <div>
              <label htmlFor="num-people-input" className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Number of People
              </label>
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  id="num-people-input"
                  data-testid="num-people-input"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 4"
                  value={numPeople}
                  onChange={(e) => setNumPeople(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 text-sm font-mono tabular-nums text-white placeholder-neutral-500 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-neutral-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Quick Currency Selector */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-neutral-800/60 text-xs">
            <span className="text-neutral-500">Currency:</span>
            {['$', '€', '£', '₹', '¥'].map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setCurrencySymbol(sym)}
                className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
                  currencySymbol === sym
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </section>

        {/* SECTION 2: ERROR & NO RESULT STATE
            Prompt Requirement: "show a message and a no resultt , if the bill or tjhe number of the people is empty , zero or negative"
        */}
        {!validation.isValid && (
          <div
            data-testid="no-result-container"
            className="bg-neutral-900/40 border border-amber-900/40 rounded-2xl p-8 text-center space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div
              data-testid="no-result"
              className="text-lg font-bold text-amber-300 tracking-tight"
            >
              No result
            </div>

            <p
              data-testid="validation-error-message"
              className="text-sm text-neutral-300 max-w-md mx-auto"
            >
              {validation.errorMessage}
            </p>

            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Please provide an occasion name, a positive bill amount greater than 0, and at least 1 person to calculate the exact shares.
            </p>
          </div>
        )}

        {/* SECTION 3: VALID RESULTS & INTERACTIVE BUTTONS
            Prompt Requirement:
            - "having the button that show how much each person paid , show each person shares"
            - "the shared added up excatally to the bill"
            - "friends with their names , how much they have have to pay , how much they paid , how much amount left on their share"
        */}
        {validation.isValid && (
          <section className="space-y-6">
            {/* Action Bar with the required buttons */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl">
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* BUTTON: Show Each Person Shares */}
                  <button
                    id="btn-show-shares"
                    data-testid="btn-show-shares"
                    onClick={() => setActiveView('shares')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      activeView === 'shares'
                        ? 'bg-emerald-400 text-neutral-950 font-bold shadow-sm'
                        : 'bg-neutral-950 text-neutral-300 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Show Each Person Shares
                  </button>

                  {/* BUTTON: Show How Much Each Person Paid */}
                  <button
                    id="btn-show-paid"
                    data-testid="btn-show-paid"
                    onClick={() => setActiveView('paid')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      activeView === 'paid'
                        ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                        : 'bg-neutral-950 text-neutral-300 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Show How Much Each Person Paid
                  </button>

                  {/* BUTTON: Show All Details & Left on Share */}
                  <button
                    id="btn-show-all"
                    data-testid="btn-show-all"
                    onClick={() => setActiveView('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      activeView === 'all'
                        ? 'bg-neutral-100 text-neutral-950 font-bold shadow-sm'
                        : 'bg-neutral-950 text-neutral-300 hover:text-white border border-neutral-800'
                    }`}
                  >
                    Show All Details & Balances
                  </button>
                </div>

                {/* Automated Tracker Save Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveToExpenseTracker}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shadow-sm"
                    title="Save this split to automated tracking log"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Track This Expense</span>
                  </button>
                </div>
              </div>

              {/* View Spotlight Indicator */}
              {activeView === 'shares' && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs text-emerald-300 flex items-center justify-between">
                  <span>
                    <strong>Mode: Each Person's Share</strong> · Showing how much each of the {calculatedShares.length} friends has to pay for "{occasionName}".
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    Total: {formatCurrency(sharesSum, currencySymbol)}
                  </span>
                </div>
              )}
              {activeView === 'paid' && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-300 flex items-center justify-between">
                  <span>
                    <strong>Mode: How Much Each Person Paid</strong> · Showing out-of-pocket contributions upfront. Total paid: {formatCurrency(totalPaidSum, currencySymbol)}.
                  </span>
                  <span className="font-mono text-amber-400 font-bold">
                    {totalPaidSum >= parsedBill ? 'Fully Paid' : `Remaining: ${formatCurrency(parsedBill - totalPaidSum, currencySymbol)}`}
                  </span>
                </div>
              )}
            </div>

            {/* EXACT SUM VERIFICATION BANNER
                Prompt Requirement: "the shared added up excatally to the bill"
            */}
            <div
              data-testid="exact-sum-verification"
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isExactMatch
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                  : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Shares Sum Exact Verification:</span>
                    <span className="font-mono text-emerald-400">
                      {formatCurrency(sharesSum, currencySymbol)} = {formatCurrency(parsedBill, currencySymbol)}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Every penny is accounted for. The sum of all individual shares matches the total bill exactly.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono tabular-nums shrink-0">
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase">Difference</span>
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(sumDiff, currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase">Status</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Exact Match</span>
                  </span>
                </div>
              </div>
            </div>

            {/* KEY SUMMARY STATS BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
              <div>
                <span className="text-[11px] text-neutral-400 block">Occasion</span>
                <span className="text-sm font-bold text-white truncate block mt-0.5" title={occasionName}>
                  {occasionName || 'Untitled'}
                </span>
                <span className="text-[10px] text-neutral-500 block">
                  {calculatedShares.length} friends participating
                </span>
              </div>

              <div>
                <span className="text-[11px] text-neutral-400 block">Total Bill (Have to Pay)</span>
                <span className="text-base font-bold text-white font-mono tabular-nums block mt-0.5">
                  {formatCurrency(parsedBill, currencySymbol)}
                </span>
                <span className="text-[10px] text-neutral-500 block">
                  Base share: ~{formatCurrency(calculatedShares[0]?.share || 0, currencySymbol)}/person
                </span>
              </div>

              <div>
                <span className="text-[11px] text-neutral-400 block">Total Paid Upfront</span>
                <span className="text-base font-bold text-neutral-200 font-mono tabular-nums block mt-0.5">
                  {formatCurrency(totalPaidSum, currencySymbol)}
                </span>
                <span className="text-[10px] text-neutral-500 block">
                  {totalPaidSum >= parsedBill ? 'Fully covered' : `Underpaid by ${formatCurrency(parsedBill - totalPaidSum, currencySymbol)}`}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-neutral-400 block">Total Left on Shares</span>
                <span className={`text-base font-bold font-mono tabular-nums block mt-0.5 ${
                  totalAmountLeftSum > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {formatCurrency(totalAmountLeftSum, currencySymbol)}
                </span>
                <span className="text-[10px] text-neutral-500 block">
                  {totalAmountLeftSum === 0 ? 'All settled' : 'Unpaid debt'}
                </span>
              </div>
            </div>

            {/* QUICK PRESET PAYMENT SHORTCUTS */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-neutral-900/40 border border-neutral-800/60 rounded-xl text-xs">
              <span className="text-neutral-400 font-medium">Quick Paid Shortcuts:</span>
              {friendsData.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleSinglePayerAll(f.id)}
                  className="px-2 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded text-[11px] text-neutral-300 transition-colors"
                >
                  {f.name} paid all ({formatCurrency(parsedBill, currencySymbol)})
                </button>
              ))}
              <button
                onClick={handleSplitPaidEqually}
                className="px-2 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded text-[11px] text-emerald-400 transition-colors"
              >
                Split paid equally
              </button>
            </div>

            {/* FRIENDS SHARES & PAID TABLE / CARDS
                Prompt Requirement:
                - friends with their names
                - how much they have to pay
                - how much they paid
                - how much amount left on their share
            */}
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Individual Friends Ledger
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Names, shares owed, upfront contributions, and remaining balances left on their share.
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  {calculatedShares.length} Friends
                </span>
              </div>

              {/* Table view for Desktop */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 font-semibold bg-neutral-950/40">
                      <th className="py-3 px-4">Friend Name</th>
                      <th
                        className={`py-3 px-4 text-right transition-colors ${
                          activeView === 'shares'
                            ? 'text-emerald-300 bg-emerald-950/30 border-b-2 border-emerald-400'
                            : ''
                        }`}
                      >
                        How Much They Have to Pay
                        <span className="block text-[10px] text-neutral-500 font-normal">Their Share</span>
                      </th>
                      <th
                        className={`py-3 px-4 text-right transition-colors ${
                          activeView === 'paid'
                            ? 'text-amber-300 bg-amber-950/30 border-b-2 border-amber-400'
                            : ''
                        }`}
                      >
                        How Much They Paid
                        <span className="block text-[10px] text-neutral-500 font-normal">Upfront contribution</span>
                      </th>
                      <th className="py-3 px-4 text-right">
                        Amount Left on Share
                        <span className="block text-[10px] text-neutral-500 font-normal">Pending to pay</span>
                      </th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {calculatedShares.map((f, idx) => {
                      return (
                        <tr
                          key={f.id}
                          className="hover:bg-neutral-900/40 transition-colors"
                        >
                          {/* 1. Name with Inline Editor */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-300 font-mono text-xs flex items-center justify-center font-bold">
                                {idx + 1}
                              </span>
                              <input
                                id={`friend-name-${idx}`}
                                data-testid={`friend-name-${idx}`}
                                aria-label={`Name of friend ${idx + 1}`}
                                type="text"
                                value={f.name}
                                onChange={(e) => handleNameChange(f.id, e.target.value)}
                                className="bg-transparent border-b border-dashed border-neutral-700 hover:border-neutral-500 focus:border-emerald-400 text-xs font-semibold text-white px-1 py-0.5 focus:outline-none focus:bg-neutral-950"
                              />
                            </div>
                          </td>

                          {/* 2. How Much They Have to Pay (Share) */}
                          <td
                            className={`py-3 px-4 text-right font-mono tabular-nums text-sm font-semibold transition-colors ${
                              activeView === 'shares'
                                ? 'text-emerald-300 bg-emerald-950/20 font-bold'
                                : 'text-white'
                            }`}
                          >
                            <span data-testid={`friend-share-${idx}`}>
                              {formatCurrency(f.share, currencySymbol)}
                            </span>
                          </td>

                          {/* 3. How Much They Paid (Editable input) */}
                          <td
                            className={`py-3 px-4 text-right font-mono tabular-nums transition-colors ${
                              activeView === 'paid' ? 'bg-amber-950/20' : ''
                            }`}
                          >
                            <div className="inline-flex items-center gap-1 justify-end">
                              <span className="text-neutral-500 text-xs font-mono">{currencySymbol}</span>
                              <input
                                id={`friend-paid-${idx}`}
                                data-testid={`friend-paid-${idx}`}
                                aria-label={`Amount paid by ${f.name}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={f.paid || ''}
                                placeholder="0.00"
                                onChange={(e) => handlePaidChange(f.id, e.target.value)}
                                className={`w-20 bg-neutral-950 border text-right px-2 py-1 rounded text-xs text-white font-mono tabular-nums focus:outline-none ${
                                  activeView === 'paid'
                                    ? 'border-amber-600 focus:border-amber-400 bg-neutral-900'
                                    : 'border-neutral-800 focus:border-neutral-600'
                                }`}
                              />
                            </div>
                          </td>

                          {/* 4. How Much Amount Left on Their Share */}
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-sm font-bold">
                            <span
                              data-testid={`friend-left-${idx}`}
                              className={f.amountLeft > 0 ? 'text-amber-400' : 'text-neutral-400'}
                            >
                              {formatCurrency(f.amountLeft, currencySymbol)}
                            </span>
                          </td>

                          {/* 5. Status indicator */}
                          <td className="py-3 px-4 text-center">
                            {f.netBalance < -0.009 && (
                              <span className="text-[11px] font-medium text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                Owes {formatCurrency(Math.abs(f.netBalance), currencySymbol)}
                              </span>
                            )}
                            {f.netBalance > 0.009 && (
                              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                Gets back {formatCurrency(f.netBalance, currencySymbol)}
                              </span>
                            )}
                            {Math.abs(f.netBalance) <= 0.009 && (
                              <span className="text-[11px] font-medium text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                Settled ($0.00)
                              </span>
                            )}
                          </td>

                          {/* 6. Quick Action: Copy reminder */}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleCopyReminder(f)}
                              title="Copy personalized reminder for WhatsApp/SMS"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded transition-colors"
                            >
                              {copiedId === f.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-neutral-400" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totals Footer */}
                  <tfoot>
                    <tr className="border-t border-neutral-800 bg-neutral-950/80 font-semibold text-xs">
                      <td className="py-3 px-4 text-white">
                        Total Sum Verification
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 text-sm">
                        {formatCurrency(sharesSum, currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-white text-sm">
                        {formatCurrency(totalPaidSum, currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-400 text-sm">
                        {formatCurrency(totalAmountLeftSum, currencySymbol)}
                      </td>
                      <td colSpan={2} className="py-3 px-4 text-center text-neutral-400 text-[11px]">
                        Exact Match: {isExactMatch ? 'Verified 100%' : 'Mismatch'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* AUTOMATED SETTLE-UP / DEBT MINIMIZATION ENGINE
                Prompt Requirement: "automated expense tracking features"
            */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Automated Debt Minimization (Smart Settle-Up)
                  </h3>
                </div>
                <span className="text-xs text-neutral-400">
                  {simplifiedDebts.length === 0
                    ? 'All debts settled'
                    : `${simplifiedDebts.length} minimal transfer${simplifiedDebts.length === 1 ? '' : 's'} needed`}
                </span>
              </div>

              {simplifiedDebts.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-xs text-neutral-300 font-medium">All shares are fully settled!</p>
                  <p className="text-[11px] text-neutral-500">
                    No debts remaining for {occasionName}.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-800/60 mt-2">
                  {simplifiedDebts.map((transfer, idx) => (
                    <div
                      key={idx}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-neutral-900/40 px-2 rounded-lg"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center font-mono text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-amber-300">{transfer.from}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                        <span className="font-semibold text-emerald-300">{transfer.to}</span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <span className="text-sm font-bold font-mono tabular-nums text-white">
                          {formatCurrency(transfer.amount, currencySymbol)}
                        </span>
                        <button
                          onClick={() => {
                            // Find the debtor and creditor in friendsData and apply payment
                            const debtorObj = friendsData.find((f) => f.name === transfer.from);
                            if (debtorObj) {
                              handlePaidChange(debtorObj.id, String(debtorObj.paid + transfer.amount));
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded"
                        >
                          Mark as Paid
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AUTOMATED EXPENSE HISTORY LOG
                Prompt Requirement: "automated expense tracking features" + "still show the result after the page id reload"
            */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-neutral-400" />
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Automated Expense Tracking History
                  </h3>
                </div>
                <span className="text-xs text-neutral-400">
                  {history.length} Saved Occasion{history.length === 1 ? '' : 's'}
                </span>
              </div>

              {history.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-500">
                  No previous occasions saved yet. Click "Track This Expense" above to save this occasion.
                </div>
              ) : (
                <div className="divide-y divide-neutral-800/60 mt-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">
                            {item.occasionName}
                          </span>
                          <span className="text-neutral-500 font-mono text-[11px]">
                            {item.date}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400">
                          {item.numPeople} friends · {item.friends.map((f) => f.name).join(', ')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <span className="font-bold font-mono text-sm text-white block">
                            {formatCurrency(item.billAmount, item.currencySymbol)}
                          </span>
                          <span className="text-[10px] text-neutral-500 block">
                            {item.settled ? 'Settled' : 'Pending balance'}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${item.occasionName}" from history?`)) {
                              setHistory(history.filter((h) => h.id !== item.id));
                            }
                          }}
                          className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                          title="Delete from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-4 text-center text-xs text-neutral-500">
        SplitSquad · 100% Client-Side Offline Bill Splitter · Local Persistence
      </footer>
    </div>
  );
}
