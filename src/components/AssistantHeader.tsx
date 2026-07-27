import React from 'react';
import { Settings, Monitor, MonitorOff, PhoneOff } from 'lucide-react';
import { AssistantState, AssistantMood } from '../types';

interface AssistantHeaderProps {
  state: AssistantState;
  mood: AssistantMood;
  isScreenSharing?: boolean;
  onToggleScreenShare?: () => void;
  onDisconnect?: () => void;
  onOpenTranscript: () => void;
  onOpenSettings: () => void;
}

const moodLabels: Record<AssistantMood, string> = {
  witty: 'Witty & Charming System',
  playful: 'Playful & Fun System',
  focused: 'Focused & Smart System',
  charming: 'Charming Companion System',
  energetic: 'High Energy System',
};

export const AssistantHeader: React.FC<AssistantHeaderProps> = ({
  state,
  mood,
  isScreenSharing = false,
  onToggleScreenShare,
  onDisconnect,
  onOpenSettings,
}) => {
  const moodLabel = moodLabels[mood] || 'Witty & Charming System';

  const statusText =
    state === 'disconnected'
      ? 'STANDBY_MODE'
      : state === 'connecting'
      ? 'CONNECTING_NODE'
      : state === 'listening'
      ? 'LISTENING_MODE'
      : 'TRANSMITTING_VOICE';

  return (
    <header className="w-full z-30 px-6 py-6 sm:px-12 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
      {/* Status Container */}
      <div className="flex items-center space-x-6 font-mono text-[11px] tracking-[0.2em] uppercase">
        <div className="flex flex-col gap-0.5">
          <span className="text-zinc-500 font-normal">OBJECT.ID</span>
          <span className="text-blue-400 font-semibold">SHASHWAT_01</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-zinc-500 font-normal">STATUS</span>
          <span className="text-white font-semibold flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                state === 'disconnected' ? 'bg-zinc-600' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            {statusText}
          </span>
        </div>

        {/* Screen Share Active Indicator */}
        {isScreenSharing && (
          <div className="hidden md:flex flex-col gap-0.5 animate-pulse">
            <span className="text-emerald-500 font-normal">VISION</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              SCREEN_SHARE_ACTIVE
            </span>
          </div>
        )}

        {/* Wake Word Hands-Free Active Indicator */}
        <div className="hidden sm:flex flex-col gap-0.5">
          <span className="text-zinc-500 font-normal">WAKE WORD</span>
          <span className="text-blue-300 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            "शाश्वत / SHASHWAT"
          </span>
        </div>
      </div>

      {/* Controls & Badges */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Screen Share Toggle Button */}
        {onToggleScreenShare && (
          <button
            id="shashwat-screenshare-toggle"
            onClick={onToggleScreenShare}
            className={`px-3 py-2 rounded text-[10px] font-mono font-bold tracking-wider uppercase border flex items-center gap-2 transition-all cursor-pointer ${
              isScreenSharing
                ? 'bg-rose-500/20 border-rose-500/80 text-rose-300 hover:bg-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'bg-white/5 border-white/10 text-zinc-300 hover:border-blue-400/50 hover:bg-white/10'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share (Visual Assistant)'}
          >
            {isScreenSharing ? (
              <>
                <MonitorOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="inline">STOP SCREEN SHARE</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">SHARE SCREEN</span>
              </>
            )}
          </button>
        )}

        {/* Explicit Session Disconnect Button in Header when connected */}
        {state !== 'disconnected' && onDisconnect && (
          <button
            id="shashwat-disconnect-header-button"
            onClick={onDisconnect}
            className="px-3 py-2 rounded text-[10px] font-mono font-bold tracking-wider uppercase border border-rose-500/80 bg-rose-600/30 text-rose-200 hover:bg-rose-600/50 hover:border-rose-400 transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(225,29,72,0.4)] animate-pulse"
            title="Disconnect Live Session"
          >
            <PhoneOff className="w-3.5 h-3.5 text-rose-300" />
            <span className="inline">DISCONNECT</span>
          </button>
        )}

        <div className="hidden lg:block px-3.5 py-1.5 rounded-[2px] border border-blue-500/80 bg-blue-500/10 text-[10px] font-bold tracking-[0.1em] text-blue-400 uppercase font-mono">
          {moodLabel}
        </div>

        <button
          id="shashwat-settings-toggle"
          onClick={onOpenSettings}
          className="w-10 h-10 rounded bg-white/5 border border-white/10 hover:border-white/40 hover:bg-white/10 text-zinc-300 hover:text-white transition-all flex items-center justify-center cursor-pointer"
          title="Settings & Tools"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};


