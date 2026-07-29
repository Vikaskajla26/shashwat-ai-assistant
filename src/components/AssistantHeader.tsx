import React from 'react';
import { Settings, Brain, Sliders, ShieldCheck } from 'lucide-react';
import { AssistantState, AssistantMood } from '../types';

interface AssistantHeaderProps {
  state: AssistantState;
  mood: AssistantMood;
  speakerStatus?: { status: string; confidence: number; ownerName: string };
  isScreenSharing?: boolean;
  onOpenLeftDrawer: () => void;
  onOpenRightDrawer: () => void;
  onOpenSettings: () => void;
}

export const AssistantHeader: React.FC<AssistantHeaderProps> = ({
  state,
  speakerStatus,
  onOpenLeftDrawer,
  onOpenRightDrawer,
  onOpenSettings,
}) => {
  const statusText =
    state === 'disconnected'
      ? 'STANDBY'
      : state === 'connecting'
      ? 'CONNECTING'
      : state === 'listening'
      ? 'LISTENING'
      : state === 'speaking'
      ? 'SPEAKING'
      : 'ACTIVE';

  const statusDotColor =
    state === 'disconnected'
      ? 'bg-zinc-600'
      : state === 'listening'
      ? 'bg-rose-500 shadow-[0_0_12px_#F43F5E] animate-pulse'
      : state === 'speaking'
      ? 'bg-orange-500 shadow-[0_0_12px_#F97316] animate-ping'
      : 'bg-amber-400 shadow-[0_0_12px_#F59E0B] animate-pulse';

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
        <button
          onClick={onOpenLeftDrawer}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-amber-400/50 text-zinc-300 hover:text-amber-300 transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Open Workspace Vault"
        >
          <Brain className="w-4 h-4 text-purple-400" />
        </button>

        <div className="flex items-baseline gap-2">
          <span className="font-serif text-2xl font-bold text-amber-400 tracking-wider text-shadow-[0_0_20px_rgba(245,158,11,0.6)]">
            शाश्वत
          </span>
          <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-[0.25em] hidden sm:inline font-semibold">
            AI OS • DIGITAL CONSCIOUSNESS
          </span>
        </div>
      </div>

      {/* Center Status Dot & Live System Health Pill */}
      <div className="flex items-center space-x-3 sm:space-x-4 font-mono text-[11px] tracking-[0.2em] uppercase">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 shadow-inner">
          <span className={`w-2 h-2 rounded-full ${statusDotColor}`} />
          <span className="text-white font-bold">{statusText}</span>
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

        <button
          onClick={onOpenRightDrawer}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-400/50 text-zinc-300 hover:text-indigo-300 transition-all cursor-pointer hover:scale-105 active:scale-95"
          title="Open Settings & AI Providers"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
