import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types';
import { getStateTheme } from '../theme/aiState';

interface CinematicLivingEnvironmentProps {
  state: AssistantState;
}

export const CinematicLivingEnvironment: React.FC<CinematicLivingEnvironmentProps> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = getStateTheme(state);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle dust field (3D space simulation)
    const particleCount = 80;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * 2 + 0.5,
      size: Math.random() * 1.8 + 0.5,
      alpha: Math.random() * 0.5 + 0.1,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2,
    }));

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    let time = 0;

    const render = () => {
      time += 0.016;

      // Smooth mouse damping
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // 1. Deep Atmospheric Dark Base
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // 2. Soft Volumetric Gradient Aura
      const centerX = width / 2 + (mouseX - width / 2) * 0.04;
      const centerY = height / 2 + (mouseY - height / 2) * 0.04;
      const gradientRadius = Math.max(width, height) * 0.6;

      const radialGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        gradientRadius
      );

      const hexToRgba = (hex: string, alpha: number) => {
        const c = hex.replace('#', '');
        const r = parseInt(c.substring(0, 2), 16) || 15;
        const g = parseInt(c.substring(2, 4), 16) || 23;
        const b = parseInt(c.substring(4, 6), 16) || 42;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };

      const baseRgba = hexToRgba(theme.baseColor, 0.14);
      const accentRgba = hexToRgba(theme.accentColor, 0.08);

      radialGrad.addColorStop(0, baseRgba);
      radialGrad.addColorStop(0.4, accentRgba);
      radialGrad.addColorStop(1, 'rgba(3, 7, 18, 0.95)');

      ctx.fillStyle = radialGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Faint Parallax Particle Dust Field
      ctx.save();
      particles.forEach((p) => {
        p.x += p.speedX * (theme.motionIntensity || 0.5);
        p.y += p.speedY * (theme.motionIntensity || 0.5);

        // Wrap edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Twinkle envelope
        const currentAlpha =
          p.alpha * (0.6 + 0.4 * Math.sin(time * p.twinkleSpeed * 50 + p.twinklePhase));

        // Parallax displacement based on depth z
        const parallaxX = (mouseX - width / 2) * (0.01 / p.z);
        const parallaxY = (mouseY - height / 2) * (0.01 / p.z);

        ctx.beginPath();
        ctx.arc(p.x + parallaxX, p.y + parallaxY, p.size / p.z, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(theme.fresnelColor || '#FFFFFF', currentAlpha);
        ctx.shadowColor = theme.fresnelColor || '#FFFFFF';
        ctx.shadowBlur = p.size * 2;
        ctx.fill();
      });
      ctx.restore();

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [state, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
    />
  );
};
