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

function rand(a = 1, b: number | null = null): number {
  if (b === null) {
    b = a;
    a = 0;
  }
  return a + Math.random() * (b - a);
}

// 2D Simplex/Perlin-like noise approximation for organic liquid blob morphing
function noise2D(x: number, y: number, t: number): number {
  return (
    Math.sin(x * 1.6 + t * 0.9) * Math.cos(y * 1.6 + t * 1.0) +
    Math.sin(x * 3.4 - t * 1.3) * 0.5 * Math.cos(y * 3.0 + t * 1.2) +
    Math.sin((x + y) * 2.2 + t * 1.5) * 0.25
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

    // 450 Surface-Bound Energy Quantum Nodes (bound inside blob volume & surface)
    const NODE_COUNT = 450;
    const surfaceNodes: Array<{
      angle: number;
      normRadius: number; // 0.15 to 0.98 relative to blob radius
      speed: number;
      size: number;
      alpha: number;
      hueShift: number;
    }> = [];

    for (let i = 0; i < NODE_COUNT; i++) {
      surfaceNodes.push({
        angle: rand(TAU),
        normRadius: rand(0.15, 0.96),
        speed: rand(0.08, 0.35),
        size: rand(1.2, 2.8),
        alpha: rand(0.4, 0.95),
        hueShift: rand(-40, 40),
      });
    }

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
      const audioBoost = isSpeaking ? 0.45 + normVolume * 0.65 : isListening ? 0.22 + normVolume * 0.45 : normVolume * 0.25;
      const speedMul = isThinking ? 2.6 : isSpeaking ? 1.75 : 1.0;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      // Smaller Blob Size: 28% scale Base
      const scaleBase = Math.min(W, H) * 0.28;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(cx, cy);

      ctx.globalCompositeOperation = 'lighter';

      const breathScale = 1 + 0.05 * Math.sin(t * 1.4) + audioBoost * 0.22;

      // Smooth Time-shifting HSL Color Theme
      const baseHue = (t * 24) % 360;

      // 1. RENDER FUTURISTIC MORPHING LIQUID LIGHT BLOB CORE
      const BLOB_POINTS = 120;
      ctx.beginPath();
      for (let i = 0; i <= BLOB_POINTS; i++) {
        const theta = (i / BLOB_POINTS) * TAU;
        const nx = Math.cos(theta);
        const ny = Math.sin(theta);

        // Organic Liquid Deform
        const deform = noise2D(nx * 2.2, ny * 2.2, t * 1.5 * speedMul) * (0.2 + audioBoost * 0.25);
        const blobR = scaleBase * (1 + deform) * breathScale;

        const x = nx * blobR;
        const y = ny * blobR;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Multi-layer Holographic Radial Gradient
      const blobGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, scaleBase * 1.35 * breathScale);
      blobGrad.addColorStop(0, `hsla(${baseHue}, 90%, 65%, ${0.88 + audioBoost * 0.12})`);
      blobGrad.addColorStop(0.35, `hsla(${(baseHue + 60) % 360}, 85%, 60%, ${0.6 + audioBoost * 0.25})`);
      blobGrad.addColorStop(0.75, `hsla(${(baseHue + 120) % 360}, 80%, 55%, ${0.35 + audioBoost * 0.2})`);
      blobGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = blobGrad;
      ctx.fill();

      // 2. INTERNAL ORGANIC LIQUID PATTERN FILAMENT LINES (Morphed with Blob)
      const CONTOUR_COUNT = 8;
      for (let c = 1; c <= CONTOUR_COUNT; c++) {
        const cRatio = c / (CONTOUR_COUNT + 1);
        ctx.beginPath();
        for (let i = 0; i <= BLOB_POINTS; i++) {
          const theta = (i / BLOB_POINTS) * TAU;
          const nx = Math.cos(theta);
          const ny = Math.sin(theta);

          const deform = noise2D(nx * 2.2 + c * 0.4, ny * 2.2 + c * 0.4, t * 1.5 * speedMul) * (0.2 + audioBoost * 0.25);
          const lineR = scaleBase * cRatio * (1 + deform) * breathScale;

          const lx = nx * lineR;
          const ly = ny * lineR;

          if (i === 0) ctx.moveTo(lx, ly);
          else ctx.lineTo(lx, ly);
        }
        ctx.closePath();

        const contourHue = (baseHue + c * 25) % 360;
        ctx.strokeStyle = `hsla(${contourHue}, 85%, 70%, ${0.18 + (1 - cRatio) * 0.25 + audioBoost * 0.2})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 3. BLOB-BOUND SURFACE PATTERN ENERGY NODES (Flow along liquid surface, NO scattering out)
      for (const node of surfaceNodes) {
        node.angle += dt * node.speed * (1 + audioBoost * 0.6);

        const nx = Math.cos(node.angle);
        const ny = Math.sin(node.angle);

        // Get local deformed radius of blob at this angle
        const deform = noise2D(nx * 2.2, ny * 2.2, t * 1.5 * speedMul) * (0.2 + audioBoost * 0.25);
        const localBlobR = scaleBase * (1 + deform) * breathScale;

        // Position node strictly inside or on surface of blob
        const pr = localBlobR * node.normRadius;
        const px = nx * pr;
        const py = ny * pr;

        const nodeHue = (baseHue + node.hueShift + 360) % 360;

        ctx.beginPath();
        ctx.arc(px, py, node.size * (1 + audioBoost * 0.35), 0, TAU);
        ctx.fillStyle = `hsla(${nodeHue}, 90%, 75%, ${node.alpha * (0.6 + audioBoost * 0.4)})`;
        ctx.fill();
      }

      // 4. INNER INTENSE CORE SPHERE
      const innerR = scaleBase * 0.4 * (1 + 0.08 * Math.sin(t * 2.5)) * breathScale;
      const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR);
      innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      innerGrad.addColorStop(0.5, `hsla(${baseHue}, 95%, 72%, ${0.75 + audioBoost * 0.25})`);
      innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.beginPath();
      ctx.arc(0, 0, innerR, 0, TAU);
      ctx.fillStyle = innerGrad;
      ctx.fill();

      ctx.restore();
      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [state, volume]);

  return (
    <div className="relative flex items-center justify-center w-[520px] h-[520px] max-w-full select-none">
      {/* Background Typography: Noto Serif Devanagari 30vw opacity 0.05 "शाश्वत" (Positioned slightly above) */}
      <h1 className="bg-typography">
        शाश्वत
      </h1>

      {/* Futuristic Blob-Bound Liquid Pattern Canvas */}
      <canvas
        ref={canvasRef}
        width={520}
        height={520}
        className="absolute inset-0 pointer-events-none z-10"
      />
    </div>
  );
};
