import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { AssistantState, AssistantMood } from '../types';
import { getStateTheme } from '../theme/aiState';

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
  const theme = getStateTheme(state);
  const [healthScore, setHealthScore] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.score === 'number') setHealthScore(Math.round(d.score * 100));
      })
      .catch(() => {});
  }, []);

  return (
    <header
      className="w-full z-30 px-6 py-4 sm:px-10 flex items-center justify-between pointer-events-auto"
      style={{
        background: 'linear-gradient(180deg, rgba(3,7,18,0.85) 0%, rgba(3,7,18,0) 100%)',
        backdropFilter: 'blur(0px)',
      }}
    >
      {/* ── Brand Mark ── */}
      <button
        onClick={onOpenLeftDrawer}
        className="flex items-center gap-3 group cursor-pointer"
        style={{ background: 'none', border: 'none', padding: 0 }}
      >
        {/* Sanskrit Wordmark */}
        <div className="flex flex-col items-start">
          <span
            className="text-xl font-bold tracking-wide leading-none transition-all duration-300"
            style={{
              fontFamily: 'var(--font-deva)',
              color: theme.hudAccent,
              textShadow: `0 0 24px ${theme.hudAccent}60`,
              transition: 'color 0.8s ease, text-shadow 0.8s ease',
            }}
          >
            शाश्वत
          </span>
          <span
            className="text-[9px] tracking-[0.28em] uppercase mt-0.5 opacity-40"
            style={{ fontFamily: 'var(--font-code)' }}
          >
            AI OPERATING SYSTEM
          </span>
        </div>
      </button>

      {/* ── Center: HUD State Pill ── */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        {/* State Pill */}
        <div
          className="hud-pill transition-all duration-700"
          style={{
            color: theme.hudAccent,
            borderColor: `${theme.hudAccent}40`,
            background: `${theme.hudAccent}0A`,
          }}
        >
          <span
            className="dot"
            style={{
              background: theme.hudAccent,
              boxShadow: `0 0 8px ${theme.hudAccent}`,
            }}
          />
          {theme.hudLabel}
        </div>

        {/* System Health */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/08 text-emerald-400 text-[9px] font-mono font-bold tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {healthScore !== null ? `${healthScore}%` : '—'}
        </div>
      </div>

      {/* ── Right: Speaker & Settings ── */}
      <div className="flex items-center gap-2">
        {/* Speaker Verified Badge */}
        {speakerStatus?.status === 'VERIFIED_OWNER' && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/08 border border-emerald-500/25 text-emerald-400 text-[9px] font-mono font-bold tracking-widest uppercase">
            <ShieldCheck className="w-3 h-3" />
            {speakerStatus.ownerName.toUpperCase()}
          </div>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.4)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.18)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.9)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)';
          }}
          title="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>
    </header>
  );
};
