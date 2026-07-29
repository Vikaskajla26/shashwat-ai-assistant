import React, { useEffect, useRef } from 'react';
import { AssistantState, AssistantMood } from '../types';
import { OrbScene } from './orb/OrbScene';

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
 * AssistantOrb — the hero consciousness hologram.
 *
 * Thin shell: it only exposes the background "शाश्वत" typography and forwards
 * the *live* state + volume to <OrbScene> via mutable refs. OrbScene mounts its
 * WebGL scene exactly once and samples these refs every frame, so frequent
 * prop changes (volume moves every animation frame) never rebuild the scene.
 *
 * This is the foundational perf fix: the previous implementation listed
 * `state` and `volume` in a useEffect dependency array, tearing down the entire
 * GL context dozens of times per second during audio.
 */
export const AssistantOrb: React.FC<AssistantOrbProps> = ({
  state,
  volume = 0,
}) => {
  const stateRef = useRef<AssistantState>(state);
  const volumeRef = useRef<number>(volume);

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

      {/* 3D Volumetric Three.js WebGL scene (mounts once) */}
      <OrbScene stateRef={stateRef} volumeRef={volumeRef} />
    </div>
  );
};
