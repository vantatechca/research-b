'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Lightbulb,
  CheckCircle,
  XCircle,
  Archive,
  Star,
  TrendingUp,
  Users,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'New Ideas', href: '/ideas', icon: Lightbulb, badge: 12 },
  { label: 'Approved', href: '/ideas/approved', icon: CheckCircle },
  { label: 'Declined', href: '/ideas/declined', icon: XCircle },
  { label: 'Archived', href: '/ideas/archived', icon: Archive },
  { label: 'Starred', href: '/ideas/starred', icon: Star },
];

const secondaryNav: NavItem[] = [
  { label: 'Trends', href: '/trends', icon: TrendingUp },
  { label: 'Competitors', href: '/competitors', icon: Users },
  { label: 'Rules', href: '/rules', icon: Shield },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-indigo-600 text-white'
          : 'text-indigo-200 hover:bg-indigo-900/50 hover:text-white',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <Badge
              variant="default"
              className="bg-indigo-500 text-white text-[10px] px-1.5 py-0"
            >
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip content={item.label} side="right">
        {link}
      </Tooltip>
    );
  }

  return link;
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-indigo-900/30 bg-[#1e1b4b] transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-indigo-900/30 px-4">
        <FlaskConical className="h-6 w-6 shrink-0 text-indigo-400" />
        {!sidebarCollapsed && (
          <span className="text-base font-bold tracking-tight text-white">
            PeptideIQ
          </span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {mainNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href}
            collapsed={sidebarCollapsed}
          />
        ))}

        {/* Divider */}
        <div className="my-3 border-t border-indigo-900/40" />

        {secondaryNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href}
            collapsed={sidebarCollapsed}
          />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-indigo-900/30 p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-lg p-2 text-indigo-300 hover:bg-indigo-900/50 hover:text-white transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
