import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types';
import { getStateTheme } from '../theme/aiState';
import { BackgroundEngine } from '../engine/rendering/BackgroundEngine';
import { useAdaptiveQuality } from '../hooks/useAdaptiveQuality';

interface CinematicLivingEnvironmentProps {
  state: AssistantState;
}

export const CinematicLivingEnvironment: React.FC<CinematicLivingEnvironmentProps> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theme = getStateTheme(state);
  const { profile } = useAdaptiveQuality();
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let lastTime = performance.now();

    const bgEngine = BackgroundEngine.getInstance();
    bgEngine.init(window.innerWidth, window.innerHeight, profileRef.current);

    const handleMouseMove = (e: MouseEvent) => {
      bgEngine.setMouseTarget(e.clientX, e.clientY);
    };

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      bgEngine.resize(window.innerWidth, window.innerHeight);
    };

    handleResize();

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    const render = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      bgEngine.render(ctx, dt, theme.hudAccent);
      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [state]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: '#030712' }}
    />
  );
};
