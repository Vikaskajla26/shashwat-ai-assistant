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
      : 'ACTIVE';

  const statusDotColor =
    state === 'disconnected'
      ? 'bg-zinc-600'
      : state === 'listening'
      ? 'bg-[#00E0FF] shadow-[0_0_10px_#00E0FF] animate-pulse'
      : state === 'speaking'
      ? 'bg-[#FF4D8D] shadow-[0_0_10px_#FF4D8D] animate-ping'
      : 'bg-[#A78BFA] animate-pulse';

  return (
    <header className="w-full z-30 px-6 py-5 sm:px-10 flex items-center justify-between bg-transparent pointer-events-auto border-b border-white/5 backdrop-blur-md">
      {/* Brand & Left Drawer Trigger */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onOpenLeftDrawer}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#00E0FF] text-zinc-300 hover:text-[#00E0FF] transition-all cursor-pointer"
          title="Open Workspace & History Drawer"
        >
          <Brain className="w-4 h-4" />
        </button>

        <div className="flex items-baseline gap-2">
          <span className="font-serif text-2xl font-bold text-[#00E0FF] tracking-wider text-shadow-[0_0_20px_rgba(0,224,255,0.6)]">
            शाश्वत
          </span>
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-[0.25em] hidden sm:inline">
            DIGITAL CONSCIOUSNESS
          </span>
        </div>
      </div>

      {/* Center Status Dot */}
      <div className="flex items-center space-x-6 font-mono text-[11px] tracking-[0.2em] uppercase">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          <span className={`w-2 h-2 rounded-full ${statusDotColor}`} />
          <span className="text-white font-bold">{statusText}</span>
        </div>

        {speakerStatus?.status === 'VERIFIED_OWNER' && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>OWNER: {speakerStatus.ownerName.toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Right Drawer Trigger & Settings */}
      <div className="flex items-center gap-3">
        <div className="hidden lg:block px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-[10px] font-mono font-bold tracking-[0.1em] text-zinc-400 uppercase">
          gemini-3.1-flash-live-preview
        </div>

        <button
          onClick={onOpenRightDrawer}
          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#A78BFA] text-zinc-300 hover:text-[#A78BFA] transition-all cursor-pointer"
          title="Open Themes & Settings Drawer"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
