/**
 * Primary React Orb Component for Shashwat AI OS.
 * Integrates directly with Assistant FSM state, live audio levels, wake word detection, thinking, and speaking flags.
 */

import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../../types';
import { OrbController } from './OrbController';

export interface OrbProps {
  state?: AssistantState;
  audioLevel?: number;
  wakeDetected?: boolean;
  thinking?: boolean;
  speaking?: boolean;
  width?: number;
  height?: number;
}

export const Orb: React.FC<OrbProps> = React.memo(({
  state = 'idle',
  audioLevel = 0,
  wakeDetected = false,
  thinking = false,
  speaking = false,
  width = 380,
  height = 380,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stateRef = useRef(state);
  const audioLevelRef = useRef(audioLevel);
  const wakeDetectedRef = useRef(wakeDetected);
  const thinkingRef = useRef(thinking);
  const speakingRef = useRef(speaking);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    wakeDetectedRef.current = wakeDetected;
  }, [wakeDetected]);

  useEffect(() => {
    thinkingRef.current = thinking;
  }, [thinking]);

  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = new OrbController();
    const detach = controller.attach(
      canvas,
      width,
      height,
      () => stateRef.current,
      () => audioLevelRef.current,
      () => wakeDetectedRef.current,
      () => thinkingRef.current,
      () => speakingRef.current
    );

    return () => {
      detach();
    };
  }, [width, height]);

  return (
    <div className="relative flex items-center justify-center pointer-events-none select-none will-change-transform transform-gpu">
      <canvas
        ref={canvasRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          willChange: 'transform, opacity',
          transform: 'translateZ(0)',
        }}
        className="drop-shadow-[0_0_35px_rgba(124,58,237,0.35)] transition-all duration-700"
      />
    </div>
  );
});

