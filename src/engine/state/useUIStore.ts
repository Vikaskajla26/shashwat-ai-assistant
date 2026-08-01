import { create } from 'zustand';

export type NavTab = 'home' | 'memory' | 'learn' | 'system' | 'settings';

export interface UIStore {
  activeTab: NavTab;
  isLeftDrawerOpen: boolean;
  isRightDrawerOpen: boolean;
  isSettingsOpen: boolean;
  isSandboxOpen: boolean;
  isDocWorkspaceOpen: boolean;
  isSanskritStudioOpen: boolean;
  isSelfLearningOpen: boolean;
  isFocusMode: boolean;
  
  // Actions
  setActiveTab: (tab: NavTab) => void;
  setLeftDrawer: (open: boolean) => void;
  setRightDrawer: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setSandboxOpen: (open: boolean) => void;
  setDocWorkspaceOpen: (open: boolean) => void;
  setSanskritStudioOpen: (open: boolean) => void;
  setSelfLearningOpen: (open: boolean) => void;
  toggleFocusMode: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeTab: 'home',
  isLeftDrawerOpen: false,
  isRightDrawerOpen: false,
  isSettingsOpen: false,
  isSandboxOpen: false,
  isDocWorkspaceOpen: false,
  isSanskritStudioOpen: false,
  isSelfLearningOpen: false,
  isFocusMode: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setLeftDrawer: (open) => set({ isLeftDrawerOpen: open }),
  setRightDrawer: (open) => set({ isRightDrawerOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setSandboxOpen: (open) => set({ isSandboxOpen: open }),
  setDocWorkspaceOpen: (open) => set({ isDocWorkspaceOpen: open }),
  setSanskritStudioOpen: (open) => set({ isSanskritStudioOpen: open }),
  setSelfLearningOpen: (open) => set({ isSelfLearningOpen: open }),
  toggleFocusMode: () => set((s) => ({ isFocusMode: !s.isFocusMode })),
}));
