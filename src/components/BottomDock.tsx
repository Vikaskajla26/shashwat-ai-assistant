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
      ? 'border-white/14 text-zinc-400 bg-white/5 hover:border-[#6C7CE0] hover:text-[#6C7CE0] hover:bg-[#6C7CE0]/10'
      : state === 'connecting'
      ? 'border-amber-400/80 text-amber-300 bg-amber-500/10 animate-pulse'
      : state === 'listening'
      ? 'border-[#6C7CE0] text-[#6C7CE0] bg-[#6C7CE0]/15 animate-pulse'
      : state === 'speaking'
      ? 'border-[#FF4D9D] text-[#FF4D9D] bg-[#FF4D9D]/15 animate-pulse'
      : 'border-[#9B5DE5] text-[#9B5DE5] bg-[#9B5DE5]/15';

  return (
    <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-full max-w-2xl px-4 breathing-dock">
      {/* Auto-receding Glassmorphic Command Dock */}
      <div className="flex items-center gap-2 p-2 px-3 rounded-3xl bg-[#0A0A0C]/85 border border-white/12 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] ring-1 ring-white/10">
        {/* Left Workspace Drawer Toggle */}
        <button
          onClick={onOpenLeftDrawer}
          className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-[#6C7CE0] hover:border-[#6C7CE0]/40 hover:bg-[#6C7CE0]/15 transition-all cursor-pointer holographic-toggle"
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
            className="w-full bg-white/5 border border-white/10 focus:border-[#6C7CE0]/60 text-white placeholder-zinc-500 font-sans text-xs px-4 py-2.5 rounded-2xl outline-none transition-all"
          />
          {typedText.trim() && (
            <button
              type="submit"
              className="p-2.5 rounded-2xl bg-[#6C7CE0] text-slate-950 hover:bg-[#6C7CE0]/90 font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(108,124,224,0.4)]"
              title="Send Command"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Screen Share Action Button */}
        <button
          onClick={onToggleScreenShare}
          className={`p-2.5 rounded-2xl transition-all cursor-pointer holographic-toggle ${
            isScreenSharing
              ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
              : 'bg-white/5 border border-white/10 text-zinc-300 hover:text-[#6C7CE0] hover:border-[#6C7CE0]/40'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
        >
          {isScreenSharing ? <MonitorOff className="w-4 h-4 text-emerald-400" /> : <Monitor className="w-4 h-4" />}
        </button>

        {/* AI Sandbox Browser Button */}
        <button
          onClick={onToggleSandbox}
          className={`p-2.5 rounded-2xl transition-all cursor-pointer holographic-toggle ${
            isSandboxOpen
              ? 'bg-blue-600/30 border border-blue-400 text-blue-200'
              : 'bg-white/5 border border-white/10 text-zinc-300 hover:text-blue-400 hover:border-blue-400/40'
          }`}
          title="Autonomous AI Sandbox Browser"
        >
          <Globe className="w-4 h-4 text-blue-400" />
        </button>

        {/* 🎓 Study Studio Workspace Button */}
        <button
          onClick={onToggleDocWorkspace}
          className={`p-2.5 rounded-2xl transition-all cursor-pointer holographic-toggle ${
            isDocWorkspaceOpen
              ? 'bg-cyan-600/30 border border-cyan-400 text-cyan-200'
              : 'bg-white/5 border border-white/10 text-zinc-300 hover:text-cyan-400 hover:border-cyan-400/40'
          }`}
          title="🎓 Study Studio AI Workspace"
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

        {/* Right System Settings Drawer Toggle */}
        <button
          onClick={onOpenRightDrawer}
          className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-zinc-300 hover:text-[#9B5DE5] hover:border-[#9B5DE5]/40 transition-all cursor-pointer holographic-toggle"
          title="Themes & System Drawer"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
