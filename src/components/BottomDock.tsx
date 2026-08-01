import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Power,
  Monitor,
  MonitorOff,
  Globe,
  FileSearch,
  Sparkles,
  Sliders,
  Send,
  Mic,
  MicOff,
  Brain,
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

const IDLE_TIMEOUT_MS = 8_000; // 8 s idle → gentle fade

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
  const [isIdle, setIsIdle] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const theme = getStateTheme(state);
  const isActive = state !== 'disconnected';
  const isListening = state === 'listening';

  // ── Mic button accent from state theme ──
  const micAccent = theme.hudAccent;
  const micGlowAlpha = isListening ? 0.55 : state === 'speaking' ? 0.40 : state === 'reasoning' ? 0.30 : 0;
  const micGlow =
    micGlowAlpha > 0
      ? `0 0 20px ${micAccent}${Math.round(micGlowAlpha * 255).toString(16).padStart(2, '0')}, 0 0 40px ${micAccent}18`
      : 'none';

  // ── Idle detection: fade dock after 8 s with no pointer/key activity ──
  const resetIdle = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    const events: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown', 'wheel'];
    events.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));
    resetIdle(); // Start timer on mount
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedText.trim() && onSendTypedText) {
      onSendTypedText(typedText.trim());
      setTypedText('');
    }
  };

  return (
    /*
     * ── OUTER POSITIONER ──────────────────────────────────────────────
     * position:fixed keeps the dock pinned even during scroll.
     * left:50% + translateX(-50%) = perfect horizontal centering.
     * This is the ONLY transform ever applied to this element.
     * It NEVER changes in response to mouse movement.
     * ─────────────────────────────────────────────────────────────────
     */
    <footer
      className="fixed bottom-6 left-1/2 z-30 pointer-events-auto select-none"
      style={{
        transform: 'translateX(-50%)',
        width: 'min(640px, calc(100vw - 32px))',
        // No transition on transform — position is immutable
      }}
      aria-label="Shashwat command dock"
    >
      {/* ── GLASS DOCK CONTAINER ── */}
      <div
        ref={dockRef}
        className={`glass-dock rounded-[28px] px-3 py-2.5 flex items-center gap-2${isIdle ? ' dock-idle' : ''}`}
        onPointerEnter={resetIdle}
      >
        {/* ── LEFT CLUSTER ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Memory / Workspace drawer */}
          <button
            className="dock-btn w-9 h-9"
            data-tip="Memory"
            onClick={onOpenLeftDrawer}
          >
            <Brain className="w-4 h-4" />
          </button>

          {/* Screen Share */}
          <button
            className={`dock-btn w-9 h-9${isScreenSharing ? ' active' : ''}`}
            data-tip={isScreenSharing ? 'Stop Share' : 'Screen Share'}
            onClick={onToggleScreenShare}
            style={isScreenSharing ? { borderColor: '#10B981', color: '#10B981', boxShadow: '0 0 14px #10B98135' } : {}}
          >
            {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          </button>

          {/* AI Sandbox Browser */}
          <button
            className={`dock-btn w-9 h-9${isSandboxOpen ? ' active' : ''}`}
            data-tip="AI Sandbox"
            onClick={onToggleSandbox}
            style={isSandboxOpen ? { borderColor: '#38BDF8', color: '#38BDF8', boxShadow: '0 0 14px #38BDF835' } : {}}
          >
            <Globe className="w-4 h-4" />
          </button>

          {/* Study Studio */}
          <button
            className={`dock-btn w-9 h-9${isDocWorkspaceOpen ? ' active' : ''}`}
            data-tip="Study Studio"
            onClick={onToggleDocWorkspace}
            style={isDocWorkspaceOpen ? { borderColor: '#06B6D4', color: '#06B6D4', boxShadow: '0 0 14px #06B6D435' } : {}}
          >
            <FileSearch className="w-4 h-4" />
          </button>
        </div>

        {/* ── VERTICAL DIVIDER ── */}
        <div className="w-px h-6 bg-white/10 shrink-0 mx-0.5" />

        {/* ── COMMAND INPUT ── */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2 min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            onFocus={resetIdle}
            placeholder={
              isListening ? 'Listening…'
              : state === 'speaking' ? 'Speaking…'
              : 'Ask शाश्वत anything…'
            }
            className="w-full bg-transparent text-white/80 placeholder-white/22 text-sm px-2 py-1 outline-none"
            style={{ fontFamily: 'var(--font-ui)', letterSpacing: '0.01em' }}
          />

          {typedText.trim() && (
            <button
              type="submit"
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: micAccent,
                boxShadow: `0 0 12px ${micAccent}70`,
                transition: 'transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.08)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
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
            data-tip={!isActive ? 'Awaken शाश्वत' : isListening ? 'Listening…' : 'Microphone'}
            style={{
              background: isActive
                ? `linear-gradient(135deg, ${micAccent}1E, ${micAccent}0D)`
                : 'rgba(255,255,255,0.05)',
              borderColor: isActive ? `${micAccent}77` : 'rgba(255,255,255,0.10)',
              color: isActive ? micAccent : 'rgba(255,255,255,0.45)',
              boxShadow: micGlow,
              /* Scale only — handled by .dock-btn CSS, no extra transition needed */
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
