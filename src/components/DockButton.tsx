import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { liftSpring } from '../ui/motion';

interface DockButtonProps {
  onClick?: () => void;
  title: string;
  active?: boolean;
  /** Inline style applied to the accent ring/glow when active. */
  activeGlow?: string;
  /** Base icon color class (e.g. 'text-amber-400'). */
  iconClassName?: string;
  /** Extra classes for active state background/border. */
  activeClassName?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * DockButton — a single Vision Pro / Nothing OS floating-glass dock tile.
 *
 * Encapsulates the microinteraction language: spring hover-elevation (lift),
 * tactile press, a subtle glow on hover, and a pointer-originated ripple that
 * radiates from the interaction point. Honours prefers-reduced-motion via the
 * shared motion presets.
 */
export const DockButton: React.FC<DockButtonProps> = ({
  onClick,
  title,
  active = false,
  activeGlow,
  iconClassName,
  activeClassName,
  children,
  className = '',
}) => {
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const idRef = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      idRef.current += 1;
      setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: idRef.current });
      // Clear ripple after the animation completes.
      window.setTimeout(() => {
        setRipple((r) => (r && r.id === idRef.current ? null : r));
      }, 600);
    },
    [],
  );

  return (
    <motion.button
      onClick={onClick}
      onPointerDown={handlePointerDown}
      title={title}
      whileHover={{ y: -3, scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      transition={liftSpring}
      style={active && activeGlow ? { boxShadow: activeGlow } : undefined}
      className={`relative overflow-hidden p-2.5 rounded-full transition-colors duration-300 border cursor-pointer ${
        active
          ? activeClassName || 'bg-white/15 border-white/30'
          : 'bg-white/5 border-white/10 hover:bg-white/15 hover:border-white/25'
      } ${className}`}
    >
      <span className={`relative z-10 flex items-center justify-center ${iconClassName || 'text-zinc-300'}`}>
        {children}
      </span>
      {ripple && (
        <span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full bg-white/30"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 8,
            height: 8,
            transform: 'translate(-50%, -50%)',
            animation: 'dock-ripple 0.6s ease-out forwards',
          }}
        />
      )}
    </motion.button>
  );
};
