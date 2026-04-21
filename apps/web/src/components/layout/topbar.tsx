'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  Bell,
  Settings,
  User,
  LogOut,
  UserCircle,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

type UserInfo = {
  id: string;
  email: string;
  name: string | null;
};

export function Topbar() {
  const router = useRouter();
  const [searchValue, setSearchValue] = React.useState('');
  const [user, setUser] = React.useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Fetch current user
  React.useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout failed:', err);
    }
    router.push('/login');
    router.refresh();
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const initial = (user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase();

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
          <Link
            href="/settings"
            className="inline-flex rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </Tooltip>

        {/* Divider */}
        <div className="mx-2 h-6 w-px bg-gray-200" />

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {user ? initial : <User className="h-4 w-4" />}
            </div>
            <span className="hidden text-sm font-medium text-gray-700 md:block">
              {displayName}
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
            >
              {/* User info */}
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="truncate text-sm font-medium text-gray-900">
                  {user?.name || 'User'}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {user?.email || 'Loading...'}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <UserCircle className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>

              {/* Logout */}
              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}