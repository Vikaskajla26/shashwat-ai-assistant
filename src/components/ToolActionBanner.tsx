import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wrench, CheckCircle2, AlertCircle, ExternalLink, Globe, Play } from 'lucide-react';
import { ToolExecutionEvent } from '../types';
import { openExternalUrl } from '../utils/browser';

interface ToolActionBannerProps {
  events: ToolExecutionEvent[];
}

export const ToolActionBanner: React.FC<ToolActionBannerProps> = ({ events }) => {
  if (events.length === 0) return null;

  // Show most recent event
  const latestEvent = events[events.length - 1];

  const handleManualOpen = (url: string) => {
    openExternalUrl(url, '_blank');
  };

  return (
    <div className="fixed top-20 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:min-w-[360px] sm:max-w-xl z-50 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={latestEvent.id}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.95 }}
          className="pointer-events-auto p-3 sm:px-5 sm:py-3 rounded-2xl bg-[#09090b]/95 border border-blue-500/40 shadow-2xl backdrop-blur-2xl flex items-center justify-between space-x-4 text-xs text-white relative overflow-hidden"
        >
          {/* Top glowing accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-400 to-cyan-400" />

          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 shrink-0">
              {latestEvent.status === 'executing' ? (
                <Wrench className="w-4 h-4 animate-spin" />
              ) : latestEvent.actionUrl?.includes('youtube') ? (
                <Play className="w-4 h-4 text-red-400 fill-red-400" />
              ) : latestEvent.actionUrl ? (
                <Globe className="w-4 h-4 text-cyan-400" />
              ) : latestEvent.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-bold uppercase tracking-wider text-[10px] text-blue-400">
                  {latestEvent.toolName}
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">{latestEvent.timestamp}</span>
              </div>
              <p className="text-xs font-semibold text-zinc-100 truncate">{latestEvent.message}</p>
            </div>
          </div>

          {latestEvent.actionUrl && (
            <button
              onClick={() => handleManualOpen(latestEvent.actionUrl!)}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer border border-blue-400/30"
            >
              <span>OPEN NOW</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

