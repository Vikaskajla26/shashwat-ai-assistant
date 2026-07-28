import React, { useEffect, useRef } from 'react';
import { AssistantState, AssistantMood } from '../types';

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

const TAU = Math.PI * 2;

function noise2D(x: number, y: number, t: number): number {
  return (
    Math.sin(x * 1.5 + t * 0.8) * Math.cos(y * 1.5 + t * 0.9) +
    Math.sin(x * 3.2 - t * 1.2) * 0.5 * Math.cos(y * 2.8 + t * 1.1) +
    Math.sin((x + y) * 2.1 + t * 1.4) * 0.25
  );
}

export const AssistantOrb: React.FC<AssistantOrbProps> = ({
  state,
  volume = 0,
  onToggleConnection,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let lastT = performance.now();

    const render = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      const t = now / 1000;

      const isThinking = state === 'connecting';
      const isSpeaking = state === 'speaking';
      const isListening = state === 'listening';

      const normVolume = Math.min(1, volume / 100);
      const audioBoost = isSpeaking ? 0.45 + normVolume * 0.65 : isListening ? 0.2 + normVolume * 0.4 : normVolume * 0.3;
      const speedMul = isThinking ? 2.5 : isSpeaking ? 1.6 : 1.0;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const scaleBase = Math.min(W, H) * 0.38;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(cx, cy);

      ctx.globalCompositeOperation = 'lighter';

      const breathScale = 1 + 0.06 * Math.sin(t * 1.4) + audioBoost * 0.25;

      // Render Liquid Plasma Deform Inner Overlay
      const BLOB_POINTS = 64;
      ctx.beginPath();
      for (let i = 0; i <= BLOB_POINTS; i++) {
        const theta = (i / BLOB_POINTS) * TAU;
        const nx = Math.cos(theta);
        const ny = Math.sin(theta);

        const deform = noise2D(nx * 2.2, ny * 2.2, t * 1.4 * speedMul) * (0.22 + audioBoost * 0.28);
        const blobR = scaleBase * (1 + deform) * breathScale;

        const x = nx * blobR;
        const y = ny * blobR;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const blobGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, scaleBase * 1.35 * breathScale);
      blobGrad.addColorStop(0, `rgba(255, 45, 85, ${0.75 + audioBoost * 0.25})`);
      blobGrad.addColorStop(0.5, `rgba(155, 93, 229, ${0.45 + audioBoost * 0.25})`);
      blobGrad.addColorStop(1, 'rgba(5, 5, 5, 0)');
      ctx.fillStyle = blobGrad;
      ctx.fill();

      // Listening / Speaking Audio Shockwave Ring
      if (isListening || isSpeaking) {
        const waveR = scaleBase * (1.25 + 0.15 * Math.sin(t * 6));
        ctx.beginPath();
        ctx.arc(0, 0, waveR, 0, TAU);
        ctx.strokeStyle = `rgba(255, 45, 85, ${0.5 + audioBoost * 0.4})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [state, volume]);

  const stateLabel =
    state === 'disconnected'
      ? 'SHASHWAT OS'
      : state === 'listening'
      ? 'LISTENING...'
      : state === 'speaking'
      ? 'SPEAKING...'
      : state === 'connecting'
      ? 'THINKING...'
      : 'ACTIVE';

  return (
    <div className="liquid-orb-viewport">
      {/* Morphing Radial Liquid Gradient Backdrop */}
      <div className="liquid-blob" />

      {/* Glassmorphic Central Core */}
      <div className="orb-core" onClick={onToggleConnection}>
        <div className="relative flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="absolute inset-0 pointer-events-none rounded-full"
          />
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ff2d55]/40 to-white/20 border border-white/20 blur-[1px] flex items-center justify-center shadow-[0_0_30px_rgba(255,45,85,0.6)]">
            <span className="w-4 h-4 rounded-full bg-[#ff2d55] animate-ping" />
          </div>
        </div>
        <span className="label">{stateLabel}</span>
      </div>
    </div>
  );
};
