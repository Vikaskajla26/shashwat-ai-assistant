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

// 14 Sacred Maheshwar Sutras
const SUTRAS = [
  'अइउण्', 'ऋऌक्', 'एओङ्', 'ऐऔच्',
  'हयवरट्', 'लण्', 'ञमङणनम्', 'झभञ्',
  'घढधष्', 'जबगडदश्', 'खफछठथचटत्व्',
  'कपय्', 'शषसर्', 'हल्'
];

function hexToRgb(h: string): [number, number, number] {
  h = h.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
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

    // 4,500 Futuristic Quantum Energy Particles
    const PARTICLE_COUNT = 4500;
    const particles: any[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const isCoreBlob = i < 1200;
      const isNeuralFilament = i >= 1200 && i < 3500;
      particles.push({
        type: isCoreBlob ? 'blob' : isNeuralFilament ? 'filament' : 'aura',
        r: isCoreBlob ? Math.sqrt(Math.random()) * 0.38 : isNeuralFilament ? rand(0.35, 0.78) : rand(0.78, 1.05),
        angle: rand(TAU),
        speed: rand(0.06, 0.42) * (Math.random() < 0.5 ? 1 : -1),
        size: isCoreBlob ? rand(1.5, 3.8) : rand(0.9, 2.4),
        color: Math.random() < 0.5 ? '#4FC3F7' : Math.random() < 0.82 ? '#FF4D9D' : '#9B5DE5',
        bright: rand(0.45, 1.0),
        phase: rand(TAU),
      });
    }

    // 14 Sacred Maheshwar Sutra Orbital Nodes
    const sutraNodes = SUTRAS.map((text, idx) => ({
      text,
      angle: (idx / SUTRAS.length) * TAU,
      radiusOffset: rand(-0.08, 0.08),
      speed: rand(0.12, 0.28),
      phase: rand(TAU),
    }));

    let lastT = performance.now();
    let globalAngle = 0;

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
      const speedMul = isThinking ? 2.8 : isSpeaking ? 1.8 : 1.0;

      globalAngle += dt * 0.18 * speedMul;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const scaleBase = Math.min(W, H) * 0.42;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(cx, cy);

      // Compositing for deep glow
      ctx.globalCompositeOperation = 'lighter';

      const breathScale = 1 + 0.07 * Math.sin(t * 1.4) + audioBoost * 0.22;
      const mouse = mousePosRef.current;

      // 1. RENDER ORGANIC LIQUID LIGHT METABALL BLOB CORE
      const BLOB_POINTS = 64;
      ctx.beginPath();
      for (let i = 0; i <= BLOB_POINTS; i++) {
        const theta = (i / BLOB_POINTS) * TAU;
        const nx = Math.cos(theta);
        const ny = Math.sin(theta);

        // Procedural Liquid Deform
        const deform = noise2D(nx * 2, ny * 2, t * 1.5 * speedMul) * (0.18 + audioBoost * 0.25);
        const blobR = scaleBase * 0.45 * (1 + deform) * breathScale;

        const x = nx * blobR;
        const y = ny * blobR;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      // Liquid Light Radial Gradient Core
      const blobGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, scaleBase * 0.5 * breathScale);
      blobGrad.addColorStop(0, `rgba(79, 195, 247, ${0.8 + audioBoost * 0.2})`);
      blobGrad.addColorStop(0.4, `rgba(255, 77, 157, ${0.5 + audioBoost * 0.3})`);
      blobGrad.addColorStop(0.8, `rgba(155, 93, 229, ${0.3 + audioBoost * 0.2})`);
      blobGrad.addColorStop(1, 'rgba(5, 7, 13, 0)');
      ctx.fillStyle = blobGrad;
      ctx.fill();

      // 2. RENDER 4,500 QUANTUM PARTICLES (CORE BLOB, FILAMENTS, AURA)
      for (const p of particles) {
        p.angle += dt * p.speed * speedMul;

        let rr = p.r * scaleBase * breathScale;
        if (isThinking && p.type === 'blob') rr *= 0.72; // Turbulence contraction

        // Blob surface noise perturbation
        const nFactor = noise2D(Math.cos(p.angle), Math.sin(p.angle), t + p.phase);
        rr *= 1 + nFactor * 0.12;

        let x = Math.cos(p.angle) * rr;
        let y = Math.sin(p.angle) * rr;

        // Neural Graviton Cursor Pull
        if (mouse.active && (p.type === 'filament' || p.type === 'aura')) {
          const dx = mouse.x - x;
          const dy = mouse.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 220) {
            const pull = ((220 - dist) / 220) * 28;
            x += (dx / dist) * pull;
            y += (dy / dist) * pull;
          }
        }

        const flicker = 0.75 + 0.25 * Math.sin(t * 3.5 + p.phase);
        const alpha = p.bright * flicker * (0.65 + audioBoost * 0.35);

        const [r, g, b] = hexToRgb(p.color);
        ctx.beginPath();
        ctx.arc(x, y, p.size * (1 + audioBoost * 0.6), 0, TAU);
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, alpha)})`;
        ctx.fill();
      }

      // 3. RENDER 14 MAHESHWAR SUTRA ORBITAL GLYPH RINGS
      ctx.font = '700 15px "Noto Sans Devanagari", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      sutraNodes.forEach((node) => {
        const ang = node.angle + globalAngle * node.speed;
        const rr = (0.62 + node.radiusOffset) * scaleBase * breathScale;
        const x = Math.cos(ang) * rr;
        const y = Math.sin(ang) * rr + Math.sin(t * 2.2 + node.phase) * 8;

        const depthAlpha = 0.45 + 0.55 * Math.sin(ang);
        const pulseGlow = isSpeaking ? 0.35 * Math.sin(t * 12 + node.phase) : 0;

        ctx.fillStyle = `rgba(79, 195, 247, ${Math.max(0.2, depthAlpha + pulseGlow)})`;
        ctx.shadowColor = '#4FC3F7';
        ctx.shadowBlur = 12;
        ctx.fillText(node.text, x, y);
        ctx.shadowBlur = 0;
      });

      // 4. LISTENING / SPEAKING REACTION RINGS
      if (isListening || isSpeaking) {
        const waveR = scaleBase * (0.75 + 0.15 * Math.sin(t * 6));
        ctx.beginPath();
        ctx.arc(0, 0, waveR, 0, TAU);
        ctx.strokeStyle = `rgba(79, 195, 247, ${0.4 + audioBoost * 0.5})`;
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
    <div className="relative flex items-center justify-center w-[780px] h-[780px] max-w-full select-none">
      {/* 2040 Futuristic Living Holographic Blob Energy Core (780px Viewport Scale) */}
      <canvas
        ref={canvasRef}
        width={780}
        height={780}
        className="absolute inset-0 pointer-events-none z-0"
      />
    </div>
  );
};
