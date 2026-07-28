import React from 'react';
import { Settings, Activity, Radio } from 'lucide-react';
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
  onOpenSettings,
}) => {
  const isOnline = state !== 'disconnected';

  return (
    <header className="w-full z-30 px-8 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md pointer-events-auto">
      {/* Header Metadata Groups (IDENTIFIER, STATE) */}
      <div className="meta-group">
        <div className="meta-item">
          <div className="label">IDENTIFIER</div>
          <div className="value flex items-center gap-2 text-white">
            SHA-2040-V4
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#ff2d55]/20 border border-[#ff2d55]/40 text-[#ff2d55]">
              V.4 PRO
            </span>
          </div>
        </div>

        <div className="meta-item hidden sm:block">
          <div className="label">STATE</div>
          <div className="value text-white flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#ff2d55] animate-ping' : 'bg-zinc-600'}`} />
            {isOnline ? 'ONLINE / STREAMING' : 'STANDBY'}
          </div>
        </div>
      </div>

      {/* Header Nav Actions */}
      <div className="nav-actions">
        <button className="btn-ui font-mono">
          <Radio className="w-3.5 h-3.5 text-[#ff2d55]" />
          <span>LIVE STREAM</span>
        </button>

        <button onClick={onOpenSettings} className="btn-ui font-mono">
          <Settings className="w-3.5 h-3.5" />
          <span>SETTINGS</span>
        </button>
      </div>
    </header>
  );
};
