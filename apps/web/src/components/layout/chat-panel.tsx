'use client';

import React from 'react';
import {
  X,
  Send,
  MessageSquare,
  Bot,
  User,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatThread {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
}

export function ChatPanel() {
  const {
    chatOpen,
    toggleChat,
    chatType,
    setChatType,
    activeChatThread,
    setActiveChatThread,
  } = useAppStore();

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [threads, setThreads] = React.useState<ChatThread[]>([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Fetch threads
  React.useEffect(() => {
    if (!chatOpen) return;
    async function fetchThreads() {
      try {
        const res = await fetch('/api/chat/threads');
        if (res.ok) {
          const data = await res.json();
          setThreads(data.threads || data);
        }
      } catch {
        // silently fail if API not ready
      }
    }
    fetchThreads();
  }, [chatOpen]);

  // Fetch messages when thread changes
  React.useEffect(() => {
    if (!activeChatThread) {
      setMessages([]);
      return;
    }
    async function fetchMessages() {
      try {
        const res = await fetch(
          `/api/chat/threads/${activeChatThread}/messages`
        );
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || data);
        }
      } catch {
        // silently fail
      }
    }
    fetchMessages();
  }, [activeChatThread]);

  // Scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      let threadId = activeChatThread;

      // Create thread first if none exists
      if (!threadId) {
        const createRes = await fetch('/api/chat/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            threadType: chatType === 'idea' ? 'idea_specific' : 'global',
            title: userMessage.content.slice(0, 50),
          }),
        });
        if (createRes.ok) {
          const createData = await createRes.json();
          threadId = createData.thread?.id;
          if (threadId) setActiveChatThread(threadId);
        }
      }

      if (threadId) {
        const res = await fetch(`/api/chat/threads/${threadId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: userMessage.content }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.aiMessage) {
            setMessages((prev) => [
              ...prev,
              {
                id: data.aiMessage.id || Date.now().toString() + '-reply',
                role: 'assistant',
                content: data.aiMessage.content,
                timestamp: data.aiMessage.createdAt || new Date().toISOString(),
              },
            ]);
          }
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!chatOpen) return null;

  return (
    <aside className="flex h-full w-80 flex-col border-l border-gray-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-semibold text-gray-900">
            AI Assistant
          </span>
        </div>
        <button
          onClick={toggleChat}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-4 py-2">
        <Tabs value={chatType} onValueChange={(v) => setChatType(v as 'global' | 'idea')}>
          <TabsList className="w-full">
            <TabsTrigger value="global" className="flex-1">
              Global
            </TabsTrigger>
            <TabsTrigger value="idea" className="flex-1">
              Idea
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">
              Ask me anything about peptide ideas, trends, or compliance.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {msg.role === 'assistant' && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                <Bot className="h-3.5 w-3.5 text-indigo-600" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              )}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200">
                <User className="h-3.5 w-3.5 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100">
              <Bot className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="rounded-lg bg-gray-100 px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this idea..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
