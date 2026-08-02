import React from 'react';
import { AssistantState } from '../types';
import { getStateTheme } from '../theme/aiState';

interface AudioWaveformProps {
  state: AssistantState;
  volume: number;
}

export function AudioWaveform({ state, volume }: AudioWaveformProps) {
  const theme = getStateTheme(state);
  const isAudioActive = state === 'listening' || state === 'speaking' || volume > 0.05;

  const barCount = 16;
  const bars = Array.from({ length: barCount }, (_, i) => {
    // Generate organic pseudo-frequency spectrum heights
    const centerFactor = 1 - Math.abs(i - barCount / 2) / (barCount / 2);
    const heightNorm = isAudioActive
      ? Math.max(0.15, Math.min(1.0, (volume * 1.8 + Math.sin(i * 0.8 + Date.now() * 0.01) * 0.25) * centerFactor))
      : 0.1;
    return heightNorm;
  });

  return (
    <div className="flex items-center justify-center gap-1.5 h-10 px-4 py-1 rounded-full bg-slate-950/40 border border-white/10 backdrop-blur-md transition-all duration-500">
      {bars.map((h, idx) => (
        <div
          key={idx}
          className="w-1.5 rounded-full transition-all duration-75"
          style={{
            height: `${Math.max(4, h * 32)}px`,
            backgroundColor: isAudioActive ? theme.fresnelColor : 'rgba(255,255,255,0.2)',
            boxShadow: isAudioActive ? `0 0 10px ${theme.fresnelColor}` : 'none',
          }}
        />
      ))}
    </div>
  );
}
