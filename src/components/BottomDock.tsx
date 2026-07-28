import React, { useState } from 'react';
import {
  Power,
  Monitor,
  MonitorOff,
  Globe,
  FileSearch,
  Brain,
  Sliders,
  Send,
  Mic,
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
  onSendTypedText?: (text: string) => void;
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
  onSendTypedText,
}) => {
  const [typedText, setTypedText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedText.trim() && onSendTypedText) {
      onSendTypedText(typedText.trim());
      setTypedText('');
    }
  };

  const powerStateStyles =
    state === 'disconnected'
      ? 'border-white/14 text-zinc-400 bg-white/5 hover:border-[#4FC3F7] hover:text-[#4FC3F7] hover:bg-[#4FC3F7]/10'
      : state === 'connecting'
      ? 'border-amber-400/80 text-amber-300 bg-amber-500/10 shadow-[0_0_25px_rgba(245,158,11,0.5)] animate-pulse'
      : state === 'listening'
      ? 'border-[#4FC3F7] text-[#4FC3F7] bg-[#4FC3F7]/15 shadow-[0_0_25px_rgba(79,195,247,0.6)] animate-pulse'
      : state === 'speaking'
      ? 'border-[#FF4D9D] text-[#FF4D9D] bg-[#FF4D9D]/15 shadow-[0_0_25px_rgba(255,77,157,0.6)] animate-pulse'
      : 'border-[#9B5DE5] text-[#9B5DE5] bg-[#9B5DE5]/15 shadow-[0_0_25px_rgba(155,93,229,0.5)]';

  return (
    <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-full max-w-xl px-4 select-none">
      {/* 2040 Ultra-Clean Glassmorphic Floating Button Bar (Apple HIG / Vision Pro Style) */}
      <div className="flex items-center gap-2.5 p-2 px-3.5 rounded-full bg-black/60 border border-white/14 backdrop-blur-3xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] ring-1 ring-white/10 hover:border-white/20 transition-all">
        {/* Left Workspace Drawer Button */}
        <button
          onClick={onOpenLeftDrawer}
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/12 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          title="Memory & Workspaces"
        >
          <Brain className="w-4 h-4" />
        </button>

        {/* Command Input Field */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder="Ask शाश्वत or type command..."
            className="w-full bg-transparent text-white placeholder-zinc-500 font-sans text-xs px-3 py-1.5 outline-none"
          />
          {typedText.trim() && (
            <button
              type="submit"
              className="p-2 rounded-full bg-[#4FC3F7] text-slate-950 hover:bg-[#4FC3F7]/90 font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(79,195,247,0.5)]"
              title="Send"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Screen Share Action Button */}
        <button
          onClick={onToggleScreenShare}
          className={`p-2.5 rounded-full transition-all cursor-pointer border ${
            isScreenSharing
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
              : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/12'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
        >
          {isScreenSharing ? <MonitorOff className="w-4 h-4 text-emerald-400" /> : <Monitor className="w-4 h-4" />}
        </button>

        {/* AI Sandbox Browser Workspace Button */}
        <button
          onClick={onToggleSandbox}
          className={`p-2.5 rounded-full transition-all cursor-pointer border ${
            isSandboxOpen
              ? 'bg-blue-600/30 border-blue-400 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
              : 'bg-white/5 border-white/10 text-zinc-400 hover:text-blue-400 hover:bg-white/12'
          }`}
          title="Autonomous AI Sandbox Browser"
        >
          <Globe className="w-4 h-4" />
        </button>

        {/* Document Intelligence Research Workspace Button */}
        <button
          onClick={onToggleDocWorkspace}
          className={`p-2.5 rounded-full transition-all cursor-pointer border ${
            isDocWorkspaceOpen
              ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
              : 'bg-white/5 border-white/10 text-zinc-400 hover:text-cyan-400 hover:bg-white/12'
          }`}
          title="Study Studio"
        >
          <FileSearch className="w-4 h-4" />
        </button>

        {/* Power / Microphone Central Action Button */}
        <button
          id="shashwat-power-control-button"
          onClick={onToggleMic}
          className={`p-3 rounded-full border backdrop-blur-xl transition-all duration-300 hover:scale-105 cursor-pointer ${powerStateStyles}`}
          title={state === 'disconnected' ? 'Awaken शाश्वत' : 'Power Control'}
        >
          {state === 'disconnected' ? <Power className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Right Settings Drawer Button */}
        <button
          onClick={onOpenRightDrawer}
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/12 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
          title="Settings & Themes"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
