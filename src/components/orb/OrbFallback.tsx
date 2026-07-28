import React from 'react';
import { OrbStateType, ORB_STATE_PRESETS } from './OrbState';

interface OrbFallbackProps {
  state: OrbStateType;
  size?: number;
}

export const OrbFallback: React.FC<OrbFallbackProps> = ({ state, size = 340 }) => {
  const preset = ORB_STATE_PRESETS[state] || ORB_STATE_PRESETS.idle;

  return (
    <div
      style={{
        width: size,
        height: size,
      }}
      className="relative flex items-center justify-center select-none"
    >
      <div
        style={{
          width: size * 0.65,
          height: size * 0.65,
          background: `radial-gradient(circle at 35% 35%, ${preset.rimColor} 0%, ${preset.coreColor} 50%, rgba(10, 10, 12, 0.9) 100%)`,
          boxShadow: `0 0 60px ${preset.coreColor}66, inset 0 0 20px rgba(255, 255, 255, 0.4)`,
        }}
        className="rounded-full animate-pulse transition-all duration-700 backdrop-blur-xl"
      />
    </div>
  );
};
