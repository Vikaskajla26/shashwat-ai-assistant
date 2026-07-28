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

    // Sparse, purposeful, low-opacity particles (120 max for restrained precision)
    const PARTICLE_COUNT = 120;
    const particles: any[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const isCore = i < 30;
      const isFilament = i >= 30 && i < 90;
      particles.push({
        type: isCore ? 'core' : isFilament ? 'filament' : 'aura',
        r: isCore ? Math.sqrt(Math.random()) * 0.22 : isFilament ? rand(0.25, 0.65) : rand(0.65, 0.95),
        angle: rand(TAU),
        speed: rand(0.04, 0.15) * (Math.random() < 0.5 ? 1 : -1),
        size: isCore ? rand(1.2, 2.4) : rand(0.8, 1.8),
        color: Math.random() < 0.6 ? '#6C7CE0' : Math.random() < 0.85 ? '#4FC3F7' : '#9B5DE5',
        bright: rand(0.2, 0.6),
        phase: rand(TAU),
      });
    }

    // Flowing Maheshwar Sutra Glyph Nodes
    const sutraNodes = SUTRAS.map((text, idx) => ({
      text,
      angle: (idx / SUTRAS.length) * TAU,
      radiusOffset: rand(-0.04, 0.04),
      speed: rand(0.06, 0.14),
      phase: rand(TAU),
    }));

    let lastT = performance.now();
    let globalAngle = 0;

    const render = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      // State visual signatures
      const isThinking = state === 'connecting';
      const isSpeaking = state === 'speaking';
      const isListening = state === 'listening';

      const normVolume = Math.min(1, volume / 100);
      const audioBoost = isSpeaking ? 0.3 + normVolume * 0.5 : normVolume * 0.4;

      const speedMul = isThinking ? 2.0 : isSpeaking ? 1.4 : 1.0;
      globalAngle += dt * 0.10 * speedMul;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const scaleBase = Math.min(W, H) * 0.36;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.78); // Subtle 3D perspective

      ctx.globalCompositeOperation = 'lighter';

      const t = now / 1000;

      // Restrained breathing cycle (4-6 second pulse)
      const breathScale = 1 + 0.04 * Math.sin(t * 1.2) + audioBoost * 0.15;

      // Mouse attraction vector
      const mouse = mousePosRef.current;

      // 1. LISTENING STATE THIN LIGHT RING
      if (isListening) {
        ctx.beginPath();
        ctx.arc(0, 0, scaleBase * 0.72 * breathScale, 0, TAU);
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 2. SPARSE PARTICLES DRIFT
      for (const p of particles) {
        p.angle += dt * p.speed * speedMul;

        let rr = p.r * scaleBase * breathScale;
        if (isThinking && p.type === 'core') rr *= 0.8;

        let x = Math.cos(p.angle) * rr;
        let y = Math.sin(p.angle) * rr;

        // Neural Wings proximity pull toward cursor
        if (mouse.active && p.type === 'filament') {
          const dx = mouse.x - x;
          const dy = mouse.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const pull = (160 - dist) / 160 * 12;
            x += (dx / dist) * pull;
            y += (dy / dist) * pull;
          }
        }

        const flicker = 0.8 + 0.2 * Math.sin(t * 2 + p.phase);
        const alpha = p.bright * flicker * (0.4 + audioBoost * 0.4);

        const [r, g, b] = hexToRgb(p.color);
        ctx.beginPath();
        ctx.arc(x, y, p.size * (1 + audioBoost * 0.4), 0, TAU);
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.6, alpha)})`;
        ctx.fill();
      }

      // 3. FLOWING MAHESHWAR SUTRAS
      ctx.font = '500 12px "Noto Sans Devanagari", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      sutraNodes.forEach((node) => {
        const ang = node.angle + globalAngle * node.speed;
        const rr = (0.50 + node.radiusOffset) * scaleBase * breathScale;
        const x = Math.cos(ang) * rr;
        const y = Math.sin(ang) * rr + Math.sin(t * 1.5 + node.phase) * 4;

        const depthAlpha = 0.25 + 0.35 * Math.sin(ang);
        const pulseGlow = isSpeaking ? 0.2 * Math.sin(t * 8 + node.phase) : 0;

        ctx.fillStyle = `rgba(108, 124, 224, ${Math.max(0.12, depthAlpha + pulseGlow)})`;
        ctx.fillText(node.text, x, y);
      });

      // 4. RESTRAINED FROSTED GLASS PLASMA CORE
      const glowR = scaleBase * 0.26 * breathScale;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
      grad.addColorStop(0, `rgba(108, 124, 224, ${0.45 + audioBoost * 0.3})`);
      grad.addColorStop(0.6, `rgba(79, 195, 247, ${0.25 + audioBoost * 0.2})`);
      grad.addColorStop(1, 'rgba(155, 93, 229, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, glowR, 0, TAU);
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
      <canvas
        ref={canvasRef}
        width={520}
        height={520}
        className="absolute inset-0 pointer-events-none z-0"
      />
    </div>
  );
};
