import React, { useState } from 'react';
import {
  Mic,
  Monitor,
  MonitorOff,
  Globe,
  FileSearch,
  Brain,
  Sliders,
  MessageSquareText,
  Send,
} from 'lucide-react';
import { AssistantState } from '../types';

interface BottomDockProps {
  state: AssistantState;
  isScreenSharing: boolean;
  isSandboxOpen: boolean;
  isDocWorkspaceOpen: boolean;
  onToggleMic: () => void;
  onToggleScreenShare: () => void;
  onToggleSandbox: () => void;
  onToggleDocWorkspace: () => void;
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
  onOpenLeftDrawer,
  onOpenRightDrawer,
  onSendTypedText,
}) => {
  const [typedText, setTypedText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedText.trim() && onSendTypedText) {
      onSendTypedText(typedText.trim());
      setTypedText('');
    }
  };

  const isLive = state !== 'disconnected';

  return (
    <footer className="fixed bottom-0 left-0 right-0 bottom-ui pointer-events-auto">
      <div className="control-bar">
        {/* Memory / Transcript Drawer Toggle */}
        <button
          onClick={onOpenLeftDrawer}
          className="control-btn"
          title="Transcript & Workspaces"
        >
          <MessageSquareText className="w-4 h-4" />
        </button>

        {/* AI Sandbox Toggle */}
        <button
          onClick={onToggleSandbox}
          className={`control-btn ${isSandboxOpen ? 'active' : ''}`}
          title="Autonomous AI Sandbox Browser"
        >
          <Globe className="w-4 h-4" />
        </button>

        <div className="bar-separator" />

        {/* Glowing Main Microphone Trigger */}
        <button
          onClick={onToggleMic}
          className={`control-btn main-mic ${isLive ? 'active' : ''}`}
          title={isLive ? 'Mute / Disconnect' : 'Start Voice Engine'}
        >
          <Mic className="w-5 h-5" />
        </button>

        <div className="bar-separator" />

        {/* Study Studio / Document Research Toggle */}
        <button
          onClick={onToggleDocWorkspace}
          className={`control-btn ${isDocWorkspaceOpen ? 'active' : ''}`}
          title="Study Studio Workspace"
        >
          <FileSearch className="w-4 h-4" />
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={onToggleScreenShare}
          className={`control-btn ${isScreenSharing ? 'active' : ''}`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share'}
        >
          {isScreenSharing ? <MonitorOff className="w-4 h-4 text-[#ff2d55]" /> : <Monitor className="w-4 h-4" />}
        </button>

        {/* Settings Drawer Toggle */}
        <button
          onClick={onOpenRightDrawer}
          className="control-btn"
          title="System Settings & Themes"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
};
