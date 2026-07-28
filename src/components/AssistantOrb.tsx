import React from 'react';
import { AssistantState, AssistantMood } from '../types';
import { Orb, OrbStateType } from './orb';

interface AssistantOrbProps {
  state: AssistantState;
  mood: AssistantMood;
  inputVolume?: number;
  outputVolume?: number;
  volume?: number;
  isMuted?: boolean;
  onToggleConnection?: () => void;
  onToggleMute?: () => void;
  audioStream?: MediaStream | null;
}

export const AssistantOrb: React.FC<AssistantOrbProps> = ({
  state,
  audioStream = null,
}) => {
  // Map AssistantState ('disconnected' | 'connecting' | 'listening' | 'speaking') to OrbStateType
  const mapStateToOrbState = (appState: AssistantState): OrbStateType => {
    switch (appState) {
      case 'listening':
        return 'listening';
      case 'connecting':
        return 'thinking';
      case 'speaking':
        return 'speaking';
      case 'disconnected':
      default:
        return 'idle';
    }
  };

  const orbState = mapStateToOrbState(state);

  return (
    <div className="relative flex items-center justify-center w-[520px] h-[520px] max-w-full select-none">
      <Orb state={orbState} size={480} audioStream={audioStream} />
    </div>
  );
};
