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
  MicOff,
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
    <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-full max-w-2xl px-4">
      {/* Glassmorphic Floating Input Bar (Apple HIG Style) */}
      <div className="flex items-center gap-2 p-2 px-3 rounded-3xl bg-[#05070D]/85 border border-white/14 backdrop-blur-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        {/* Left Workspace Drawer Toggle */}
        <button
          onClick={onOpenLeftDrawer}
          className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-[#4FC3F7] hover:border-[#4FC3F7]/40 hover:bg-[#4FC3F7]/15 transition-all cursor-pointer"
          title="Workspace & Memory Drawer"
        >
          <Brain className="w-4 h-4" />
        </button>

        {/* Command Text Input Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder="Type a command or ask शाश्वत..."
            className="w-full bg-white/5 border border-white/10 focus:border-[#4FC3F7]/60 text-white placeholder-zinc-500 font-sans text-xs px-4 py-2.5 rounded-2xl outline-none transition-all"
          />
          {typedText.trim() && (
            <button
              type="submit"
              className="p-2.5 rounded-2xl bg-[#4FC3F7] text-slate-950 hover:bg-[#4FC3F7]/90 font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(79,195,247,0.5)]"
              title="Send Command"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Screen Share Action Button */}
        <button
          onClick={onToggleScreenShare}
          className={`p-2.5 rounded-2xl transition-all cursor-pointer ${
            isScreenSharing
              ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
              : 'bg-white/5 border border-white/10 text-zinc-300 hover:text-[#4FC3F7] hover:border-[#4FC3F7]/40'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
        >
          {isScreenSharing ? <MonitorOff className="w-4 h-4 text-emerald-400" /> : <Monitor className="w-4 h-4" />}
        </button>

        {/* AI Sandbox Browser Workspace Button */}
        <button
          onClick={onToggleSandbox}
          className={`p-2.5 rounded-2xl transition-all cursor-pointer ${
            isSandboxOpen
              ? 'bg-blue-600/30 border border-blue-400 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
              : 'bg-white/5 border border-white/10 text-zinc-300 hover:text-blue-400 hover:border-blue-400/40'
          }`}
          title="Autonomous AI Sandbox Browser"
        >
          <Globe className="w-4 h-4 text-blue-400" />
        </button>

        {/* Document Intelligence Research Workspace Button */}
        <button
          onClick={onToggleDocWorkspace}
          className={`p-2.5 rounded-2xl transition-all cursor-pointer ${
            isDocWorkspaceOpen
              ? 'bg-cyan-600/30 border border-cyan-400 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
              : 'bg-white/5 border border-white/10 text-zinc-300 hover:text-cyan-400 hover:border-cyan-400/40'
          }`}
          title="Document Research Workspace"
        >
          <FileSearch className="w-4 h-4 text-cyan-400" />
        </button>

        {/* Power / Microphone Toggle */}
        <button
          id="shashwat-power-control-button"
          onClick={onToggleMic}
          className={`p-3 rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:scale-105 cursor-pointer relative group ${powerStateStyles}`}
          title={state === 'disconnected' ? 'Awaken शाश्वत' : 'Power Control & Session'}
        >
          {state === 'disconnected' ? <Power className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Right Settings Drawer Toggle */}
        <button
          onClick={onOpenRightDrawer}
          className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-[#9B5DE5] hover:border-[#9B5DE5]/40 transition-all cursor-pointer"
          title="Themes & System Drawer"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
