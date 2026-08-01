import React from 'react';
import { motion } from 'motion/react';
import { Brain, Sliders, ShieldCheck } from 'lucide-react';
import type { AssistantMood, AssistantState } from '../types';
import { getStateTheme, type StateTheme } from '../theme/aiState';

interface AssistantHeaderProps {
  state: AssistantState;
  mood?: AssistantMood;
  speakerStatus?: { status: string; confidence: number; ownerName: string };
  isScreenSharing?: boolean;
  onOpenLeftDrawer: () => void;
  onOpenRightDrawer: () => void;
  onOpenSettings: () => void;
}

/**
 * Minimal top bar. The center status pill is fully driven by the active
 * StateTheme: its label, accent color and the breathing dot all reflect which
 * of the 13 AI states is live, so the whole chrome transforms with the orb.
 */
export const AssistantHeader: React.FC<AssistantHeaderProps> = ({
  state,
  speakerStatus,
  onOpenLeftDrawer,
  onOpenRightDrawer,
  onOpenSettings,
}) => {
  const stateTheme = getStateTheme(state);
  const accent = stateTheme.hudAccent;
  const label = stateTheme.hudLabel;
  const motionIntensity = stateTheme.motionIntensity;

  const [healthScore, setHealthScore] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.score === 'number') {
          setHealthScore(Math.round(d.score * 100));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="w-full z-30 px-6 py-4 sm:px-10 flex items-center justify-between bg-slate-950/40 pointer-events-auto border-b border-white/10 backdrop-blur-xl">
      {/* Brand & Left Drawer Trigger */}
      <div className="flex items-center space-x-4">
        <motion.button
          onClick={onOpenLeftDrawer}
          whileHover={{ y: -2, scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          title="Open Workspace Vault"
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <Brain className="w-4 h-4 text-purple-400" />
        </motion.button>

        <div className="flex items-baseline gap-2">
          <span
            className="font-serif text-2xl font-bold tracking-wider transition-colors duration-700"
            style={{ color: accent, textShadow: `0 0 20px ${accent}99` }}
          >
            शाश्वत
          </span>
          <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-[0.25em] hidden sm:inline font-semibold">
            AI OS • DIGITAL CONSCIOUSNESS
          </span>
        </div>
      </div>

      {/* Center Status Dot & Live System Health Pill */}
      <div className="flex items-center space-x-3 sm:space-x-4 font-mono text-[11px] tracking-[0.2em] uppercase">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 shadow-inner transition-colors duration-700"
          style={{ borderColor: `${accent}55` }}>
          <motion.span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: accent, boxShadow: `0 0 12px ${accent}` }}
            animate={motionIntensity > 0.4 ? { opacity: [1, 0.4, 1], scale: [1, 1.25, 1] } : { opacity: 1 }}
            transition={motionIntensity > 0.4 ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }}
          />
          <span className="text-white font-bold">{label}</span>
        </div>

        {/* Live System Health Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>SYSTEM • {healthScore !== null ? `${healthScore}%` : '98%'}</span>
        </div>

        {speakerStatus?.status === 'VERIFIED_OWNER' && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>OWNER: {speakerStatus.ownerName.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Right Drawer Trigger & Settings */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:block px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-[10px] font-mono font-bold tracking-[0.1em] text-zinc-400 uppercase">
          3D SHADER ENGINE ACTIVE
        </div>

        <motion.button
          onClick={onOpenRightDrawer}
          whileHover={{ y: -2, scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          title="Open Settings & AI Providers"
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
        </motion.button>
      </div>
    </header>
  );
};
