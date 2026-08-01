import React, { useEffect, useRef } from 'react';
import type { StateTheme } from '../theme/aiState';

interface AudioVisualizerProps {
  /** Live audio level 0..100 (input or output depending on state). */
  volume: number;
  /** Whether the assistant session is active (drives base amplitude). */
  isActive: boolean;
  /** Current state theme — drives the spectrum color + behavior. */
  stateTheme: StateTheme;
}

/**
 * Live audio spectrum beneath the orb.
 *
 * NOTE: this replaces a previous component whose prop signature
 * (`state/mood/inputVolume/outputVolume`) did not match how <App> invoked it
 * (`volume/isActive`), leaving the visualizer effectively broken. The spectrum
 * now follows the live StateTheme accent and adapts its behavior to the active
 * state (e.g. tighter analytical bars during reasoning, wide warm bars while
 * speaking).
 */
export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  volume,
  isActive,
  stateTheme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Keep the latest theme in a ref so the rAF loop reads it without restarting.
  const themeRef = useRef(stateTheme);
  themeRef.current = stateTheme;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const activeRef = useRef(isActive);
  activeRef.current = isActive;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = 0;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const theme = themeRef.current;
      const accent = theme.hudAccent;
      const accent2 = theme.fresnelColor;

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, accent);
      gradient.addColorStop(1, accent2);

      const vol = volumeRef.current;
      const active = activeRef.current;

      const baseAmplitude = active
        ? 8 + (vol / 100) * 42 * theme.motionIntensity + 4
        : 4;

      const numBars = 32;
      const barWidth = 4;
      const spacing = (width - numBars * barWidth) / (numBars + 1);

      phase += 0.06 + theme.motionIntensity * 0.06;

      for (let i = 0; i < numBars; i++) {
        const x = spacing + i * (barWidth + spacing);
        const wave = Math.sin(phase + i * 0.3);
        const barHeight = Math.max(
          6,
          Math.abs(wave) * baseAmplitude + Math.random() * (vol > 10 ? 8 : 2),
        );

        ctx.fillStyle = gradient;
        ctx.shadowColor = accent;
        ctx.shadowBlur = vol > 20 ? 12 : 4;

        const y = (height - barHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto h-16 flex items-center justify-center relative">
      <canvas
        ref={canvasRef}
        width={380}
        height={60}
        className="w-full h-full object-contain pointer-events-none opacity-85"
      />
    </div>
  );
};
