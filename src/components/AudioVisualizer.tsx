import React, { useEffect, useRef } from 'react';
import { AssistantState, AssistantMood } from '../types';

interface AudioVisualizerProps {
  state: AssistantState;
  mood: AssistantMood;
  inputVolume: number;
  outputVolume: number;
}

const moodGradients: Record<AssistantMood, [string, string]> = {
  witty: ['#3b82f6', '#6366f1'],
  playful: ['#a855f7', '#3b82f6'],
  focused: ['#06b6d4', '#3b82f6'],
  charming: ['#ec4899', '#6366f1'],
  energetic: ['#f59e0b', '#3b82f6'],
};

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  state,
  mood,
  inputVolume,
  outputVolume,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const [c1, c2] = moodGradients[mood] || moodGradients.witty;
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, c1);
      gradient.addColorStop(1, c2);

      const activeVol = state === 'speaking' ? outputVolume : inputVolume;
      const baseAmplitude = state === 'disconnected' ? 4 : state === 'connecting' ? 12 : 8 + (activeVol / 100) * 45;

      const numBars = 32;
      const barWidth = 4;
      const spacing = (width - numBars * barWidth) / (numBars + 1);

      phase += 0.08;

      for (let i = 0; i < numBars; i++) {
        const x = spacing + i * (barWidth + spacing);
        const wave = Math.sin(phase + i * 0.3);
        const barHeight = Math.max(6, Math.abs(wave) * baseAmplitude + Math.random() * (activeVol > 10 ? 8 : 2));

        ctx.fillStyle = gradient;
        ctx.shadowColor = c1;
        ctx.shadowBlur = activeVol > 20 ? 12 : 4;

        // Draw rounded top bar
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
  }, [state, mood, inputVolume, outputVolume]);

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
