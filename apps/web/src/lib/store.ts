import { create } from 'zustand';

export interface IdeaFilters {
  status: string;
  scoreRange: [number, number];
  productTypes: string[];
  peptideCategories: string[];
  compliance: string;
  sources: string[];
  dateRange: { from: string | null; to: string | null };
  sortBy: string;
}

const defaultFilters: IdeaFilters = {
  status: 'all',
  scoreRange: [0, 100],
  productTypes: [],
  peptideCategories: [],
  compliance: 'all',
  sources: [],
  dateRange: { from: null, to: null },
  sortBy: 'newest',
};

interface AppState {
  chatOpen: boolean;
  toggleChat: () => void;

  activeChatThread: string | null;
  setActiveChatThread: (id: string | null) => void;

  chatType: 'global' | 'idea';
  setChatType: (type: 'global' | 'idea') => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  filters: IdeaFilters;
  setFilter: <K extends keyof IdeaFilters>(key: K, value: IdeaFilters[K]) => void;
  resetFilters: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  chatOpen: false,
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),

  activeChatThread: null,
  setActiveChatThread: (id) => set({ activeChatThread: id }),

  chatType: 'global',
  setChatType: (type) => set({ chatType: type }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  filters: { ...defaultFilters },
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
}));
