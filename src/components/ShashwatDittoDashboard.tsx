import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sliders,
  Send,
  Mic,
  MicOff,
  PenTool,
  BookOpen,
  Code,
  Search,
  PlusCircle,
  BarChart2,
  Calendar,
  MoreHorizontal,
  Wifi,
  Bluetooth,
  Battery,
  Home,
  Database,
  GraduationCap,
  Settings,
  Activity,
  Layers,
  ChevronRight,
  Sparkles,
  Compass,
  Monitor,
  Share2,
  X,
  Volume2,
} from 'lucide-react';
import { AssistantState } from '../types';
import { getStateTheme } from '../theme/aiState';
import { OrbScene } from './orb/OrbScene';

interface ShashwatDittoDashboardProps {
  state: AssistantState;
  stateRef: React.MutableRefObject<AssistantState>;
  volumeRef: React.MutableRefObject<number>;
  inputVolume: number;
  outputVolume: number;
  isScreenSharing: boolean;
  isSandboxOpen: boolean;
  isDocWorkspaceOpen: boolean;
  onToggleMic: () => void;
  onToggleScreenShare: () => void;
  onToggleSandbox: () => void;
  onToggleDocWorkspace: () => void;
  onOpenSanskritStudio: () => void;
  onOpenSelfLearning: () => void;
  onOpenLeftDrawer: () => void;
  onOpenRightDrawer: () => void;
  onOpenSettings: () => void;
  onSendTypedText: (text: string) => void;
}

export const ShashwatDittoDashboard: React.FC<ShashwatDittoDashboardProps> = ({
  state,
  stateRef,
  volumeRef,
  inputVolume,
  outputVolume,
  isScreenSharing,
  isSandboxOpen,
  isDocWorkspaceOpen,
  onToggleMic,
  onToggleScreenShare,
  onToggleSandbox,
  onToggleDocWorkspace,
  onOpenSanskritStudio,
  onOpenSelfLearning,
  onOpenLeftDrawer,
  onOpenRightDrawer,
  onOpenSettings,
  onSendTypedText,
}) => {
  const [typedText, setTypedText] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'memory' | 'learn' | 'system' | 'settings'>('home');
  const [currentTime, setCurrentTime] = useState('10:30 PM');
  const [focusMode, setFocusMode] = useState(true);
  const [vitalityClosed, setVitalityClosed] = useState(false);

  const theme = getStateTheme(state);
  const isActive = state !== 'disconnected';
  const isListening = state === 'listening';

  // Live time updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedText.trim()) {
      onSendTypedText(typedText.trim());
      setTypedText('');
    }
  };

  const activeVol = state === 'speaking' ? outputVolume : inputVolume;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none font-sans text-white">
      {/* ── TOP HEADER BAR ── */}
      <header className="w-full flex items-center justify-between pointer-events-auto z-30">
        {/* Left: Brand Mark */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span
              className="text-2xl font-bold tracking-wide leading-none text-white drop-shadow-[0_0_18px_rgba(168,85,247,0.6)]"
              style={{ fontFamily: '"Noto Serif Devanagari", serif' }}
            >
              शाश्वत
            </span>
            <span className="text-[10px] tracking-[0.32em] text-white/50 font-mono mt-0.5 uppercase">
              SHASHWAT <span className="text-purple-400 font-semibold ml-1">AI OS</span>
            </span>
          </div>
        </div>

        {/* Center: Audio Waveform & Status */}
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs font-medium tracking-wide text-white/70">
            {isListening ? 'Listening…' : state === 'speaking' ? 'Speaking…' : state === 'reasoning' ? 'Reasoning…' : 'Shashwat AI'}
          </span>
          {/* Animated Waveform */}
          <div className="flex items-center gap-1 h-3 px-3">
            {[0.4, 0.7, 1.0, 0.6, 0.85, 0.5, 0.9, 0.3, 0.75, 0.4].map((h, i) => (
              <motion.div
                key={i}
                animate={{
                  height: isActive ? `${Math.max(3, h * (12 + activeVol * 0.2))}px` : '3px',
                  opacity: isActive ? 0.9 : 0.3,
                }}
                transition={{ duration: 0.15, repeat: Infinity, repeatType: 'reverse', delay: i * 0.04 }}
                className="w-0.5 rounded-full bg-gradient-to-t from-purple-500 to-cyan-400"
              />
            ))}
          </div>
        </div>

        {/* Right: Status Icons & User Profile */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 text-white/60 text-xs font-mono">
            <Wifi className="w-3.5 h-3.5 text-white/80" />
            <span>{currentTime}</span>
            <Bluetooth className="w-3.5 h-3.5 text-white/80" />
            <div className="flex items-center gap-1">
              <span className="text-[11px]">100%</span>
              <Battery className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          {/* User Profile Avatar */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-9 h-9 rounded-full overflow-hidden border border-white/20 shadow-[0_0_15px_rgba(168,85,247,0.3)] bg-gradient-to-br from-purple-600 to-indigo-900 flex items-center justify-center cursor-pointer"
            onClick={onOpenRightDrawer}
          >
            <span className="text-xs font-bold text-white">V</span>
          </motion.div>
        </div>
      </header>

      {/* ── MAIN CONTENT GRID ── */}
      <div className="w-full flex-1 flex items-center justify-between my-auto relative z-20 pointer-events-none">
        {/* ── LEFT RAIL + LEFT PANELS CLUSTER ── */}
        <div className="flex items-center gap-4 pointer-events-auto">
          {/* Left Vertical Dock Rail */}
          <div className="flex flex-col items-center gap-4 p-2 rounded-3xl bg-[#0d0e19]/60 border border-white/10 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {/* Top Glowing Orb Badge */}
            <button
              onClick={onOpenLeftDrawer}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600/30 to-indigo-900/40 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            >
              <div className="w-4 h-4 rounded-full border-2 border-purple-300 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-300" />
              </div>
            </button>

            <div className="w-6 h-px bg-white/10" />

            {/* Navigation Icons */}
            <div className="flex flex-col gap-3">
              {[
                { id: 'home', icon: Home, label: 'Home' },
                { id: 'memory', icon: Database, label: 'Memory' },
                { id: 'learn', icon: GraduationCap, label: 'Learn' },
                { id: 'system', icon: Activity, label: 'System' },
                { id: 'settings', icon: Settings, label: 'Settings' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      if (item.id === 'memory') onOpenLeftDrawer();
                      if (item.id === 'learn') onOpenSelfLearning();
                      if (item.id === 'settings') onOpenSettings();
                    }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                      isSelected
                        ? 'text-purple-300 bg-purple-500/15 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                        : 'text-white/50 hover:text-white hover:bg-white/05'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[9px] font-medium tracking-wider">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Left Dashboard Glass Cards */}
          <div className="w-72 flex flex-col gap-3">
            {/* Greeting Box */}
            <div className="p-4 rounded-3xl bg-[#0c0d16]/65 border border-white/10 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-white/90">Good Evening,</h2>
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_#a855f7]" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Vikas</h1>
              <p className="text-xs text-white/60 leading-relaxed font-sans">
                I am Shashwat. How may I assist you today?
              </p>
            </div>

            {/* Current Focus Widget */}
            <div className="p-4 rounded-3xl bg-[#0c0d16]/65 border border-white/10 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Compass className="w-5 h-5 animate-spin-slow" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] uppercase font-mono tracking-wider text-white/40 mb-0.5">Current Focus</div>
                <div className="text-xs font-medium text-white/90 mb-1.5">Your Goals</div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full w-[75%]" />
                </div>
              </div>
              <span className="text-xs font-mono font-semibold text-purple-300">75%</span>
            </div>

            {/* Today's Insight Box */}
            <div className="p-4 rounded-3xl bg-[#0c0d16]/65 border border-white/10 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
              <div className="text-[10px] uppercase font-mono tracking-wider text-white/40 mb-2">Today's Insight</div>
              <div
                className="text-xs text-amber-200/90 leading-relaxed mb-2 font-medium"
                style={{ fontFamily: '"Noto Serif Devanagari", serif' }}
              >
                उद्धरेदात्मनात्मानं नात्मानमवसादयेत् ।<br />
                आत्मैव ह्यात्मनो बन्धुः
              </div>
              <p className="text-[11px] text-white/70 italic leading-snug mb-1">
                Elevate yourself by yourself. You are your own best friend.
              </p>
              <div className="text-[10px] text-white/40 font-mono">— Bhagavad Gita</div>
            </div>
          </div>
        </div>

        {/* ── CENTER HERO: 3D LIVING PLASMA ORB & MAHESHWAR SUTRAS RING ── */}
        <div className="flex-1 flex flex-col items-center justify-center relative min-h-[460px] w-full pointer-events-none">
          <span className="absolute top-4 text-[11px] tracking-[0.3em] font-mono text-purple-300/60 uppercase z-20">
            MAHESHWAR SUTRAS
          </span>
          <div className="w-[580px] h-[580px] flex items-center justify-center relative">
            <OrbScene stateRef={stateRef} volumeRef={volumeRef} width={580} height={580} />
          </div>
        </div>

        {/* ── RIGHT DASHBOARD GLASS CARDS ── */}
        <div className="w-72 flex flex-col gap-3 pointer-events-auto">
          {/* Shashwat Status Card */}
          <div className="p-4 rounded-3xl bg-[#0c0d16]/65 border border-white/10 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="text-[10px] uppercase font-mono tracking-wider text-white/40 mb-1">Shashwat Status</div>
            <div className="text-xl font-bold text-white mb-1.5 flex items-center justify-between">
              <span>{isListening ? 'Listening' : state === 'speaking' ? 'Speaking' : 'Idle'}</span>
              <div className="w-8 h-8 rounded-full border border-purple-500/30 flex items-center justify-center text-purple-400">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              </div>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              I am fully present. Speak naturally.
            </p>
          </div>

          {/* Active Modules Card */}
          <div className="p-4 rounded-3xl bg-[#0c0d16]/65 border border-white/10 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div className="text-[10px] uppercase font-mono tracking-wider text-white/40 mb-3">Active Modules</div>

            <div className="flex flex-col gap-2.5">
              {[
                { name: 'Memory Recall', status: 'Active', statusColor: 'text-emerald-400', icon: Database },
                { name: 'Knowledge Graph', status: 'Scanning', statusColor: 'text-sky-400', icon: Layers },
                { name: 'Indian Knowledge System', status: 'Online', statusColor: 'text-purple-400', icon: Brain },
                { name: 'Voice Intelligence', status: 'Listening', statusColor: 'text-amber-400', icon: Volume2 },
              ].map((mod, idx) => {
                const ModIcon = mod.icon;
                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-2xl bg-white/03 border border-white/05 hover:bg-white/08 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300">
                        <ModIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-medium text-white/90">{mod.name}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-medium ${mod.statusColor}`}>{mod.status}</span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onOpenLeftDrawer}
              className="w-full mt-3 py-1.5 flex items-center justify-center gap-1 text-[11px] font-mono text-white/50 hover:text-purple-300 transition-colors"
            >
              <span>View All Modules</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW: VITALITY WIDGET + FLOATING COMMAND DOCK + QUICK ACCESS WIDGET ── */}
      <div className="w-full flex items-end justify-between pointer-events-auto z-30">
        {/* Bottom Left: System Vitality Widget */}
        {!vitalityClosed ? (
          <div className="w-56 p-3.5 rounded-3xl bg-[#0c0d16]/70 border border-white/10 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-white/40">System Vitality</span>
              <button onClick={() => setVitalityClosed(true)} className="text-white/40 hover:text-white text-xs">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="text-sm font-semibold text-emerald-400 mb-2">Optimal</div>

            {/* Sparkline Graph */}
            <div className="h-6 flex items-end gap-1 mb-2">
              {[40, 65, 30, 80, 55, 90, 70, 45, 85, 60, 95, 75].map((val, idx) => (
                <div
                  key={idx}
                  style={{ height: `${val}%` }}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-600 to-cyan-400 opacity-80"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/08">
              <span className="text-white/60 text-[11px]">Focus Mode</span>
              <button
                onClick={() => setFocusMode(!focusMode)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  focusMode ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-white/10 text-white/50'
                }`}
              >
                {focusMode ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-56" />
        )}

        {/* Center: Floating Command Dock */}
        <div className="flex flex-col items-center gap-2">
          {/* Dock Bar */}
          <div className="relative rounded-[32px] p-2.5 flex flex-col items-center bg-[#0c0d16]/75 border border-white/15 backdrop-blur-[40px] shadow-[0_30px_60px_rgba(0,0,0,0.7),0_0_35px_rgba(168,85,247,0.15)]">
            {/* Top Prompt Hint */}
            <span className="text-xs font-medium text-white/50 mb-2 font-sans">What shall we explore today?</span>

            {/* Icon Actions */}
            <div className="flex items-center gap-2">
              {[
                { label: 'Write', icon: PenTool, onClick: onToggleDocWorkspace },
                { label: 'Read', icon: BookOpen, onClick: onToggleDocWorkspace },
                { label: 'Code', icon: Code, onClick: onToggleSandbox },
                { label: 'Research', icon: Search, onClick: onToggleSandbox },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={item.onClick}
                    className="w-10 h-10 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-white/70 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/15"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[9px] font-medium">{item.label}</span>
                  </button>
                );
              })}

              {/* Central Glowing Voice Orb Button */}
              <button
                onClick={onToggleMic}
                className="w-12 h-12 rounded-full flex items-center justify-center mx-1 relative bg-gradient-to-br from-purple-600 to-indigo-900 border border-purple-400/60 shadow-[0_0_25px_rgba(168,85,247,0.6)] hover:scale-105 transition-transform"
              >
                <div className="w-7 h-7 rounded-full bg-purple-400/20 flex items-center justify-center">
                  {isListening ? (
                    <Mic className="w-4 h-4 text-white animate-pulse" />
                  ) : (
                    <MicOff className="w-4 h-4 text-white/80" />
                  )}
                </div>
              </button>

              {[
                { label: 'Create', icon: Sparkles, onClick: onOpenSelfLearning },
                { label: 'Analyze', icon: BarChart2, onClick: onToggleDocWorkspace },
                { label: 'Calendar', icon: Calendar, onClick: onToggleSandbox },
                { label: 'More', icon: MoreHorizontal, onClick: onOpenRightDrawer },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={item.onClick}
                    className="w-10 h-10 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-white/70 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/15"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[9px] font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subtitle Caption Below Dock */}
          <span className="text-[11px] font-mono text-purple-300/70 tracking-wider">
            {state === 'reasoning' || state === 'understanding' || state === 'searching' ? 'Shashwat is thinking…' : 'Shashwat is listening…'}
          </span>
        </div>

        {/* Bottom Right: Quick Access Widget */}
        <div className="w-56 p-3.5 rounded-3xl bg-[#0c0d16]/70 border border-white/10 backdrop-blur-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] relative">
          <div className="text-[10px] uppercase font-mono tracking-wider text-white/40 mb-2">Quick Access</div>

          <div className="flex flex-col gap-2">
            {[
              { name: 'Study Corner', onClick: onToggleDocWorkspace },
              { name: 'Sanskrit Trainer', onClick: onOpenSanskritStudio },
              { name: 'Screen Share', onClick: onToggleScreenShare },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={item.onClick}
                className="flex items-center gap-2 text-xs text-white/80 hover:text-purple-300 transition-colors text-left"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>{item.name}</span>
              </button>
            ))}
          </div>

          {/* Glowing Lotus Flower Motif (Bottom Right) */}
          <div className="absolute right-3 bottom-3 text-purple-400/40 pointer-events-none">
            <span className="text-xl">🪷</span>
          </div>
        </div>
      </div>
    </div>
  );
};
