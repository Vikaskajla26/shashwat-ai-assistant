import React from 'react';
import { Settings, Monitor, MonitorOff, PhoneOff, ShieldCheck, FileSearch, Sparkles } from 'lucide-react';
import { AssistantState, AssistantMood } from '../types';

interface AssistantHeaderProps {
  state: AssistantState;
  mood: AssistantMood;
  speakerStatus?: { status: string; confidence: number; ownerName: string };
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
  onDisconnect?: () => void;
  onOpenTranscript: () => void;
  onOpenSettings: () => void;
  onOpenEnrollment?: () => void;
  onOpenDocWorkspace?: () => void;
}

const moodLabels: Record<AssistantMood, string> = {
  witty: 'Witty & Charming',
  playful: 'Playful & Energetic',
  focused: 'Focused & Analytical',
  charming: 'Warm Companion',
  energetic: 'High Octane Mode',
};

export const AssistantHeader: React.FC<AssistantHeaderProps> = ({
  state,
  mood,
  speakerStatus,
  isScreenSharing = false,
  onToggleScreenShare,
  onDisconnect,
  onOpenSettings,
  onOpenEnrollment,
  onOpenDocWorkspace,
}) => {
  const moodLabel = moodLabels[mood] || 'Witty & Charming';

  const statusText =
    state === 'disconnected'
      ? 'STANDBY'
      : state === 'connecting'
      ? 'CONNECTING'
      : state === 'listening'
      ? 'LISTENING'
      : 'ACTIVE';

  const voiceBadgeColor =
    speakerStatus?.status === 'VERIFIED_OWNER'
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
      : speakerStatus?.status === 'LIKELY_OWNER'
      ? 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10'
      : speakerStatus?.status === 'UNKNOWN_SPEAKER'
      ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
      : 'text-zinc-400 border-white/10 bg-white/5';

  const voiceText =
    speakerStatus?.status === 'VERIFIED_OWNER'
      ? `OWNER: ${speakerStatus.ownerName.toUpperCase()}`
      : speakerStatus?.status === 'LIKELY_OWNER'
      ? `LIKELY: ${speakerStatus.ownerName.toUpperCase()}`
      : speakerStatus?.status === 'UNKNOWN_SPEAKER'
      ? 'GUEST_MODE (LOCKED)'
      : 'UNENROLLED';

  return (
    <header className="w-full z-30 px-6 py-5 sm:px-10 flex items-center justify-between bg-gradient-to-b from-[#05070D]/90 via-[#0B0F1A]/50 to-transparent pointer-events-auto border-b border-white/5 backdrop-blur-md">
      {/* Top Status Bar (System Intelligence Panel) */}
      <div className="flex items-center space-x-6 font-mono text-[11px] tracking-[0.18em] uppercase">
        <div className="flex flex-col gap-0.5">
          <span className="text-zinc-500 font-normal">OBJECT ID</span>
          <span className="text-[#00E0FF] font-bold">SHAASHVAT-NODE-9</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-zinc-500 font-normal">STATUS</span>
          <span className="text-white font-semibold flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                state === 'disconnected' ? 'bg-zinc-600' : 'bg-[#00E0FF] shadow-[0_0_10px_#00E0FF] animate-pulse'
              }`}
            />
            {statusText}
          </span>
        </div>

        {/* Wake Word Indicator */}
        <div className="hidden sm:flex flex-col gap-0.5">
          <span className="text-zinc-500 font-normal">WAKE WORD</span>
          <span className="text-[#A78BFA] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-ping" />
            "SHASHWAT"
          </span>
        </div>

        {/* Speaker Verification Badge */}
        <div className="hidden lg:flex flex-col gap-0.5">
          <span className="text-zinc-500 font-normal">SPEAKER ID</span>
          <span className={`font-semibold flex items-center gap-1.5 ${voiceBadgeColor.split(' ')[0]}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {voiceText}
          </span>
        </div>
      </div>

      {/* Top Right Controls (Pill-shaped Glowing Buttons) */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Share Screen Pill */}
        {onToggleScreenShare && (
          <button
            onClick={onToggleScreenShare}
            className={`pill-btn ${isScreenSharing ? 'active !border-emerald-400 !text-emerald-300' : ''}`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share (Visual Assistant)'}
          >
            {isScreenSharing ? <MonitorOff className="w-3.5 h-3.5 text-emerald-400" /> : <Monitor className="w-3.5 h-3.5 text-[#00E0FF]" />}
            <span className="hidden sm:inline">{isScreenSharing ? 'STOP SHARE' : 'SHARE SCREEN'}</span>
          </button>
        )}

        {/* System Mode (Mood) Pill */}
        <button
          onClick={onOpenSettings}
          className="pill-btn !border-[#A78BFA]/40 !text-[#A78BFA] hover:!bg-[#A78BFA]/20"
          title="Change Assistant Mood & System Settings"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
          <span className="hidden lg:inline">{moodLabel}</span>
        </button>

        {/* Docs / Intelligence Workspace Pill */}
        {onOpenDocWorkspace && (
          <button
            onClick={onOpenDocWorkspace}
            className="pill-btn !border-[#22D3EE]/40 !text-[#22D3EE] hover:!bg-[#22D3EE]/20"
            title="Open Document Intelligence & AI Research Workspace"
          >
            <FileSearch className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span className="hidden sm:inline">DOCS INTEL</span>
          </button>
        )}

        {/* Voice ID Pill */}
        {onOpenEnrollment && (
          <button
            onClick={onOpenEnrollment}
            className="pill-btn !border-[#FF4D8D]/40 !text-[#FF4D8D] hover:!bg-[#FF4D8D]/20"
            title="Voice Biometrics & Enrollment"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#FF4D8D]" />
            <span className="hidden sm:inline">VOICE ID</span>
          </button>
        )}

        {/* Settings Icon Pill */}
        <button
          onClick={onOpenSettings}
          className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:border-[#00E0FF] hover:bg-[#00E0FF]/15 text-zinc-300 hover:text-[#00E0FF] transition-all cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Disconnect Pill */}
        {state !== 'disconnected' && onDisconnect && (
          <button
            onClick={onDisconnect}
            className="pill-btn !border-rose-500 !bg-rose-600/30 !text-rose-200 animate-pulse hover:!bg-rose-600/50"
            title="Disconnect Live Session"
          >
            <PhoneOff className="w-3.5 h-3.5 text-rose-300" />
            <span className="inline">DISCONNECT</span>
          </button>
        )}
      </div>
    </header>
  );
};
