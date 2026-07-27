import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Sparkles, Tag, Copy, Check } from 'lucide-react';
import { VisualCardData } from '../types';
import { openExternalUrl } from '../utils/browser';

interface VisualCardOverlayProps {
  cards: VisualCardData[];
  onDismissCard: (id: string) => void;
}

export const VisualCardOverlay: React.FC<VisualCardOverlayProps> = ({
  cards,
  onDismissCard,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 flex flex-col space-y-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {cards.map((card) => (
          <motion.div
            key={card.id}
            layout
            initial={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: 80, scale: 0.85, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="pointer-events-auto p-4 rounded-2xl bg-[#030303]/95 border border-white/10 shadow-2xl backdrop-blur-xl text-white relative overflow-hidden"
          >
            {/* Top accent glow line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500" />

            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                  {card.category || 'शाश्वत CARD'}
                </span>
              </div>

              <button
                onClick={() => onDismissCard(card.id)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h3 className="mt-2 text-sm font-bold text-white tracking-wide uppercase">{card.title}</h3>

            <div className="mt-1.5 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto pr-1">
              {card.content}
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-500 font-mono">{card.timestamp}</span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopy(card.id, card.content)}
                  className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white flex items-center space-x-1 transition-colors text-[10px] font-bold uppercase tracking-wider"
                >
                  {copiedId === card.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>COPY</span>
                    </>
                  )}
                </button>

                {card.url && (
                  <button
                    onClick={() => openExternalUrl(card.url!, '_blank')}
                    className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 flex items-center space-x-1 transition-colors text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <span>VISIT</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
