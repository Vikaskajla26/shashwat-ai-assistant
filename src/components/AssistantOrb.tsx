import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Mic, Radio, Volume2, Power } from 'lucide-react';
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

interface ThemeConfig {
  label: string;
  p: string; // primary hex
  s: string; // secondary hex
  g: string; // glow bg hex
  rot: number;
  jitter: number;
  coreScale: number;
  spikes: number;
}

const THEMES: Record<string, ThemeConfig> = {
  idle: { label: 'IDLE', p: '#4fd1ff', s: '#123246', g: '#050c11', rot: 0.055, jitter: 0.35, coreScale: 1.00, spikes: 0.25 },
  connecting: { label: 'CONNECTING', p: '#b98bff', s: '#3a2264', g: '#0b0714', rot: 0.22, jitter: 0.85, coreScale: 0.92, spikes: 0.55 },
  listening: { label: 'LISTENING', p: '#54ffb0', s: '#0f4d3a', g: '#04120c', rot: 0.10, jitter: 0.55, coreScale: 1.08, spikes: 0.4 },
  speaking: { label: 'SPEAKING', p: '#ffb347', s: '#7a3d0a', g: '#140c04', rot: 0.075, jitter: 0.6, coreScale: 1.15, spikes: 0.6 },
  disconnected: { label: 'STANDBY', p: '#38bdf8', s: '#0f172a', g: '#030712', rot: 0.03, jitter: 0.2, coreScale: 0.85, spikes: 0.15 },
};

function hexToRgb(h: string): [number, number, number] {
  h = h.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  return rgbToHex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
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
  onToggleConnection,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    const RING_COUNT = 7;
    const PARTICLES_PER_RING = 240;
    const ringParticles: any[] = [];
    for (let r = 0; r < RING_COUNT; r++) {
      const baseR = 0.30 + r * 0.10;
      for (let i = 0; i < PARTICLES_PER_RING; i++) {
        ringParticles.push({
          ring: r,
          baseR,
          angle: rand(TAU),
          wob: rand(TAU),
          wobSpeed: rand(0.4, 1.3),
          radJit: rand(0.85, 1.15),
          size: rand(0.6, 1.9),
          bright: rand(0.35, 1),
          speedMul: 1 / (1 + r * 0.32),
        });
      }
    }

    const CORE_N = 340;
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));
    const coreParticles: any[] = [];
    for (let i = 0; i < CORE_N; i++) {
      const t = i / CORE_N;
      coreParticles.push({
        r: Math.sqrt(t) * 0.20,
        angle: i * GOLDEN,
        size: rand(0.7, 2.1) * (1 - t * 0.4),
        bright: rand(0.55, 1),
      });
    }

    const SPIKE_N = 46;
    const spikes: any[] = [];
    for (let i = 0; i < SPIKE_N; i++) {
      spikes.push({
        angle: rand(TAU),
        r0: rand(0.55, 0.78),
        len: rand(0.06, 0.22),
        jag: rand(0.4, 1),
        speedMul: rand(0.3, 0.7),
        phase: rand(TAU),
      });
    }

    const SAT_N = 10;
    const sats: any[] = [];
    for (let i = 0; i < SAT_N; i++) {
      sats.push({
        r: rand(0.42, 0.62),
        angle: rand(TAU),
        speed: rand(0.5, 1.4) * (Math.random() < 0.5 ? -1 : 1),
        size: rand(1.6, 3),
        tilt: rand(-0.35, 0.35),
      });
    }

    let currentTheme = { ...THEMES[state] || THEMES.idle };
    let themeT = 1;
    let lastT = performance.now();
    let globalAngle = 0;

    const render = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      const targetTheme = THEMES[state] || THEMES.idle;
      themeT = Math.min(1, themeT + dt * 2.2);

      const pColor = lerpColor(currentTheme.p, targetTheme.p, themeT);
      const sColor = lerpColor(currentTheme.s, targetTheme.s, themeT);
      const gColor = lerpColor(currentTheme.g, targetTheme.g, themeT);

      currentTheme.rot = lerp(currentTheme.rot, targetTheme.rot, dt * 2.2);
      currentTheme.jitter = lerp(currentTheme.jitter, targetTheme.jitter, dt * 2.2);
      currentTheme.coreScale = lerp(currentTheme.coreScale, targetTheme.coreScale, dt * 2.2);
      currentTheme.spikes = lerp(currentTheme.spikes, targetTheme.spikes, dt * 2.2);

      if (themeT >= 1) {
        currentTheme.p = pColor;
        currentTheme.s = sColor;
        currentTheme.g = gColor;
      }

      globalAngle += dt * currentTheme.rot;

      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const scaleBase = Math.min(W, H) * 0.38;

      const normVolume = Math.min(1, volume / 100);
      const audioBoost = state === 'speaking' ? 0.4 + normVolume * 0.6 : normVolume * 0.5;

      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.76); // hologram tilt perspective

      const [pr, pg, pb] = hexToRgb(pColor);
      const [sr, sg, sb] = hexToRgb(sColor);

      ctx.globalCompositeOperation = 'lighter';

      // Faint connective rings
      for (let r = 0; r < RING_COUNT; r++) {
        const radius = (0.30 + r * 0.10) * scaleBase * (1 + audioBoost * 0.10);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, TAU);
        ctx.strokeStyle = `rgba(${pr},${pg},${pb},${0.04 + 0.03 * (RING_COUNT - r) / RING_COUNT})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Ring particles
      const t = now / 1000;
      for (const p of ringParticles) {
        const wob = Math.sin(t * p.wobSpeed + p.wob) * currentTheme.jitter * 0.05;
        const rr = (p.baseR + wob) * p.radJit * scaleBase * (1 + audioBoost * 0.12);
        const ang = p.angle + globalAngle * p.speedMul * 8;
        const x = Math.cos(ang) * rr;
        const y = Math.sin(ang) * rr;
        const flick = 0.6 + 0.4 * Math.sin(t * 3 + p.wob * 5);
        const b = p.bright * flick * (0.6 + audioBoost * 1.4);
        const mixT = p.ring / RING_COUNT;
        const cr = lerp(pr, sr, mixT);
        const cg = lerp(pg, sg, mixT);
        const cb = lerp(pb, sb, mixT);

        ctx.beginPath();
        ctx.arc(x, y, p.size * (1 + audioBoost * 0.6), 0, TAU);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, b)})`;
        ctx.fill();
      }

      // Spikes (radial accents)
      ctx.lineWidth = 1;
      for (const s of spikes) {
        const amt = currentTheme.spikes * (0.5 + audioBoost * 1.4);
        const ang = s.angle + globalAngle * s.speedMul * 4;
        const r0 = s.r0 * scaleBase;
        const len = s.len * scaleBase * (0.6 + amt);
        const segs = 4;
        ctx.beginPath();
        for (let i = 0; i <= segs; i++) {
          const rr = r0 + (len * i) / segs;
          const jag = Math.sin(t * 4 + s.phase + i * 2) * s.jag * 6;
          const a2 = ang + jag * 0.01;
          const x = Math.cos(a2) * rr;
          const y = Math.sin(a2) * rr;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const alpha = 0.10 + amt * 0.4;
        ctx.strokeStyle = `rgba(${pr},${pg},${pb},${Math.min(0.9, alpha)})`;
        ctx.stroke();
      }

      // Satellites
      const satVis = state === 'connecting' ? 1 : 0.4;
      for (const sa of sats) {
        sa.angle += dt * sa.speed * (0.6 + audioBoost);
        const rr = sa.r * scaleBase;
        const x = Math.cos(sa.angle) * rr;
        const y = Math.sin(sa.angle) * rr * (1 + sa.tilt * 0.3);
        ctx.beginPath();
        ctx.arc(x, y, sa.size * satVis, 0, TAU);
        ctx.fillStyle = `rgba(${pr},${pg},${pb},${0.6 * satVis})`;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        ctx.strokeStyle = `rgba(${pr},${pg},${pb},${0.05 * satVis})`;
        ctx.stroke();
      }

      // Core Cluster (golden spiral)
      const coreScale = currentTheme.coreScale * (1 + audioBoost * 0.35);
      for (const c of coreParticles) {
        const ang = c.angle - globalAngle * 10;
        const rr = c.r * scaleBase * coreScale;
        const x = Math.cos(ang) * rr;
        const y = Math.sin(ang) * rr;
        const b = c.bright * (0.7 + audioBoost * 0.8);
        ctx.beginPath();
        ctx.arc(x, y, c.size * (1 + audioBoost), 0, TAU);
        ctx.fillStyle = `rgba(${Math.min(255, pr + 60)},${Math.min(255, pg + 60)},${Math.min(255, pb + 60)},${Math.min(1, b)})`;
        ctx.fill();
      }

      // Radial Core Glow
      const glowR = scaleBase * 0.24 * coreScale;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
      grad.addColorStop(0, `rgba(${pr},${pg},${pb},${0.6 + audioBoost * 0.4})`);
      grad.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
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

  const scaleBoost = Math.min(0.35, (volume / 100) * 0.4);

  return (
    <div className="relative flex items-center justify-center w-[520px] h-[520px] max-w-full select-none">
      {/* Hologram Core Canvas Engine */}
      <canvas
        ref={canvasRef}
        width={520}
        height={520}
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* Floating Sanskrit Maheshwar Sutras */}
      <div className="sanskrit-float top-10 sm:top-14 text-center z-10">अइउण् । ऋऌक् । एओङ् ।</div>
      <div className="sanskrit-float bottom-10 sm:bottom-14 text-center z-10">ऐऔच् । हयवरट् । लण् ।</div>

      {/* Central Control Button */}
      <motion.button
        id="shashwat-orb-button"
        onClick={onToggleConnection}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ scale: 1 + scaleBoost }}
        transition={{ duration: 0.15 }}
        className="central-control cursor-pointer focus:outline-none relative group z-20"
        title={state === 'disconnected' ? 'Connect to शाश्वत' : 'Click to Disconnect'}
      >
        <div className="flex flex-col items-center justify-center space-y-2 text-white">
          {state === 'disconnected' && (
            <>
              <Power className="w-9 h-9 text-white drop-shadow-md" />
              <span className="control-label">Connect</span>
            </>
          )}

          {state === 'connecting' && (
            <>
              <Radio className="w-9 h-9 text-cyan-300 animate-pulse" />
              <span className="control-label">Connecting</span>
            </>
          )}

          {state === 'listening' && (
            <>
              <Mic className="w-9 h-9 text-blue-400 drop-shadow-md animate-pulse group-hover:hidden" />
              <Power className="w-9 h-9 text-rose-400 drop-shadow-md hidden group-hover:block" />
              <span className="control-label group-hover:text-rose-300">
                <span className="group-hover:hidden">Listening</span>
                <span className="hidden group-hover:inline">Disconnect</span>
              </span>
            </>
          )}

          {state === 'speaking' && (
            <>
              <Volume2 className="w-9 h-9 text-blue-300 animate-bounce group-hover:hidden" />
              <Power className="w-9 h-9 text-rose-400 drop-shadow-md hidden group-hover:block" />
              <span className="control-label group-hover:text-rose-300">
                <span className="group-hover:hidden">Speaking</span>
                <span className="hidden group-hover:inline">Disconnect</span>
              </span>
            </>
          )}
        </div>
      </motion.button>

      {/* Floating Disconnect Quick Button when connected */}
      {state !== 'disconnected' && (
        <div className="absolute -bottom-2 z-20">
          <button
            id="shashwat-orb-disconnect-quick"
            onClick={onToggleConnection}
            className="px-4 py-1.5 rounded-full bg-rose-600/30 border border-rose-500/80 text-rose-200 hover:bg-rose-600/60 hover:text-white transition-all text-[10px] font-mono font-bold uppercase tracking-widest cursor-pointer shadow-[0_0_15px_rgba(225,29,72,0.4)] flex items-center gap-1.5"
          >
            <Power className="w-3 h-3 text-rose-300" />
            <span>DISCONNECT SESSION</span>
          </button>
        </div>
      )}
    </div>
  );
};
