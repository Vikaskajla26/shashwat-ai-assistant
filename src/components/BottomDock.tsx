import React from 'react';
import {
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Globe,
  FileSearch,
  Brain,
  Sliders,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { AssistantState } from '../types';

interface BottomDockProps {
  state: AssistantState;
  isScreenSharing: boolean;
  isSandboxOpen: boolean;
  isDocWorkspaceOpen: boolean;
  onToggleMic: () => void;
  onToggleScreenShare: () => void;
  onToggleSandbox: () => void;
  onToggleDocWorkspace: () => void;
  onOpenLeftDrawer: () => void;
  onOpenRightDrawer: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  state,
  isScreenSharing,
  isSandboxOpen,
  isDocWorkspaceOpen,
  onToggleMic,
  onToggleScreenShare,
  onToggleSandbox,
  onToggleDocWorkspace,
  onOpenLeftDrawer,
  onOpenRightDrawer,
}) => {
  return (
    <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <div className="flex items-center gap-3 sm:gap-4 p-2.5 px-5 rounded-full bg-[#05070D]/80 border border-white/14 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        {/* Left Workspace & History Drawer Toggle */}
        <button
          onClick={onOpenLeftDrawer}
          className="p-3 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-[#00E0FF] hover:border-[#00E0FF]/50 hover:bg-[#00E0FF]/15 transition-all cursor-pointer"
          title="Workspace & History Drawer"
        >
          <Brain className="w-5 h-5" />
        </button>

        {/* Screen Share Action Button */}
        <button
          onClick={onToggleScreenShare}
          className={`p-3 rounded-full transition-all cursor-pointer ${
            isScreenSharing
              ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)] ring-1 ring-emerald-400'
              : 'bg-white/5 border border-white/10 text-zinc-300 hover:text-[#00E0FF] hover:border-[#00E0FF]/50 hover:bg-[#00E0FF]/15'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5 text-emerald-400" /> : <Monitor className="w-5 h-5" />}
        </button>

        {/* AI Sandbox Browser Workspace Button */}
        <button
          onClick={onToggleSandbox}
          className={`p-3 rounded-full transition-all cursor-pointer ${
            isSandboxOpen
              ? 'bg-blue-600/30 border border-blue-400 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.5)] ring-1 ring-blue-400'
              : 'bg-white/5 border border-white/10 text-zinc-300 hover:text-blue-400 hover:border-blue-400/50 hover:bg-blue-400/15'
          }`}
          title="Autonomous AI Sandbox Browser"
        >
          <Globe className="w-5 h-5 text-blue-400" />
        </button>

        {/* Primary AI Connection Orb Control */}
        <button
          onClick={onToggleMic}
          className={`p-4 rounded-full transition-all cursor-pointer shadow-[0_0_30px_rgba(0,224,255,0.6)] ${
            state !== 'disconnected'
              ? 'bg-gradient-to-r from-rose-600 to-rose-500 border border-rose-400 text-white animate-pulse'
              : 'bg-gradient-to-r from-[#00E0FF] to-blue-600 border border-[#00E0FF] text-white hover:scale-105'
          }`}
          title={state === 'disconnected' ? 'Awaken शाश्वत' : 'End Session'}
        >
          {state === 'disconnected' ? (
            <Mic className="w-6 h-6 text-white" />
          ) : (
            <MicOff className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Document Intelligence & AI Research Workspace Button */}
        <button
          onClick={onToggleDocWorkspace}
          className={`p-3 rounded-full transition-all cursor-pointer ${
            isDocWorkspaceOpen
              ? 'bg-cyan-600/30 border border-cyan-400 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.5)] ring-1 ring-cyan-400'
              : 'bg-white/5 border border-white/10 text-zinc-300 hover:text-cyan-400 hover:border-cyan-400/50 hover:bg-cyan-400/15'
          }`}
          title="Document Research Workspace"
        >
          <FileSearch className="w-5 h-5 text-cyan-400" />
        </button>

        {/* Right System Settings & Themes Drawer Toggle */}
        <button
          onClick={onOpenRightDrawer}
          className="p-3 rounded-full bg-white/5 border border-white/10 text-zinc-300 hover:text-[#A78BFA] hover:border-[#A78BFA]/50 hover:bg-[#A78BFA]/15 transition-all cursor-pointer"
          title="Themes & System Drawer"
        >
          <Sliders className="w-5 h-5" />
        </button>
      </div>
    </footer>
  );
};
