import React from 'react';
import { AssistantState } from '../types';
import { Orb } from '../ui/orb';

interface QuantumAICoreProps {
  state: AssistantState;
  volume: number;
  width?: number;
  height?: number;
}

export function QuantumAICore({ state, volume, width = 360, height = 360 }: QuantumAICoreProps) {
  const isThinking = state === 'thinking' || state === 'understanding';
  const isSpeaking = state === 'speaking';
  const isWake = state === 'wakeWord';

  return (
    <Orb
      state={state}
      audioLevel={volume}
      wakeDetected={isWake}
      thinking={isThinking}
      speaking={isSpeaking}
      width={width}
      height={height}
    />
  );
}

