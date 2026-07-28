import React, { useEffect, useRef } from 'react';
import { AssistantState, AssistantMood } from '../types';

interface AssistantOrbProps {
  state: AssistantState;
  mood: AssistantMood;
  inputVolume?: number;
  outputVolume?: number;
  volume?: number;
  isMuted?: boolean;
}

const TAU = Math.PI * 2;

// 2D Simplex/Perlin-like noise approximation for organic liquid blob morphing
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

      // AI State Logic & Voice Dynamics
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

      // 1. RENDER CLEAN ORGANIC LIQUID LIGHT BLOB CORE (No extra particles/sutras)
      const BLOB_POINTS = 96;
      ctx.beginPath();
      for (let i = 0; i <= BLOB_POINTS; i++) {
        const theta = (i / BLOB_POINTS) * TAU;
        const nx = Math.cos(theta);
        const ny = Math.sin(theta);

        // Procedural Liquid Deform
        const deform = noise2D(nx * 2.2, ny * 2.2, t * 1.4 * speedMul) * (0.22 + audioBoost * 0.28);
        const blobR = scaleBase * (1 + deform) * breathScale;

        const x = nx * blobR;
        const y = ny * blobR;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Liquid Light Radial Gradient
      const blobGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, scaleBase * 1.35 * breathScale);
      blobGrad.addColorStop(0, `rgba(79, 195, 247, ${0.85 + audioBoost * 0.15})`);
      blobGrad.addColorStop(0.35, `rgba(255, 77, 157, ${0.6 + audioBoost * 0.25})`);
      blobGrad.addColorStop(0.7, `rgba(155, 93, 229, ${0.4 + audioBoost * 0.2})`);
      blobGrad.addColorStop(1, 'rgba(5, 7, 13, 0)');
      ctx.fillStyle = blobGrad;
      ctx.fill();

      // Inner Core Pulse Sphere
      const innerR = scaleBase * 0.45 * (1 + 0.08 * Math.sin(t * 2.5)) * breathScale;
      const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR);
      innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      innerGrad.addColorStop(0.5, `rgba(79, 195, 247, ${0.7 + audioBoost * 0.3})`);
      innerGrad.addColorStop(1, 'rgba(155, 93, 229, 0)');
      ctx.beginPath();
      ctx.arc(0, 0, innerR, 0, TAU);
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // 2. LISTENING / SPEAKING REACTION RING
      if (isListening || isSpeaking) {
        const waveR = scaleBase * (1.25 + 0.15 * Math.sin(t * 6));
        ctx.beginPath();
        ctx.arc(0, 0, waveR, 0, TAU);
        ctx.strokeStyle = `rgba(79, 195, 247, ${0.45 + audioBoost * 0.45})`;
        ctx.lineWidth = 2.5;
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

  return (
    <div className="relative flex items-center justify-center w-[720px] h-[720px] max-w-full select-none">
      {/* Background Typography: Noto Serif Devanagari 30vw opacity 0.05 "शाश्वत" */}
      <h1 className="bg-typography">
        शाश्वत
      </h1>

      {/* Pure Ultra-Clean Liquid Plasma Blob Canvas */}
      <canvas
        ref={canvasRef}
        width={720}
        height={720}
        className="absolute inset-0 pointer-events-none z-10"
      />
    </div>
  );
};
