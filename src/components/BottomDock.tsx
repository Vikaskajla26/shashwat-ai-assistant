import React, { useState } from 'react';
import { motion } from 'motion/react';
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
import type { AssistantState } from '../types';
import { getStateTheme, type StateTheme } from '../theme/aiState';
import { DockButton } from './DockButton';

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

/**
 * Floating glass command dock (Vision Pro / Nothing OS).
 *
 * Frosted glass with layered shadows, hover elevation per tile (via DockButton),
 * an active-state glow bound to the live StateTheme accent, context-aware
 * tooltips, and a pointer-originated ripple on the central power control.
 */
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
  const stateTheme = getStateTheme(state);
  const accent = stateTheme.hudAccent;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedText.trim() && onSendTypedText) {
      onSendTypedText(typedText.trim());
      setTypedText('');
    }
  };

  const isConnected = state !== 'disconnected';
  const isSleeping = state === 'disconnected' || state === 'sleeping';

  return (
    <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-full max-w-2xl px-4 select-none">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 26, delay: 0.3 }}
        className="flex items-center gap-3 p-2.5 px-4 rounded-full bg-slate-950/60 border border-white/15 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/10 hover:border-white/25 transition-all"
      >
        {/* Left Workspace Drawer Button */}
        <DockButton onClick={onOpenLeftDrawer} title="Memory & Knowledge Vault">
          <Brain className="w-4 h-4 text-purple-400" />
        </DockButton>

        {/* Command Input Field */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative w-full flex items-center">
            <Command className="absolute left-3 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder={isSleeping ? 'Awaken शाश्वत to begin...' : 'Ask शाश्वत or type command...'}
              className="w-full bg-slate-900/60 border border-white/10 rounded-full text-white placeholder-zinc-500 font-sans text-xs pl-8 pr-10 py-2 outline-none focus:border-white/30 transition-all"
              style={isConnected ? { boxShadow: `inset 0 0 0 1px ${accent}22` } : undefined}
            />
            {typedText.trim() && (
              <motion.button
                type="submit"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Send Command"
                className="absolute right-1.5 p-1.5 rounded-full text-white transition-colors cursor-pointer"
                style={{ backgroundColor: accent, boxShadow: `0 0 15px ${accent}88` }}
              >
                <Send className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>
        </form>

        {/* Screen Share */}
        <DockButton
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
          active={isScreenSharing}
          activeGlow="0 0 20px rgba(52,211,153,0.45)"
          activeClassName="bg-emerald-500/20 border-emerald-400 text-emerald-300"
          iconClassName={isScreenSharing ? 'text-emerald-300' : 'text-zinc-400'}
        >
          {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
        </DockButton>

        {/* AI Sandbox Browser */}
        <DockButton
          onClick={onToggleSandbox}
          title="Autonomous AI Sandbox Browser"
          active={isSandboxOpen}
          activeGlow="0 0 20px rgba(59,130,246,0.5)"
          activeClassName="bg-blue-600/30 border-blue-400 text-blue-200"
          iconClassName={isSandboxOpen ? 'text-blue-200' : 'text-zinc-400'}
        >
          <Globe className="w-4 h-4" />
        </DockButton>

        {/* Document Intelligence Workspace */}
        <DockButton
          onClick={onToggleDocWorkspace}
          title="Study Studio"
          active={isDocWorkspaceOpen}
          activeGlow="0 0 20px rgba(6,182,212,0.5)"
          activeClassName="bg-cyan-600/30 border-cyan-400 text-cyan-200"
          iconClassName={isDocWorkspaceOpen ? 'text-cyan-200' : 'text-zinc-400'}
        >
          <FileSearch className="w-4 h-4" />
        </DockButton>

        {/* Sanskrit Chant Intelligence Studio */}
        {onOpenSanskritStudio && (
          <DockButton
            onClick={onOpenSanskritStudio}
            title="Sanskrit Chant Intelligence Studio"
            iconClassName="text-amber-400"
            className="hover:bg-amber-500/20 hover:border-amber-400/40"
          >
            <Brain className="w-4 h-4" />
          </DockButton>
        )}

        {/* Self Learning Engine */}
        {onOpenSelfLearning && (
          <DockButton
            onClick={onOpenSelfLearning}
            title="Self Learning Engine"
            iconClassName="text-purple-400"
            className="hover:bg-purple-500/20 hover:border-purple-400/40"
          >
            <Sparkles className="w-4 h-4" />
          </DockButton>
        )}

        {/* Power / Microphone Central Action Button */}
        <motion.button
          id="shashwat-power-control-button"
          onClick={onToggleMic}
          whileHover={{ scale: 1.12, y: -2 }}
          whileTap={{ scale: 0.92 }}
          title={isSleeping ? 'Awaken शाश्वत' : 'Power Control'}
          className="p-3 rounded-full border backdrop-blur-xl transition-all duration-300 cursor-pointer"
          style={{
            color: accent,
            backgroundColor: `${accent}1a`,
            borderColor: `${accent}88`,
            boxShadow: `0 0 25px ${accent}66`,
          }}
        >
          {isSleeping ? <Power className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </motion.button>

        {/* Right Settings Drawer Button */}
        <DockButton onClick={onOpenRightDrawer} title="Settings & AI Providers">
          <Sliders className="w-4 h-4 text-zinc-300" />
        </DockButton>
      </motion.div>
    </footer>
  );
};
