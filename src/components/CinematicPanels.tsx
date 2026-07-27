import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  History,
  FolderKanban,
  Brain,
  FileText,
  Globe,
  Sliders,
  Sparkles,
  Mic,
  Camera,
  Monitor,
  Key,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AssistantMood } from '../types';

interface LeftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTranscript: () => void;
  onOpenDocWorkspace: () => void;
}

export const LeftDrawer: React.FC<LeftDrawerProps> = ({
  isOpen,
  onClose,
  onOpenTranscript,
  onOpenDocWorkspace,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'projects' | 'memory' | 'docs'>('history');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 pointer-events-auto"
          />

          {/* Slide-out Left Panel */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-96 max-w-[85vw] bg-[#05070D]/95 border-r border-white/10 backdrop-blur-2xl z-50 p-6 flex flex-col pointer-events-auto text-white shadow-[10px_0_50px_rgba(0,0,0,0.8)]"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#00E0FF]" />
                <span className="font-mono text-sm font-bold tracking-[0.2em] uppercase text-white">WORKSPACE & MEMORY</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-white/5 rounded-xl border border-white/10 mb-6 font-mono text-[10px] font-bold">
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'history' ? 'bg-[#00E0FF]/20 text-[#00E0FF] border border-[#00E0FF]/40' : 'text-zinc-400 hover:text-white'
                }`}
              >
                HISTORY
              </button>
              <button
                onClick={() => setActiveTab('projects')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'projects' ? 'bg-[#00E0FF]/20 text-[#00E0FF] border border-[#00E0FF]/40' : 'text-zinc-400 hover:text-white'
                }`}
              >
                PROJECTS
              </button>
              <button
                onClick={() => setActiveTab('memory')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'memory' ? 'bg-[#00E0FF]/20 text-[#00E0FF] border border-[#00E0FF]/40' : 'text-zinc-400 hover:text-white'
                }`}
              >
                MEMORY
              </button>
              <button
                onClick={() => setActiveTab('docs')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'docs' ? 'bg-[#00E0FF]/20 text-[#00E0FF] border border-[#00E0FF]/40' : 'text-zinc-400 hover:text-white'
                }`}
              >
                DOCS
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {activeTab === 'history' && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#00E0FF]/40 transition-all cursor-pointer" onClick={onOpenTranscript}>
                    <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                      <span>VOICE SESSION</span>
                      <span>TODAY 03:15 AM</span>
                    </div>
                    <div className="font-semibold text-white">Atisar Ayurvedic Research & PPT Generator</div>
                    <div className="text-[11px] text-zinc-400 mt-1 font-sans">Created slides on causes, symptoms, and Nidana.</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#00E0FF]/40 transition-all cursor-pointer">
                    <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                      <span>DOCUMENT AI</span>
                      <span>YESTERDAY</span>
                    </div>
                    <div className="font-semibold text-white">Q69-72 Question Paper Ingestion</div>
                    <div className="text-[11px] text-zinc-400 mt-1 font-sans">Extracted 24 citations and generated study flashcards.</div>
                  </div>
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-[#00E0FF] font-bold uppercase tracking-wider mb-1">ACTIVE PROJECT</div>
                    <div className="font-bold text-white text-sm">शाश्वत Desktop OS v1.0</div>
                    <div className="text-[11px] text-zinc-400 mt-1 font-sans">Electron desktop app packaging, real-time voice, and Document AI.</div>
                  </div>
                </div>
              )}

              {activeTab === 'memory' && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-[#A78BFA] font-bold uppercase tracking-wider mb-1">STORED FACT</div>
                    <div className="text-white font-sans">User prefers dark cyberpunk UI theme with cyan & gold accents.</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-[#A78BFA] font-bold uppercase tracking-wider mb-1">PRIMARY USER</div>
                    <div className="text-white font-sans">Owner: Vikas Kajla (Verified Voice Identity).</div>
                  </div>
                </div>
              )}

              {activeTab === 'docs' && (
                <div className="space-y-3 font-mono text-xs">
                  <button
                    onClick={onOpenDocWorkspace}
                    className="w-full p-4 rounded-xl bg-[#00E0FF]/15 border border-[#00E0FF]/40 text-[#00E0FF] hover:bg-[#00E0FF]/25 font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    <span>LAUNCH DOC RESEARCHER</span>
                  </button>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

interface RightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mood: AssistantMood;
  onSelectMood: (m: AssistantMood) => void;
  onOpenSettings: () => void;
  onOpenEnrollment: () => void;
}

export const RightDrawer: React.FC<RightDrawerProps> = ({
  isOpen,
  onClose,
  mood,
  onSelectMood,
  onOpenSettings,
  onOpenEnrollment,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 pointer-events-auto"
          />

          {/* Slide-out Right Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-96 max-w-[85vw] bg-[#05070D]/95 border-l border-white/10 backdrop-blur-2xl z-50 p-6 flex flex-col pointer-events-auto text-white shadow-[-10px_0_50px_rgba(0,0,0,0.8)]"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#A78BFA]" />
                <span className="font-mono text-sm font-bold tracking-[0.2em] uppercase text-white">SYSTEM & THEMES</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Themes Section */}
            <div className="space-y-4 mb-6">
              <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#00E0FF]" />
                <span>CINEMATIC PERSONALITY THEMES</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                <button
                  onClick={() => onSelectMood('witty')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    mood === 'witty'
                      ? 'bg-[#00E0FF]/20 border-[#00E0FF] text-white shadow-[0_0_20px_rgba(0,224,255,0.3)]'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/30'
                  }`}
                >
                  <div className="font-bold text-[#00E0FF]">ETERNAL</div>
                  <div className="text-[10px] text-zinc-400 font-sans mt-0.5">Cyan · Deep Blue</div>
                </button>

                <button
                  onClick={() => onSelectMood('focused')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    mood === 'focused'
                      ? 'bg-[#A78BFA]/20 border-[#A78BFA] text-white shadow-[0_0_20px_rgba(167,139,250,0.3)]'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/30'
                  }`}
                >
                  <div className="font-bold text-[#A78BFA]">RESEARCH</div>
                  <div className="text-[10px] text-zinc-400 font-sans mt-0.5">Purple · Gold</div>
                </button>

                <button
                  onClick={() => onSelectMood('playful')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    mood === 'playful'
                      ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/30'
                  }`}
                >
                  <div className="font-bold text-emerald-400">CODING</div>
                  <div className="text-[10px] text-zinc-400 font-sans mt-0.5">Emerald · Terminal</div>
                </button>

                <button
                  onClick={() => onSelectMood('charming')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    mood === 'charming'
                      ? 'bg-[#FF4D8D]/20 border-[#FF4D8D] text-white shadow-[0_0_20px_rgba(255,77,141,0.3)]'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/30'
                  }`}
                >
                  <div className="font-bold text-[#FF4D8D]">CREATIVE</div>
                  <div className="text-[10px] text-zinc-400 font-sans mt-0.5">Pink · Amber</div>
                </button>
              </div>
            </div>

            {/* Quick System Links */}
            <div className="space-y-3 font-mono text-xs mt-auto">
              <button
                onClick={onOpenEnrollment}
                className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#FF4D8D]/40 text-white font-bold flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FF4D8D]" />
                  <span>VOICE BIOMETRICS (VOICE ID)</span>
                </div>
                <span>→</span>
              </button>

              <button
                onClick={onOpenSettings}
                className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-[#00E0FF]/40 text-white font-bold flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#00E0FF]" />
                  <span>ADVANCED SETTINGS</span>
                </div>
                <span>→</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
