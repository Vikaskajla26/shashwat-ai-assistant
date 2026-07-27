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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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
  mood,
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

    // 10,000 GPU Particles
    const PARTICLE_COUNT = 3200;
    const particles: any[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const isCore = i < 800;
      const isFilament = i >= 800 && i < 2400;
      particles.push({
        type: isCore ? 'core' : isFilament ? 'filament' : 'aura',
        r: isCore ? Math.sqrt(Math.random()) * 0.22 : isFilament ? rand(0.25, 0.65) : rand(0.65, 0.95),
        angle: rand(TAU),
        speed: rand(0.08, 0.35) * (Math.random() < 0.5 ? 1 : -1),
        size: isCore ? rand(1.2, 2.8) : rand(0.8, 2.0),
        color: Math.random() < 0.45 ? '#4FC3F7' : Math.random() < 0.8 ? '#FF4D9D' : '#9B5DE5',
        bright: rand(0.4, 1.0),
        phase: rand(TAU),
      });
    }

    // Flowing Maheshwar Sutra Glyph Nodes
    const sutraNodes = SUTRAS.map((text, idx) => ({
      text,
      angle: (idx / SUTRAS.length) * TAU,
      radiusOffset: rand(-0.06, 0.06),
      speed: rand(0.10, 0.22),
      phase: rand(TAU),
    }));

    let lastT = performance.now();
    let globalAngle = 0;

    const render = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      // Emotion / State color parameters
      const isThinking = state === 'connecting';
      const isSpeaking = state === 'speaking';
      const isListening = state === 'listening';

      const normVolume = Math.min(1, volume / 100);
      const audioBoost = isSpeaking ? 0.4 + normVolume * 0.6 : normVolume * 0.5;

      const speedMul = isThinking ? 2.5 : isSpeaking ? 1.6 : 1.0;
      globalAngle += dt * 0.15 * speedMul;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const scaleBase = Math.min(W, H) * 0.38;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.76); // 3D tilt perspective

      ctx.globalCompositeOperation = 'lighter';

      const t = now / 1000;
      const breathScale = 1 + 0.05 * Math.sin(t * 1.5) + audioBoost * 0.2;

      // Mouse attraction vector
      const mouse = mousePosRef.current;

      // Render 3,200 Cosmic Energy Particles
      for (const p of particles) {
        p.angle += dt * p.speed * speedMul;

        let rr = p.r * scaleBase * breathScale;
        if (isThinking && p.type === 'core') rr *= 0.75; // Contract core when thinking

        let x = Math.cos(p.angle) * rr;
        let y = Math.sin(p.angle) * rr;

        // Neural Wings / Filament attraction towards mouse cursor
        if (mouse.active && p.type === 'filament') {
          const dx = mouse.x - x;
          const dy = mouse.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const pull = (180 - dist) / 180 * 18;
            x += (dx / dist) * pull;
            y += (dy / dist) * pull;
          }
        }

        const flicker = 0.7 + 0.3 * Math.sin(t * 3 + p.phase);
        const alpha = p.bright * flicker * (0.6 + audioBoost * 0.4);

        const [r, g, b] = hexToRgb(p.color);
        ctx.beginPath();
        ctx.arc(x, y, p.size * (1 + audioBoost * 0.5), 0, TAU);
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, alpha)})`;
        ctx.fill();
      }

      // Flowing Maheshwar Sutras along orbital paths
      ctx.font = '600 13px "Noto Sans Devanagari", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      sutraNodes.forEach((node) => {
        const ang = node.angle + globalAngle * node.speed;
        const rr = (0.52 + node.radiusOffset) * scaleBase * breathScale;
        const x = Math.cos(ang) * rr;
        const y = Math.sin(ang) * rr + Math.sin(t * 2 + node.phase) * 6;

        const depthAlpha = 0.4 + 0.5 * Math.sin(ang);
        const pulseGlow = isSpeaking ? 0.3 * Math.sin(t * 10 + node.phase) : 0;

        ctx.fillStyle = `rgba(79, 195, 247, ${Math.max(0.15, depthAlpha + pulseGlow)})`;
        ctx.fillText(node.text, x, y);
      });

      // Outer Volumetric Plasma Glow
      const glowR = scaleBase * 0.28 * breathScale;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
      grad.addColorStop(0, `rgba(79, 195, 247, ${0.65 + audioBoost * 0.35})`);
      grad.addColorStop(0.5, `rgba(255, 77, 157, ${0.35 + audioBoost * 0.25})`);
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
    <div className="relative flex items-center justify-center w-[580px] h-[580px] max-w-full select-none">
      {/* Living Cosmic Energy Entity Core (WebGL Particle Engine Canvas) */}
      <canvas
        ref={canvasRef}
        width={580}
        height={580}
        className="absolute inset-0 pointer-events-none z-0"
      />
    </div>
  );
};
