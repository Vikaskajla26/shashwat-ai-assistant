import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types';
import { getStateTheme } from '../theme/aiState';

interface QuantumAICoreProps {
  state: AssistantState;
  volume: number;
  width?: number;
  height?: number;
}

export function QuantumAICore({ state, volume, width = 360, height = 360 }: QuantumAICoreProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const stateRef = useRef<AssistantState>(state);
  const volumeRef = useRef<number>(volume);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high-DPI resolution
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = width * 0.28;

    // Create 45 bioluminescent particles
    const particleCount = 45;
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      angle: (i / particleCount) * Math.PI * 2,
      radiusOffset: (Math.random() - 0.5) * 24,
      speed: 0.005 + Math.random() * 0.012,
      size: 1.5 + Math.random() * 2.5,
      alpha: 0.3 + Math.random() * 0.6,
    }));

    let t = 0;

    const render = () => {
      t += 0.016;
      ctx.clearRect(0, 0, width, height);

      const currentState = stateRef.current;
      const theme = getStateTheme(currentState);
      const rawVol = volumeRef.current;
      const vol = typeof rawVol === 'number' && !isNaN(rawVol) ? Math.max(0, rawVol) : 0;

      // 1. Dynamic Outer Radial Glow
      const glowRadius = baseRadius * (1.2 + Math.sin(t * theme.orbBreath * 1.5) * 0.06 + vol * 0.25);
      const outerGlow = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.3, centerX, centerY, glowRadius);
      outerGlow.addColorStop(0, theme.baseColor + '80');
      outerGlow.addColorStop(0.5, theme.accentColor + '30');
      outerGlow.addColorStop(1, 'transparent');

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Morphing Bioluminescent Core Sphere
      const currentRadius = baseRadius * (1.0 + Math.sin(t * theme.orbBreath * 2) * 0.04 + vol * 0.18);
      const coreGradient = ctx.createRadialGradient(
        centerX - currentRadius * 0.3,
        centerY - currentRadius * 0.3,
        currentRadius * 0.1,
        centerX,
        centerY,
        currentRadius
      );
      coreGradient.addColorStop(0, '#FFFFFF');
      coreGradient.addColorStop(0.4, theme.fresnelColor);
      coreGradient.addColorStop(0.75, theme.accentColor);
      coreGradient.addColorStop(1, theme.baseColor + 'CC');

      ctx.fillStyle = coreGradient;
      ctx.beginPath();

      // Deform radius along circle using smooth sine waves
      const points = 36;
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const deformA = Math.sin(theta * 3 + t * theme.orbSpeed * 2) * (3 + vol * 12) * theme.orbAmp;
        const deformB = Math.cos(theta * 5 - t * theme.orbSpeed * 1.5) * (2 + vol * 8);
        const r = currentRadius + deformA + deformB;
        const x = centerX + Math.cos(theta) * r;
        const y = centerY + Math.sin(theta) * r;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // 3. Orbiting Energy Particles
      particles.forEach((p) => {
        p.angle += p.speed * theme.orbSpeed * (1 + vol * 1.5);
        const r = currentRadius + p.radiusOffset + Math.sin(t * 2 + p.angle * 3) * 6;
        const px = centerX + Math.cos(p.angle) * r;
        const py = centerY + Math.sin(p.angle) * r;

        ctx.fillStyle = theme.fresnelColor;
        ctx.globalAlpha = p.alpha * (0.6 + vol * 0.4);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // 4. Bright Fresnel Rim Envelope
      ctx.strokeStyle = theme.fresnelColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = theme.fresnelColor;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius * 0.98, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [width, height]);

  return (
    <div className="relative flex items-center justify-center pointer-events-none select-none">
      <canvas
        ref={canvasRef}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="drop-shadow-[0_0_35px_rgba(124,58,237,0.3)] transition-all duration-700"
      />
    </div>
  );
}
