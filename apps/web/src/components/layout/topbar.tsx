'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  //SlidersHorizontal,
  Bell,
  Settings,
  User,
  LogOut,
  UserCircle,
  Check,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

type UserInfo = {
  id: string;
  email: string;
  name: string | null;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function Topbar() {
  const router = useRouter();
  const [searchValue, setSearchValue] = React.useState('');
  const [user, setUser] = React.useState<UserInfo | null>(null);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);

  const menuRef = React.useRef<HTMLDivElement>(null);
  const notifRef = React.useRef<HTMLDivElement>(null);

  // Fetch user
  React.useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  // Fetch notifications (on mount + every 30s)
  React.useEffect(() => {
    const fetchNotifs = () => {
      fetch('/api/notifications?limit=10', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.notifications) {
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount || 0);
          }
        })
        .catch(() => {});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout failed:', err);
    }
    router.push('/login');
    router.refresh();
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Mark as read failed:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Mark all as read failed:', err);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
        {/*<Tooltip content="Toggle filters">
          <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </Tooltip>*/}

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((prev) => !prev)}
            className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.read && markAsRead(notif.id)}
                      className={`flex cursor-pointer gap-3 border-b border-gray-50 px-4 py-3 last:border-0 hover:bg-gray-50 ${
                        !notif.read ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {!notif.read && (
                          <div className="h-2 w-2 rounded-full bg-indigo-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                        {notif.message && (
                          <p className="mt-0.5 text-xs text-gray-600">{notif.message}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {formatTimeAgo(notif.createdAt)}
                        </p>
                      </div>
                      {notif.read && (
                        <Check className="h-4 w-4 flex-shrink-0 text-gray-300" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <Tooltip content="Settings">
          <Link
            href="/settings"
            className="inline-flex rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </Tooltip>

        <div className="mx-2 h-6 w-px bg-gray-200" />

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {user ? initial : <User className="h-4 w-4" />}
            </div>
            <span className="hidden text-sm font-medium text-gray-700 md:block">
              {displayName}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="truncate text-sm font-medium text-gray-900">
                  {user?.name || 'User'}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {user?.email || 'Loading...'}
                </p>
              </div>

              <div className="py-1">
                <Link
                    href="/profile"
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