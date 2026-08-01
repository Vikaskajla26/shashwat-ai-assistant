import React, { useState, useRef } from 'react';
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
  MicOff,
} from 'lucide-react';
import { AssistantState } from '../types';
import { getStateTheme } from '../theme/aiState';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = getStateTheme(state);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedText.trim() && onSendTypedText) {
      onSendTypedText(typedText.trim());
      setTypedText('');
    }
  };

  const isActive = state !== 'disconnected';
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isThinking = state === 'reasoning' || state === 'understanding' || state === 'searching';

  // Derive mic button glow color from StateTheme
  const micAccent = theme.hudAccent;
  const micGlowAlpha = isListening ? 0.6 : isSpeaking ? 0.45 : isThinking ? 0.35 : 0;

  const micGlow =
    micGlowAlpha > 0
      ? `0 0 24px ${micAccent}${Math.round(micGlowAlpha * 255).toString(16).padStart(2, '0')}, 0 0 48px ${micAccent}22`
      : 'none';

  return (
    <footer
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none"
      style={{ width: 'min(640px, calc(100vw - 32px))' }}
    >
      {/* ── Floating Glass Dock Container ── */}
      <div
        className="glass-dock rounded-[28px] px-3 py-2.5 flex items-center gap-2"
        style={{ transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* ── LEFT CLUSTER ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Memory & Workspaces */}
          <button
            className="dock-btn w-9 h-9"
            data-tip="Memory"
            onClick={onOpenLeftDrawer}
          >
            <Brain className="w-4 h-4" />
          </button>

          {/* Screen Share */}
          <button
            className={`dock-btn w-9 h-9 ${isScreenSharing ? 'active' : ''}`}
            data-tip={isScreenSharing ? 'Stop Share' : 'Screen Share'}
            onClick={onToggleScreenShare}
            style={
              isScreenSharing
                ? { borderColor: '#10B981', color: '#10B981', boxShadow: '0 0 16px #10B98140' }
                : {}
            }
          >
            {isScreenSharing
              ? <MonitorOff className="w-4 h-4" />
              : <Monitor className="w-4 h-4" />}
          </button>

          {/* AI Sandbox Browser */}
          <button
            className={`dock-btn w-9 h-9 ${isSandboxOpen ? 'active' : ''}`}
            data-tip="AI Sandbox"
            onClick={onToggleSandbox}
            style={
              isSandboxOpen
                ? { borderColor: '#38BDF8', color: '#38BDF8', boxShadow: '0 0 16px #38BDF840' }
                : {}
            }
          >
            <Globe className="w-4 h-4" />
          </button>

          {/* Study Studio */}
          <button
            className={`dock-btn w-9 h-9 ${isDocWorkspaceOpen ? 'active' : ''}`}
            data-tip="Study Studio"
            onClick={onToggleDocWorkspace}
            style={
              isDocWorkspaceOpen
                ? { borderColor: '#06B6D4', color: '#06B6D4', boxShadow: '0 0 16px #06B6D440' }
                : {}
            }
          >
            <FileSearch className="w-4 h-4" />
          </button>
        </div>

        {/* ── VERTICAL DIVIDER ── */}
        <div className="w-px h-6 bg-white/10 shrink-0 mx-0.5" />

        {/* ── COMMAND INPUT ── */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex items-center gap-2 min-w-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder={
              isListening
                ? 'Listening...'
                : isSpeaking
                ? 'Speaking...'
                : 'Ask शाश्वत anything...'
            }
            className="w-full bg-transparent text-white/80 placeholder-white/25 font-sans text-sm px-2 py-1 outline-none tracking-wide"
            style={{ fontFamily: 'var(--font-ui)' }}
          />

          {typedText.trim() && (
            <button
              type="submit"
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
              style={{
                background: micAccent,
                boxShadow: `0 0 14px ${micAccent}80`,
              }}
            >
              <Send className="w-3 h-3 text-black" strokeWidth={2.5} />
            </button>
          )}
        </form>

        {/* ── VERTICAL DIVIDER ── */}
        <div className="w-px h-6 bg-white/10 shrink-0 mx-0.5" />

        {/* ── RIGHT CLUSTER ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sanskrit Studio */}
          {onOpenSanskritStudio && (
            <button
              className="dock-btn w-9 h-9"
              data-tip="Sanskrit Studio"
              onClick={onOpenSanskritStudio}
              style={{ color: '#F59E0B' }}
            >
              <Brain className="w-4 h-4" />
            </button>
          )}

          {/* Self Learning */}
          {onOpenSelfLearning && (
            <button
              className="dock-btn w-9 h-9"
              data-tip="Self Learning"
              onClick={onOpenSelfLearning}
              style={{ color: '#A78BFA' }}
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}

          {/* ── CENTRAL POWER / MIC BUTTON ── */}
          <button
            id="shashwat-power-control-button"
            onClick={onToggleMic}
            className="dock-btn w-10 h-10 shrink-0"
            data-tip={!isActive ? 'Awaken शाश्वत' : isListening ? 'Listening...' : 'Microphone'}
            style={{
              background: isActive
                ? `linear-gradient(135deg, ${micAccent}22, ${micAccent}11)`
                : 'rgba(255,255,255,0.05)',
              borderColor: isActive ? `${micAccent}88` : 'rgba(255,255,255,0.10)',
              color: isActive ? micAccent : 'rgba(255,255,255,0.45)',
              boxShadow: micGlow,
              transform: isListening ? 'scale(1.08)' : 'scale(1)',
              transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          >
            {!isActive ? (
              <Power className="w-4 h-4" />
            ) : isListening ? (
              <Mic className="w-4 h-4" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
          </button>

          {/* Settings */}
          <button
            className="dock-btn w-9 h-9"
            data-tip="Settings"
            onClick={onOpenRightDrawer}
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};
