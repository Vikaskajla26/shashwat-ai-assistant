import React from 'react';
import {
  Power,
  Monitor,
  MonitorOff,
  Globe,
  FileSearch,
  Brain,
  Sliders,
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
  // Crystal Glass Power State Indicator Styling
  const powerStateStyles =
    state === 'disconnected'
      ? 'border-white/10 text-zinc-400 bg-white/5 hover:border-[#00E0FF] hover:text-[#00E0FF] hover:bg-[#00E0FF]/10 hover:shadow-[0_0_25px_rgba(0,224,255,0.4)]'
      : state === 'connecting'
      ? 'border-amber-400/80 text-amber-300 bg-amber-500/10 shadow-[0_0_25px_rgba(245,158,11,0.5)] animate-pulse'
      : state === 'listening'
      ? 'border-[#38BDF8] text-[#38BDF8] bg-[#38BDF8]/15 shadow-[0_0_25px_rgba(56,189,248,0.6)] animate-pulse'
      : state === 'speaking'
      ? 'border-[#FF4D8D] text-[#FF4D8D] bg-[#FF4D8D]/15 shadow-[0_0_25px_rgba(255,77,141,0.6)] animate-pulse'
      : 'border-[#00E0FF] text-[#00E0FF] bg-[#00E0FF]/15 shadow-[0_0_25px_rgba(0,224,255,0.5)]';

  const powerTooltip =
    state === 'disconnected'
      ? 'Awaken शाश्वt Consciousness'
      : state === 'listening'
      ? 'Listening... Click to Power Off'
      : state === 'speaking'
      ? 'Speaking... Click to Power Off'
      : 'Power Control & Session';

  return (
    <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <div className="flex items-center gap-3 sm:gap-4 p-2.5 px-5 rounded-full bg-[#05070D]/80 border border-white/14 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        {/* Left Workspace Drawer Toggle */}
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

        {/* REDESIGNED CRYSTAL GLASS POWER CONTROL BUTTON */}
        <button
          id="shashwat-power-control-button"
          onClick={onToggleMic}
          className={`p-4 rounded-full border backdrop-blur-xl transition-all duration-300 hover:scale-105 cursor-pointer relative group ${powerStateStyles}`}
          title={powerTooltip}
        >
          <Power className="w-6 h-6" />

          {/* Micro-Interaction Ambient Halo Ring */}
          <span className="absolute -inset-1 rounded-full border border-current opacity-30 group-hover:opacity-60 transition-opacity" />
        </button>

        {/* Document Intelligence Research Workspace Button */}
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
