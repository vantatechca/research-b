'use client';

import React from 'react';
import { Search, SlidersHorizontal, Bell, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';

export function Topbar() {
  const [searchValue, setSearchValue] = React.useState('');

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search ideas, peptides, trends..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Filter toggle */}
        <Tooltip content="Toggle filters">
          <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </Tooltip>

        {/* Notifications */}
        <Tooltip content="Notifications">
          <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              3
            </span>
          </button>
        </Tooltip>

        {/* Settings */}
        <Tooltip content="Settings">
          <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </Tooltip>

        {/* Divider */}
        <div className="mx-2 h-6 w-px bg-gray-200" />

        {/* User */}
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden text-sm font-medium text-gray-700 md:block">
            Admin
          </span>
        </button>
      </div>
    </header>
  );
}
