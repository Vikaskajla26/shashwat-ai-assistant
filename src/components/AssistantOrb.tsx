import React, { useEffect, useRef, useState } from 'react';
import { AssistantState, AssistantMood } from '../types';
import { OrbScene } from './orb/OrbScene';
import { getStateTheme } from '../theme/aiState';

interface AssistantOrbProps {
  state: AssistantState;
  mood: AssistantMood;
  inputVolume?: number;
  outputVolume?: number;
  volume?: number;
  isMuted?: boolean;
  onToggleConnection?: () => void;
  onToggleMute?: () => void;
}

/**
 * FallbackOrb — 2D CSS / SVG volumetric glowing orb used when WebGL is unavailable.
 * Guarantees zero blank screens or failed rectangles.
 */
const FallbackOrb: React.FC<{ state: AssistantState; volume: number }> = ({ state, volume }) => {
  const theme = getStateTheme(state);
  const pulse = 1 + (volume / 100) * 0.15;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="w-64 h-64 rounded-full transition-all duration-700 blur-xl opacity-60 animate-pulse"
        style={{
          background: `radial-gradient(circle, ${theme.accentColor} 0%, ${theme.baseColor} 60%, transparent 100%)`,
          transform: `scale(${pulse * 1.2})`,
        }}
      />
      <div
        className="w-48 h-48 rounded-full border border-white/20 transition-all duration-500 shadow-2xl flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${theme.fresnelColor} 0%, ${theme.baseColor} 50%, ${theme.accentColor} 100%)`,
          boxShadow: `0 0 50px ${theme.bloomColor}`,
          transform: `scale(${pulse})`,
        }}
      />
    </div>
  );
};

export const AssistantOrb: React.FC<AssistantOrbProps> = ({
  state,
  volume = 0,
}) => {
  const stateRef = useRef<AssistantState>(state);
  const volumeRef = useRef<number>(volume);
  const [hasWebGlError, setHasWebGlError] = useState(false);

  // Keep refs fresh without triggering a scene remount.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  return (
    <div className="relative flex items-center justify-center w-[540px] h-[540px] max-w-full select-none">
      {/* Background Typography: Noto Serif Devanagari "शाश्वत" */}
      <h1 className="bg-typography">शाश्वत</h1>

      {/* 3D Volumetric Three.js WebGL scene with graceful fallback */}
      {!hasWebGlError ? (
        <OrbScene
          stateRef={stateRef}
          volumeRef={volumeRef}
          onError={() => setHasWebGlError(true)}
        />
      ) : (
        <FallbackOrb state={state} volume={volume} />
      )}
    </div>
  );
};
