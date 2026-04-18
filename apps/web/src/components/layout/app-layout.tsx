'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { ChatPanel } from '@/components/layout/chat-panel';
import { Menu, MessageSquare } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { sidebarCollapsed, toggleSidebar, chatOpen, toggleChat } =
    useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless toggled */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 lg:static lg:z-auto',
          mobileMenuOpen ? 'block' : 'hidden lg:block'
        )}
      >
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar with mobile menu button */}
        <div className="relative">
          <div className="absolute left-2 top-1/2 z-10 -translate-y-1/2 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <Topbar />
        </div>

        {/* Content + Chat */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>

          {/* Chat panel */}
          <ChatPanel />
        </div>
      </div>

      {/* Floating chat toggle (when chat is closed) */}
      {!chatOpen && (
        <Tooltip content="Open AI Assistant" side="left">
          <button
            onClick={toggleChat}
            className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
