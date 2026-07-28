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
  const mousePosRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2,
        active: true,
      };
    };

    const handleMouseLeave = () => {
      mousePosRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let lastT = performance.now();

    // 600 Emitting Energy Micro-Particles
    const PARTICLE_COUNT = 600;
    const particles: Array<{
      angle: number;
      dist: number;
      speed: number;
      size: number;
      alpha: number;
      hueOffset: number;
    }> = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        angle: rand(TAU),
        dist: rand(0.3, 1.2),
        speed: rand(0.12, 0.45),
        size: rand(0.8, 2.2),
        alpha: rand(0.3, 0.95),
        hueOffset: rand(0, 360),
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
      const audioBoost = isSpeaking ? 0.4 + normVolume * 0.6 : isListening ? 0.2 + normVolume * 0.4 : normVolume * 0.25;
      const speedMul = isThinking ? 2.6 : isSpeaking ? 1.7 : 1.0;

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
      const mouse = mousePosRef.current;

      // Time-shifting Color Theme (Cyan -> Pink -> Violet -> Emerald -> Amber)
      const baseHue = (t * 22) % 360;

      // 1. RENDER SMALLER MORPHING LIQUID LIGHT BLOB CORE
      const BLOB_POINTS = 96;
      ctx.beginPath();
      for (let i = 0; i <= BLOB_POINTS; i++) {
        const theta = (i / BLOB_POINTS) * TAU;
        const nx = Math.cos(theta);
        const ny = Math.sin(theta);

        // Procedural Liquid Deform
        const deform = noise2D(nx * 2.2, ny * 2.2, t * 1.5 * speedMul) * (0.2 + audioBoost * 0.25);
        const blobR = scaleBase * (1 + deform) * breathScale;

        const x = nx * blobR;
        const y = ny * blobR;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Dynamic Color Theme Radial Gradient
      const blobGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, scaleBase * 1.3 * breathScale);
      blobGrad.addColorStop(0, `hsla(${baseHue}, 90%, 65%, ${0.85 + audioBoost * 0.15})`);
      blobGrad.addColorStop(0.4, `hsla(${(baseHue + 60) % 360}, 85%, 60%, ${0.55 + audioBoost * 0.25})`);
      blobGrad.addColorStop(0.8, `hsla(${(baseHue + 120) % 360}, 80%, 55%, ${0.35 + audioBoost * 0.2})`);
      blobGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = blobGrad;
      ctx.fill();

      // Inner Core Pulse Sphere
      const innerR = scaleBase * 0.42 * (1 + 0.08 * Math.sin(t * 2.5)) * breathScale;
      const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR);
      innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      innerGrad.addColorStop(0.6, `hsla(${baseHue}, 95%, 70%, ${0.7 + audioBoost * 0.3})`);
      innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.beginPath();
      ctx.arc(0, 0, innerR, 0, TAU);
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // 2. RENDER RADIATING EMITTING PARTICLES (NO CIRCULAR STROKE LINE)
      for (const p of particles) {
        // Emit outwards
        p.dist += dt * p.speed * (1 + audioBoost * 0.8);
        if (p.dist > 1.85) {
          p.dist = rand(0.35, 0.65);
          p.angle = rand(TAU);
        }

        let pr = p.dist * scaleBase * breathScale;
        let px = Math.cos(p.angle) * pr;
        let py = Math.sin(p.angle) * pr;

        // Mouse Graviton Interaction
        if (mouse.active) {
          const dx = mouse.x - px;
          const dy = mouse.y - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const pull = ((140 - dist) / 140) * 16;
            px += (dx / dist) * pull;
            py += (dy / dist) * pull;
          }
        }

        const fade = Math.max(0, 1 - (p.dist - 0.35) / 1.5);
        const particleHue = (baseHue + p.hueOffset) % 360;

        ctx.beginPath();
        ctx.arc(px, py, p.size * (1 + audioBoost * 0.4), 0, TAU);
        ctx.fillStyle = `hsla(${particleHue}, 85%, 65%, ${p.alpha * fade})`;
        ctx.fill();
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
    <div className="relative flex items-center justify-center w-[520px] h-[520px] max-w-full select-none">
      {/* Background Typography: Noto Serif Devanagari 30vw opacity 0.05 "शाश्वत" (Positioned slightly above) */}
      <h1 className="bg-typography">
        शाश्वत
      </h1>

      {/* Reactive 3D Color-Changing Morphing Liquid Light Blob Canvas */}
      <canvas
        ref={canvasRef}
        width={520}
        height={520}
        className="absolute inset-0 pointer-events-none z-10"
      />
    </div>
  );
};
