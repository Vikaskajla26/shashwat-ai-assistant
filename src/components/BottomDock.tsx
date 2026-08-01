import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Monitor,
  MonitorOff,
  Globe,
  FileSearch,
  Sparkles,
  Sliders,
  Send,
  Mic,
  MicOff,
  Power,
  PenTool,
  BookOpen,
  Code,
  Search,
  PlusCircle,
  BarChart2,
  Calendar,
  MoreHorizontal,
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

const IDLE_TIMEOUT_MS = 6_000;

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
  const [hoveredTip, setHoveredTip] = useState<string | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isIdle, setIsIdle] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const theme = getStateTheme(state);
  const isActive = state !== 'disconnected';
  const isListening = state === 'listening';

  const micAccent = theme.hudAccent;
  const micGlowAlpha = isListening ? 0.60 : state === 'speaking' ? 0.45 : state === 'reasoning' ? 0.35 : 0;
  const micGlow =
    micGlowAlpha > 0
      ? `0 0 24px ${micAccent}${Math.round(micGlowAlpha * 255).toString(16).padStart(2, '0')}, 0 0 45px ${micAccent}20`
      : 'none';

  // ── Idle Detection ──
  const resetIdle = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    const events: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown', 'wheel'];
    events.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));
    resetIdle();
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

  // Magnification scale calculation based on hover index proximity
  const getScale = (index: number) => {
    if (hoveredIdx === null) return 1;
    const distance = Math.abs(hoveredIdx - index);
    if (distance === 0) return 1.24;
    if (distance === 1) return 1.10;
    return 1;
  };

  return (
    <footer
      className="fixed bottom-6 left-1/2 z-30 pointer-events-auto select-none"
      style={{ transform: 'translateX(-50%)' }}
      aria-label="Shashwat floating command dock"
    >
      {/* ── VISION PRO FLOATING PILL TOOLTIP ── */}
      <AnimatePresence>
        {hoveredTip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium tracking-wide text-white/90 bg-[#0f111a]/85 border border-white/15 backdrop-blur-xl shadow-2xl whitespace-nowrap pointer-events-none"
          >
            {hoveredTip}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── GLASS DOCK CONTAINER ── */}
      <motion.div
        ref={dockRef}
        animate={{ opacity: isIdle ? 0.88 : 1 }}
        transition={{ duration: 0.6 }}
        className="relative rounded-[28px] p-2 flex items-center gap-2 bg-[#0c0d16]/70 border border-white/12 backdrop-blur-[36px] shadow-[0_24px_50px_rgba(0,0,0,0.65),0_0_30px_rgba(139,92,246,0.12)] before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent"
        onPointerEnter={resetIdle}
      >
        {/* ── LEFT CLUSTER (TOOLS) ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Write / Doc Studio */}
          <motion.button
            animate={{ scale: getScale(0) }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/15 transition-colors${isDocWorkspaceOpen ? ' text-amber-400 bg-amber-500/15 border-amber-500/30' : ''}`}
            onMouseEnter={() => { setHoveredIdx(0); setHoveredTip('Write & Docs'); }}
            onMouseLeave={() => { setHoveredIdx(null); setHoveredTip(null); }}
            onClick={onToggleDocWorkspace}
          >
            <PenTool className="w-4 h-4" />
          </motion.button>

          {/* AI Sandbox Browser */}
          <motion.button
            animate={{ scale: getScale(1) }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/15 transition-colors${isSandboxOpen ? ' text-sky-400 bg-sky-500/15 border-sky-500/30' : ''}`}
            onMouseEnter={() => { setHoveredIdx(1); setHoveredTip('AI Sandbox Browser'); }}
            onMouseLeave={() => { setHoveredIdx(null); setHoveredTip(null); }}
            onClick={onToggleSandbox}
          >
            <Globe className="w-4 h-4" />
          </motion.button>

          {/* Screen Share */}
          <motion.button
            animate={{ scale: getScale(2) }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/15 transition-colors${isScreenSharing ? ' text-emerald-400 bg-emerald-500/15 border-emerald-500/30' : ''}`}
            onMouseEnter={() => { setHoveredIdx(2); setHoveredTip(isScreenSharing ? 'Stop Share' : 'Screen Share'); }}
            onMouseLeave={() => { setHoveredIdx(null); setHoveredTip(null); }}
            onClick={onToggleScreenShare}
          >
            {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          </motion.button>
        </div>

        {/* ── DIVIDER ── */}
        <div className="w-px h-6 bg-white/10 shrink-0 mx-0.5" />

        {/* ── CENTER COMMAND SEARCH INPUT ── */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2 min-w-[200px] sm:min-w-[280px]">
          <input
            ref={inputRef}
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            onFocus={resetIdle}
            placeholder={
              isListening ? 'Listening to voice…'
              : state === 'speaking' ? 'Speaking…'
              : 'What shall we explore today?'
            }
            className="w-full bg-transparent text-white/90 placeholder-white/30 text-xs sm:text-sm px-3 py-1.5 outline-none font-sans"
          />

          {typedText.trim() && (
            <motion.button
              type="submit"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-black font-semibold shadow-lg"
              style={{ background: micAccent }}
            >
              <Send className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </form>

        {/* ── DIVIDER ── */}
        <div className="w-px h-6 bg-white/10 shrink-0 mx-0.5" />

        {/* ── RIGHT CLUSTER (CENTRAL ORB MIC & SYSTEM) ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sanskrit Studio */}
          {onOpenSanskritStudio && (
            <motion.button
              animate={{ scale: getScale(3) }}
              transition={{ type: 'spring', stiffness: 350, damping: 22 }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-amber-400 hover:bg-amber-500/15 border border-transparent hover:border-amber-500/30 transition-colors"
              onMouseEnter={() => { setHoveredIdx(3); setHoveredTip('Sanskrit Studio'); }}
              onMouseLeave={() => { setHoveredIdx(null); setHoveredTip(null); }}
              onClick={onOpenSanskritStudio}
            >
              <Brain className="w-4 h-4" />
            </motion.button>
          )}

          {/* ── CENTRAL GLOWING VOICE ORB BUTTON ── */}
          <motion.button
            id="shashwat-power-control-button"
            onClick={onToggleMic}
            animate={{ scale: getScale(4) * (isListening ? 1.06 : 1) }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            className="relative w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-colors overflow-hidden"
            onMouseEnter={() => { setHoveredIdx(4); setHoveredTip(!isActive ? 'Awaken Shashwat' : isListening ? 'Listening…' : 'Microphone'); }}
            onMouseLeave={() => { setHoveredIdx(null); setHoveredTip(null); }}
            style={{
              background: isActive
                ? `linear-gradient(135deg, ${micAccent}25, ${micAccent}10)`
                : 'rgba(255,255,255,0.06)',
              borderColor: isActive ? `${micAccent}88` : 'rgba(255,255,255,0.12)',
              color: isActive ? micAccent : 'rgba(255,255,255,0.45)',
              boxShadow: micGlow,
            }}
          >
            {!isActive ? (
              <Power className="w-4 h-4" />
            ) : isListening ? (
              <Mic className="w-4 h-4 animate-pulse" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
          </motion.button>

          {/* Memory / Left Drawer */}
          <motion.button
            animate={{ scale: getScale(5) }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/15 transition-colors"
            onMouseEnter={() => { setHoveredIdx(5); setHoveredTip('Memory Recall'); }}
            onMouseLeave={() => { setHoveredIdx(null); setHoveredTip(null); }}
            onClick={onOpenLeftDrawer}
          >
            <Sparkles className="w-4 h-4" />
          </motion.button>

          {/* Settings / Right Drawer */}
          <motion.button
            animate={{ scale: getScale(6) }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/15 transition-colors"
            onMouseEnter={() => { setHoveredIdx(6); setHoveredTip('System Settings'); }}
            onMouseLeave={() => { setHoveredIdx(null); setHoveredTip(null); }}
            onClick={onOpenRightDrawer}
          >
            <Sliders className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>
    </footer>
  );
};
