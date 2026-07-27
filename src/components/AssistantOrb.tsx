import React from 'react';
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

export const AssistantOrb: React.FC<AssistantOrbProps> = ({
  state,
  volume = 0,
  onToggleConnection,
}) => {
  const scaleBoost = Math.min(0.35, (volume / 100) * 0.4);

  return (
    <div className="relative flex items-center justify-center w-[480px] h-[480px] max-w-full select-none">
      {/* Singularity Core Glow */}
      <motion.div
        animate={{
          scale: [1 + scaleBoost, 1.25 + scaleBoost * 1.8, 1 + scaleBoost],
          opacity: state === 'disconnected' ? 0.45 : [0.6, 0.95, 0.6],
        }}
        transition={{
          duration: state === 'speaking' ? 0.7 : 3.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="singularity-core pointer-events-none"
      />

      {/* Orbital Rings */}
      <div className="orbital-ring ring-1" />
      <div className="orbital-ring ring-2 animate-[spin_20s_linear_infinite]" />
      <div className="orbital-ring ring-3" />

      {/* Floating Sanskrit Maheshwar Sutras */}
      <div className="sanskrit-float top-12 sm:top-16 text-center">अइउण् । ऋऌक् । एओङ् ।</div>
      <div className="sanskrit-float bottom-12 sm:bottom-16 text-center">ऐऔच् । हयवरट् । लण् ।</div>

      {/* Central Control Button */}
      <motion.button
        id="shashwat-orb-button"
        onClick={onToggleConnection}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ scale: 1 + scaleBoost }}
        transition={{ duration: 0.15 }}
        className="central-control cursor-pointer focus:outline-none relative group"
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

