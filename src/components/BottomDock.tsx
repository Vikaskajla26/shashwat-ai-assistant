import React, { useState } from 'react';
import {
  Power,
  Monitor,
  MonitorOff,
  Globe,
  FileSearch,
  Brain,
  Sparkles,
  Sliders,
  Send,
  Mic,
  Command,
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
  onOpenSanskritStudio?: () => void;
  onOpenSelfLearning?: () => void;
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
  onOpenSanskritStudio,
  onOpenSelfLearning,
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
      ? 'border-white/15 text-zinc-400 bg-white/5 hover:border-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
      : state === 'connecting'
      ? 'border-amber-400/80 text-amber-300 bg-amber-500/15 shadow-[0_0_25px_rgba(245,158,11,0.5)] animate-pulse'
      : state === 'listening'
      ? 'border-rose-500/80 text-rose-300 bg-rose-500/20 shadow-[0_0_25px_rgba(244,63,94,0.6)] animate-pulse'
      : state === 'speaking'
      ? 'border-orange-500/80 text-orange-300 bg-orange-500/20 shadow-[0_0_25px_rgba(249,115,22,0.6)] animate-pulse'
      : 'border-indigo-500/80 text-indigo-300 bg-indigo-500/20 shadow-[0_0_25px_rgba(99,102,241,0.5)]';

  return (
    <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-full max-w-2xl px-4 select-none">
      {/* Vision Pro & Nothing OS Floating Glass Dock */}
      <div className="flex items-center gap-3 p-2.5 px-4 rounded-full bg-slate-950/70 border border-white/15 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] ring-1 ring-white/10 hover:border-white/25 transition-all">
        {/* Left Workspace Drawer Button */}
        <button
          onClick={onOpenLeftDrawer}
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Memory & Knowledge Vault"
        >
          <Brain className="w-4 h-4 text-purple-400" />
        </button>

        {/* Command Input Field */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative w-full flex items-center">
            <Command className="absolute left-3 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Ask शाश्वत or type command..."
              className="w-full bg-slate-900/60 border border-white/10 rounded-full text-white placeholder-zinc-500 font-sans text-xs pl-8 pr-10 py-2 outline-none focus:border-indigo-500/50 transition-all"
            />
            {typedText.trim() && (
              <button
                type="submit"
                className="absolute right-1.5 p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition-all cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                title="Send Command"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* Screen Share Action Button */}
        <button
          onClick={onToggleScreenShare}
          className={`p-2.5 rounded-full transition-all cursor-pointer border hover:scale-105 active:scale-95 ${
            isScreenSharing
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
              : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/15'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
        >
          {isScreenSharing ? <MonitorOff className="w-4 h-4 text-emerald-400" /> : <Monitor className="w-4 h-4" />}
        </button>

        {/* AI Sandbox Browser Workspace Button */}
        <button
          onClick={onToggleSandbox}
          className={`p-2.5 rounded-full transition-all cursor-pointer border hover:scale-105 active:scale-95 ${
            isSandboxOpen
              ? 'bg-blue-600/30 border-blue-400 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.5)]'
              : 'bg-white/5 border-white/10 text-zinc-400 hover:text-blue-400 hover:bg-white/15'
          }`}
          title="Autonomous AI Sandbox Browser"
        >
          <Globe className="w-4 h-4" />
        </button>

        {/* Document Intelligence Research Workspace Button */}
        <button
          onClick={onToggleDocWorkspace}
          className={`p-2.5 rounded-full transition-all cursor-pointer border hover:scale-105 active:scale-95 ${
            isDocWorkspaceOpen
              ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
              : 'bg-white/5 border-white/10 text-zinc-400 hover:text-cyan-400 hover:bg-white/15'
          }`}
          title="Study Studio"
        >
          <FileSearch className="w-4 h-4" />
        </button>

        {/* Sanskrit Chant Intelligence Studio Button */}
        {onOpenSanskritStudio && (
          <button
            onClick={onOpenSanskritStudio}
            className="p-2.5 rounded-full transition-all cursor-pointer border bg-white/5 border-white/10 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 hover:border-amber-400/40 hover:scale-105 active:scale-95"
            title="Sanskrit Chant Intelligence Studio"
          >
            <Brain className="w-4 h-4" />
          </button>
        )}

        {/* Self Learning Engine Button */}
        {onOpenSelfLearning && (
          <button
            onClick={onOpenSelfLearning}
            className="p-2.5 rounded-full transition-all cursor-pointer border bg-white/5 border-white/10 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 hover:border-purple-400/40 hover:scale-105 active:scale-95"
            title="Self Learning Engine"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}

        {/* Power / Microphone Central Action Button */}
        <button
          id="shashwat-power-control-button"
          onClick={onToggleMic}
          className={`p-3 rounded-full border backdrop-blur-xl transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer ${powerStateStyles}`}
          title={state === 'disconnected' ? 'Awaken शाश्वत' : 'Power Control'}
        >
          {state === 'disconnected' ? <Power className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Right Settings Drawer Button */}
        <button
          onClick={onOpenRightDrawer}
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Settings & AI Providers"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
