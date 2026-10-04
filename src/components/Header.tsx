import React from 'react';
import { Group } from '../types';
import { Plus, ArrowLeftRight, Users, Sparkles, RefreshCw, FolderPlus } from 'lucide-react';

interface HeaderProps {
  groups: Group[];
  activeGroup: Group;
  onSelectGroup: (groupId: string) => void;
  onOpenAddBill: () => void;
  onOpenSettleUp: () => void;
  onOpenSmartReceipt: () => void;
  onOpenManageFriends: () => void;
  onOpenNewGroup: () => void;
  onResetDemo: () => void;
  activeTab: 'overview' | 'friends' | 'bills' | 'recurring' | 'analytics';
  setActiveTab: (tab: 'overview' | 'friends' | 'bills' | 'recurring' | 'analytics') => void;
}

export const Header: React.FC<HeaderProps> = ({
  groups,
  activeGroup,
  onSelectGroup,
  onOpenAddBill,
  onOpenSettleUp,
  onOpenSmartReceipt,
  onOpenManageFriends,
  onOpenNewGroup,
  onResetDemo,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar Zone Contract: Zone 1 Wordmark | Zone 2 Nav Links | Zone 3 Primary Actions */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: Single text wordmark with subtle brand icon */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
              S²
            </div>
            <a href="#" className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
              SplitSquad
            </a>

            {/* Group Switcher dropdown */}
            <div className="hidden sm:flex items-center ml-2 pl-3 border-l border-neutral-800">
              <select
                aria-label="Select active group"
                value={activeGroup.id}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    onOpenNewGroup();
                  } else {
                    onSelectGroup(e.target.value);
                  }
                }}
                className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-neutral-600 font-medium"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.friends.length} friends)
                  </option>
                ))}
                <option value="__NEW__">+ New Group...</option>
              </select>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'friends'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Friends & Balances</span>
              <span className="text-[10px] bg-neutral-700/60 px-1.5 py-0.2 rounded-full text-neutral-300">
                {activeGroup.friends.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'bills'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Bills & Expenses ({activeGroup.bills.length})
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'recurring'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Recurring ({activeGroup.recurringExpenses.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              Analytics
            </button>
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSmartReceipt}
              title="Automated Smart Receipt & Text Ingestion"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/40 transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Parse Receipt</span>
            </button>

            <button
              onClick={onOpenSettleUp}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-200 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors whitespace-nowrap"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-neutral-400" />
              <span>Settle Up</span>
            </button>

            <button
              onClick={onOpenAddBill}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 rounded-lg hover:bg-emerald-300 transition-colors whitespace-nowrap shadow-sm"
            >
              <Plus className="w-4 h-4 text-neutral-950" />
              <span>Add Bill</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-neutral-900 overflow-x-auto gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-2.5 py-1 text-xs rounded ${activeTab === 'overview' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-2.5 py-1 text-xs rounded ${activeTab === 'friends' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
            >
              Friends ({activeGroup.friends.length})
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-2.5 py-1 text-xs rounded ${activeTab === 'bills' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
            >
              Bills ({activeGroup.bills.length})
            </button>
            <button
              onClick={() => setActiveTab('recurring')}
              className={`px-2.5 py-1 text-xs rounded ${activeTab === 'recurring' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
            >
              Recurring
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-2.5 py-1 text-xs rounded ${activeTab === 'analytics' ? 'bg-neutral-800 text-white' : 'text-neutral-400'}`}
            >
              Analytics
            </button>
          </div>
          <button
            onClick={onOpenSmartReceipt}
            className="text-[11px] text-emerald-400 px-2 py-1 rounded bg-emerald-950/40 shrink-0"
          >
            Auto-Parse
          </button>
        </div>
      </div>
    </header>
  );
};
