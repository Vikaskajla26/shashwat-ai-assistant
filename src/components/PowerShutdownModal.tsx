import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Power, Pause, X, AlertTriangle } from 'lucide-react';

interface PowerShutdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmShutdown: () => void;
  onPauseAssistant?: () => void;
}

export const PowerShutdownModal: React.FC<PowerShutdownModalProps> = ({
  isOpen,
  onClose,
  onConfirmShutdown,
  onPauseAssistant,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Cinematic Glass Dialog */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="relative w-full max-w-sm p-6 rounded-3xl bg-[#05070D]/90 border border-white/14 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-white text-center z-10"
          >
            {/* Glowing Power Icon */}
            <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-[#00E0FF] shadow-[0_0_25px_rgba(0,224,255,0.4)] mb-4">
              <Power className="w-7 h-7" />
            </div>

            <h3 className="font-serif text-lg font-bold text-white tracking-wide">
              Power Down शाश्वत?
            </h3>
            <p className="text-xs text-zinc-400 mt-1 font-sans leading-relaxed">
              Select an action for the AI consciousness live session.
            </p>

            {/* Action Options */}
            <div className="mt-6 space-y-2.5 font-mono text-xs font-bold uppercase tracking-wider">
              {onPauseAssistant && (
                <button
                  onClick={() => {
                    onPauseAssistant();
                    onClose();
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#00E0FF] text-white hover:text-[#00E0FF] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Pause className="w-4 h-4 text-[#00E0FF]" />
                  <span>Pause Assistant</span>
                </button>
              )}

              <button
                onClick={() => {
                  onConfirmShutdown();
                  onClose();
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 hover:border-rose-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.3)]"
              >
                <Power className="w-4 h-4 text-rose-400" />
                <span>Shutdown Session</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-transparent border border-transparent text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
