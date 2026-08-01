import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Mic, Volume2, Activity, Zap } from 'lucide-react';
import { AssistantState } from '../types';

interface AwakeCrystalButtonProps {
  state: AssistantState;
  onAwake?: () => void;
  className?: string;
}

export const AwakeCrystalButton: React.FC<AwakeCrystalButtonProps> = ({
  state,
  onAwake,
  className = '',
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Parallax subtle tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / 10;
    const y = (e.clientY - rect.top - rect.height / 2) / 10;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  };

  const getLabelAndIcon = () => {
    switch (state) {
      case 'listening':
        return { label: 'Listening…', icon: Mic, glowColor: 'rgba(59, 130, 246, 0.4)' };
      case 'understanding':
      case 'reasoning':
      case 'searching':
        return { label: 'Thinking…', icon: Sparkles, glowColor: 'rgba(168, 85, 247, 0.45)' };
      case 'speaking':
        return { label: 'Speaking…', icon: Volume2, glowColor: 'rgba(245, 158, 11, 0.4)' };
      case 'executing':
        return { label: 'Executing…', icon: Activity, glowColor: 'rgba(16, 185, 129, 0.4)' };
      case 'error':
        return { label: 'System Notice', icon: Zap, glowColor: 'rgba(244, 63, 94, 0.4)' };
      default:
        return { label: 'Awaken AI', icon: Sparkles, glowColor: 'rgba(168, 85, 247, 0.25)' };
    }
  };

  const { label, icon: Icon, glowColor } = getLabelAndIcon();
  const isSleeping = state === 'disconnected' || state === 'idle';

  return (
    <motion.button
      onClick={onAwake}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: isHovered ? -4 : [0, -2, 0],
        scale: isHovered ? 1.03 : isSleeping ? [1.0, 1.02, 1.0] : 1.0,
        x: mousePos.x,
      }}
      transition={{
        y: isHovered
          ? { type: 'spring', stiffness: 400, damping: 25 }
          : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
        scale: isHovered
          ? { type: 'spring', stiffness: 400, damping: 25 }
          : isSleeping
          ? { duration: 4, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.2 },
        opacity: { duration: 0.6 },
      }}
      whileTap={{ scale: 0.96 }}
      className={`group relative h-[54px] w-[184px] rounded-full cursor-pointer select-none font-sans outline-none ${className}`}
      style={{
        boxShadow: `
          0 24px 48px -12px rgba(0, 0, 0, 0.75),
          0 8px 16px -4px rgba(0, 0, 0, 0.5),
          0 0 35px ${glowColor},
          inset 0 1.5px 1px rgba(255, 255, 255, 0.45),
          inset 0 -1.5px 2px rgba(0, 0, 0, 0.5)
        `,
      }}
    >
      {/* Outer Refractive Glass Shell */}
      <div
        className="absolute inset-0 rounded-full border border-white/20 transition-all duration-300 group-hover:border-white/40"
        style={{
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 45%, rgba(10, 10, 20, 0.4) 100%)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        }}
      />

      {/* Top Liquid Edge Reflection Catch */}
      <div className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none" />

      {/* Drifting Micro Light Streak Highlight */}
      <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
          className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
        />
      </div>

      {/* Inner Content Layer */}
      <div className="relative z-10 h-full w-full flex items-center justify-center gap-2.5 px-5">
        {/* Animated Minimal Glass Dot / Icon */}
        <div className="relative flex items-center justify-center">
          {isSleeping ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-r from-purple-300 to-indigo-300 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
            </span>
          ) : (
            <Icon className={`w-4 h-4 transition-transform duration-300 ${state === 'listening' ? 'text-blue-300 animate-pulse' : 'text-purple-300'}`} />
          )}
        </div>

        {/* Text */}
        <AnimatePresence mode="wait">
          <motion.span
            key={label}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2 }}
            className="text-[13px] font-medium tracking-[0.4px] text-white/95 text-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Bottom Contact Rim Gradient */}
      <div className="absolute bottom-0 inset-x-5 h-[1px] bg-gradient-to-r from-transparent via-black/60 to-transparent pointer-events-none" />
    </motion.button>
  );
};
