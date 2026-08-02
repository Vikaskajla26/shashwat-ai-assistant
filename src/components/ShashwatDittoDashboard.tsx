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
  Zap,
} from 'lucide-react';
import { AssistantState } from '../types';
import { getStateTheme } from '../theme/aiState';
import { AwakeCrystalButton } from './AwakeCrystalButton';
import { VoiceDiagnosticsPanel } from '../voice/VoiceDiagnosticsPanel';
import { QuantumAICore } from './QuantumAICore';
import { AudioWaveform } from './AudioWaveform';

interface ShashwatDittoDashboardProps {
  state: AssistantState;
  stateRef: React.MutableRefObject<AssistantState>;
  volumeRef: React.MutableRefObject<number>;
  inputVolume?: number;
  outputVolume?: number;
  isScreenSharing?: boolean;
  isSandboxOpen?: boolean;
  isDocWorkspaceOpen?: boolean;
  onToggleMic: () => void;
  onAwake: () => void;
  onToggleScreenShare?: () => void;
  onToggleSandbox?: () => void;
  onToggleDocWorkspace?: () => void;
  onOpenSanskritStudio?: () => void;
  onOpenSelfLearning?: () => void;
  onOpenAIWorkspace?: () => void;
  onOpenSettings: () => void;
  onOpenLeftDrawer?: () => void;
  onOpenRightDrawer?: () => void;
  onSendTypedText?: (text: string) => void;
}

const MAHESHWAR_SUTRAS_TEXT = [
  "अ इ उ ण्", "ऋ ऌ क्", "ए ओ ङ्", "ऐ औ च्", "ह य व र ट्", "ल ण्",
  "ञ म ङ ण न म्", "झ भ ञ्", "घ ढ ध ष्", "ज ब ग ड द श्",
  "ख फ छ ठ थ च ट त व्", "क प य्", "श ष स र्", "ह ल्"
].join("   ।   ") + "   ।   ";

export const ShashwatDittoDashboard: React.FC<ShashwatDittoDashboardProps> = ({
  state,
  stateRef,
  volumeRef,
  inputVolume = 0,
  outputVolume = 0,
  onToggleMic,
  onAwake,
  onOpenSettings,
  onOpenLeftDrawer,
  onOpenRightDrawer,
}) => {
  const activeAudioVolume = volumeRef?.current ?? (state === 'speaking' ? (outputVolume ?? 0) : (inputVolume ?? 0));
  const [activeTab, setActiveTab] = useState<'Home' | 'Memory' | 'Learn' | 'System' | 'Settings'>('Home');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [focusMode, setFocusMode] = useState<boolean>(true);
  const [showVitality, setShowVitality] = useState<boolean>(true);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Keyboard shortcut Ctrl+Shift+D for Voice Diagnostics Panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowDiagnostics((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sparkline canvas ref
  const sparklineRef = useRef<HTMLCanvasElement | null>(null);
  // Starfield canvas ref
  const starCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Real-time Clock
  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      let h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      setCurrentTime(`${h}:${String(m).padStart(2, '0')} ${ampm}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 15000);
    return () => clearInterval(timer);
  }, []);

  // 2D Starfield Canvas Effect
  useEffect(() => {
    const canvas = starCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let stars: Array<{ x: number; y: number; r: number; p: number; s: number }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = [];
      const count = Math.floor((window.innerWidth * window.innerHeight) / 6500);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.75,
          r: Math.random() * 1.3 + 0.2,
          p: Math.random() * Math.PI * 2,
          s: Math.random() * 0.02 + 0.008,
        });
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    const render = () => {
      t += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const st of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * st.s * 100 + st.p);
        ctx.globalAlpha = 0.15 + tw * 0.55;
        ctx.fillStyle = '#cfe0ff';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Real-time Sparkline Graph Canvas
  useEffect(() => {
    const canvas = sparklineRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const data: number[] = Array.from({ length: 40 }, () => 10 + Math.random() * 20);

    const renderSparkline = () => {
      data.push(Math.max(6, Math.min(34, data[data.length - 1] + (Math.random() - 0.5) * 6)));
      data.shift();

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = (i / (data.length - 1)) * canvas.width;
        const y = canvas.height - v;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#7be6b0';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, 'rgba(123, 230, 176, 0.25)');
      grad.addColorStop(1, 'rgba(123, 230, 176, 0)');
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      animId = requestAnimationFrame(renderSparkline);
    };

    renderSparkline();
    return () => cancelAnimationFrame(animId);
  }, [showVitality]);

  const stateTheme = getStateTheme(state);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#03040a] font-sans text-white select-none">
      {/* ── BACKGROUND LAYERS ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 8%, rgba(90,70,160,0.20), transparent 60%),
            radial-gradient(ellipse 90% 60% at 50% 100%, rgba(30,20,60,0.55), transparent 65%),
            radial-gradient(ellipse 120% 90% at 50% 45%, rgba(10,14,30,0.9), #03040a 80%)
          `,
        }}
      />

      {/* 2D Starfield Canvas */}
      <canvas ref={starCanvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* ── HERO CENTER BIOLUMINESCENT QUANTUM AI CORE & WAVEFORM ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[52%] flex flex-col items-center justify-center gap-3 z-10 pointer-events-none">
        <QuantumAICore state={state} volume={activeAudioVolume} width={380} height={380} />
        <AudioWaveform state={state} volume={activeAudioVolume} />
      </div>

      {/* ── MAHESHWAR SUTRAS SVG ROTATING RINGS ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-30">
        {/* Outer Ring — 840px, 90s Spin */}
        <div className="w-[840px] h-[840px] animate-[spin_90s_linear_infinite]">
          <svg viewBox="0 0 880 880" className="w-full h-full">
            <defs>
              <path id="ring-outer-path" d="M 40,440 a 400,400 0 1,1 800,0 a 400,400 0 1,1 -800,0" />
            </defs>
            <circle cx="440" cy="440" r="400" fill="none" stroke="rgba(140,170,255,0.12)" strokeWidth="1" />
            <text className="font-sans text-[15px] tracking-[2px] fill-[#6fd8ff] opacity-55 font-normal">
              <textPath href="#ring-outer-path">{MAHESHWAR_SUTRAS_TEXT + MAHESHWAR_SUTRAS_TEXT}</textPath>
            </text>
          </svg>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 mix-blend-screen opacity-45">
        {/* Inner Ring — 600px, 60s Reverse Spin */}
        <div className="w-[600px] h-[600px] animate-[spin_60s_linear_infinite_reverse]">
          <svg viewBox="0 0 640 640" className="w-full h-full">
            <defs>
              <path id="ring-inner-path" d="M 40,320 a 280,280 0 1,1 560,0 a 280,280 0 1,1 -560,0" />
            </defs>
            <circle cx="320" cy="320" r="280" fill="none" stroke="rgba(185,139,255,0.12)" strokeWidth="1" />
            <text className="font-sans text-[13px] tracking-[2px] fill-[#b98bff] opacity-55 font-normal">
              <textPath href="#ring-inner-path">{MAHESHWAR_SUTRAS_TEXT + MAHESHWAR_SUTRAS_TEXT + MAHESHWAR_SUTRAS_TEXT}</textPath>
            </text>
          </svg>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[270px] text-[#6c7599] text-[12px] tracking-[4px] uppercase opacity-60 pointer-events-none z-10">
        Maheshwar Sutras
      </div>

      {/* ── WATER REFLECTION HORIZON & LOTUS GLOW ── */}
      <div className="absolute left-0 right-0 bottom-0 h-[32%] pointer-events-none z-0 bg-gradient-to-b from-transparent via-[#060812]/55 to-[#030410]/92">
        <div className="absolute inset-0 opacity-50 mix-blend-screen bg-[repeating-linear-gradient(100deg,rgba(120,150,255,0.03)_0px,rgba(120,150,255,0.03)_2px,transparent_2px,transparent_26px)]" />
      </div>

      <div className="absolute right-[6.5%] bottom-[6%] w-[220px] h-[220px] rounded-full pointer-events-none blur-[6px] animate-[lotusPulse_6s_ease-in-out_infinite] bg-[radial-gradient(circle,rgba(232,176,106,0.35),rgba(232,176,106,0.05)_55%,transparent_70%)]" />

      {/* ── TOP BAR ── */}
      <header className="absolute top-0 left-0 right-0 h-[88px] flex items-center justify-between px-10 z-20">
        {/* Brand Mark */}
        <div className="flex flex-col leading-tight">
          <div className="text-[26px] font-medium tracking-[1px] text-white">शाश्वत</div>
          <div className="text-[11px] tracking-[3px] text-[#6c7599] mt-0.5">SHASHWAT · AI OS</div>
        </div>

        {/* Status Center */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[13px] text-[#a9b3d6] tracking-[1px]">
            {stateTheme.hudLabel}…
          </div>

          {/* Waveform Animation */}
          <div className="flex items-end gap-0.5 h-[16px] opacity-85">
            {[0, 0.1, 0.2, 0.3, 0.15, 0.05, 0.25, 0.35].map((delay, idx) => (
              <span
                key={idx}
                className="w-[3px] rounded-[2px] bg-[#6fd8ff] animate-[wave_1.1s_ease-in-out_infinite]"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-4 text-[#a9b3d6] text-[13px]">
          <span className="flex items-center gap-1.5">{currentTime}</span>
          <span className="flex items-center gap-1.5">100%</span>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5a6a9a] to-[#2c3457] border border-[rgba(140,170,255,0.28)] flex items-center justify-center text-xs font-semibold text-white shadow-lg">
            V
          </div>
        </div>
      </header>

      {/* ── SIDEBAR NAVIGATION ── */}
      <aside className="absolute top-[96px] left-[24px] bottom-[110px] w-[76px] flex flex-col items-center pt-2 gap-1.5 z-20">
        {[
          { name: 'Home', icon: Home },
          { name: 'Memory', icon: Database, action: onOpenSettings },
          { name: 'Learn', icon: GraduationCap },
          { name: 'System', icon: Activity },
          { name: 'Settings', icon: Settings, action: onOpenSettings },
        ].map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.name;
          return (
            <button
              key={item.name}
              onClick={() => {
                setActiveTab(item.name as any);
                if (item.action) item.action();
              }}
              className={`w-full py-3 flex flex-col items-center gap-1.5 rounded-[14px] cursor-pointer text-[10.5px] tracking-[0.5px] transition-all duration-250 ${
                isActive
                  ? 'text-white bg-gradient-to-b from-[rgba(111,216,255,0.14)] to-[rgba(111,216,255,0.02)] shadow-[0_0_0_1px_rgba(140,170,255,0.28),0_0_22px_rgba(111,216,255,0.15)]'
                  : 'text-[#6c7599] hover:text-[#a9b3d6] hover:bg-white/03'
              }`}
            >
              <IconComponent className={`w-[20px] h-[20px] transition-all ${isActive ? 'opacity-100 drop-shadow-[0_0_6px_#6fd8ff]' : 'opacity-75'}`} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </aside>

      {/* ── LEFT STACK: GREETING & INSIGHT ── */}
      <div className="absolute top-[104px] left-[118px] w-[262px] flex flex-col gap-4 z-20">
        {/* User Greeting & Focus Goal Card */}
        <div className="p-5 rounded-[18px] bg-[rgba(14,18,32,0.42)] border border-[rgba(255,255,255,0.09)] backdrop-blur-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-[rgba(140,170,255,0.28)] transition-all">
          <div className="text-[12px] text-[#6c7599] tracking-[1px] mb-0.5">Good Evening,</div>
          <h2 className="text-[22px] font-semibold text-white mb-2.5">Vikas</h2>
          <p className="text-[13.5px] leading-[1.55] text-[#a9b3d6]">
            I am Shashwat.<br />How may I assist you today?
          </p>

          <div className="flex items-center gap-3 mt-4">
            <div className="w-[38px] h-[38px] rounded-full flex-none bg-[conic-gradient(#6fd8ff_0turn,#6fd8ff_0.75turn,rgba(255,255,255,0.08)_0turn)] flex items-center justify-center relative">
              <div className="w-[26px] h-[26px] rounded-full bg-[#070a16]" />
            </div>
            <div className="flex-1">
              <div className="text-[11.5px] text-[#6c7599]">Current Focus</div>
              <div className="text-[14px] text-white font-medium">Your Goals</div>
            </div>
          </div>

          <div className="flex items-center mt-2.5">
            <div className="h-[4px] rounded-[3px] bg-white/08 flex-1 overflow-hidden">
              <div className="h-full w-[75%] bg-gradient-to-r from-[#6fd8ff] to-[#b98bff] rounded-[3px]" />
            </div>
            <span className="text-[12px] text-[#a9b3d6] ml-2">75%</span>
          </div>
        </div>

        {/* Today's Bhagavad Gita Insight Card */}
        <div className="p-5 rounded-[18px] bg-[rgba(14,18,32,0.42)] border border-[rgba(255,255,255,0.09)] backdrop-blur-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-[rgba(140,170,255,0.28)] transition-all">
          <div className="text-[12px] text-[#6c7599] tracking-[1px] mb-2">Today's Insight</div>
          <div className="text-[15px] leading-[1.7] text-white mb-2.5 font-sans">
            उद्धरेदात्मनात्मानं नात्मानमवसादयेत् ।<br />
            आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ॥
          </div>
          <div className="text-[13px] text-[#a9b3d6] leading-[1.5]">
            Elevate yourself by yourself.<br />You are your own best friend.
          </div>
          <div className="text-[11.5px] text-[#6c7599] mt-2.5 tracking-[0.5px]">
            — Bhagavad Gita, 6.5
          </div>
        </div>
      </div>

      {/* ── RIGHT STACK: SHASHWAT STATUS & ACTIVE MODULES ── */}
      <div className="absolute top-[104px] right-[32px] w-[280px] flex flex-col gap-4 z-20">
        {/* Status Card */}
        <div className="p-5 rounded-[18px] bg-[rgba(14,18,32,0.42)] border border-[rgba(255,255,255,0.09)] backdrop-blur-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-[rgba(140,170,255,0.28)] transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <div className="text-[12px] text-[#6c7599] tracking-[1px]">Shashwat Status</div>
              <div className="text-[20px] font-semibold text-[#6fd8ff] transition-colors duration-600">
                {stateTheme.hudLabel}
              </div>
            </div>
            <div
              className="w-[44px] h-[44px] rounded-full flex-none shadow-[0_0_24px_#6fd8ff] relative"
              style={{
                background: `radial-gradient(circle at 35% 35%, #fff, ${stateTheme.hudAccent} 45%, transparent 75%)`,
              }}
            />
          </div>
          <p className="text-[13.5px] leading-[1.55] text-[#a9b3d6] mt-2">
            I am fully present.<br />Speak naturally.
          </p>
        </div>

        {/* Active Modules Stack */}
        <div className="p-5 rounded-[18px] bg-[rgba(14,18,32,0.42)] border border-[rgba(255,255,255,0.09)] backdrop-blur-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:border-[rgba(140,170,255,0.28)] transition-all">
          <div className="text-[12px] text-[#6c7599] tracking-[1px] mb-3">Active Modules</div>

          <div className="flex flex-col">
            {[
              { name: 'Memory Recall', state: 'Active', icon: Database },
              { name: 'Knowledge Graph', state: 'Scanning', icon: Layers },
              { name: 'Indian Knowledge System', state: 'Online', icon: Brain },
              { name: 'Voice Intelligence', state: 'Listening', icon: Volume2 },
            ].map((mod, idx) => {
              const ModIcon = mod.icon;
              return (
                <div key={idx} className="flex items-center gap-3 py-2.5 border-t border-white/05 first:border-t-0 first:pt-1">
                  <div className="w-[34px] h-[34px] rounded-[10px] flex-none flex items-center justify-center bg-white/04 border border-[rgba(255,255,255,0.09)]">
                    <ModIcon className="w-[16px] h-[16px] text-[#a9b3d6]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] text-white font-medium">{mod.name}</div>
                    <div className="text-[11px] text-[#6fd8ff]">{mod.state}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            onClick={onOpenRightDrawer}
            className="flex items-center justify-between mt-3 text-[12.5px] text-[#a9b3d6] hover:text-white cursor-pointer transition-colors"
          >
            <span>View All Modules</span>
            <span>›</span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM CORNER CARDS ── */}
      {/* System Vitality */}
      {showVitality && (
        <div className="absolute bottom-[28px] left-[32px] w-[220px] p-4 rounded-[18px] bg-[rgba(14,18,32,0.42)] border border-[rgba(255,255,255,0.09)] backdrop-blur-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.35)] z-20">
          <div className="flex items-center justify-between text-[12.5px] text-[#6c7599]">
            <span>System Vitality</span>
            <span onClick={() => setShowVitality(false)} className="cursor-pointer hover:text-white">✕</span>
          </div>
          <div className="text-[14px] text-[#7be6b0] font-medium mt-0.5">Optimal</div>
          <canvas ref={sparklineRef} width={200} height={40} className="w-full h-[34px] mt-2" />
          <div className="flex items-center justify-between mt-2.5 text-[12.5px] text-[#a9b3d6]">
            <span>Focus Mode<br /><span className="text-white">On</span></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#6fd8ff] shadow-[0_0_8px_#6fd8ff]" />
          </div>
        </div>
      )}

      {/* Quick Access */}
      <div className="absolute bottom-[28px] right-[32px] w-[220px] p-4 rounded-[18px] bg-[rgba(14,18,32,0.42)] border border-[rgba(255,255,255,0.09)] backdrop-blur-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.35)] z-20">
        <div className="flex items-center justify-between text-[12.5px] text-[#6c7599] mb-1">
          <span>Quick Access</span>
          <span className="text-[#e8b06a]">✦</span>
        </div>
        <div className="flex items-center gap-2.5 py-1.5 text-[13px] text-[#a9b3d6] hover:text-white cursor-pointer transition-colors">
          <BookOpen className="w-[15px] h-[15px] opacity-70" />
          <span>Study Corner</span>
        </div>
        <div className="flex items-center gap-2.5 py-1.5 text-[13px] text-[#a9b3d6] hover:text-white cursor-pointer transition-colors">
          <Brain className="w-[15px] h-[15px] opacity-70" />
          <span>Sanskrit Trainer</span>
        </div>
        <div className="flex items-center gap-2.5 py-1.5 text-[13px] text-[#a9b3d6] hover:text-white cursor-pointer transition-colors">
          <Share2 className="w-[15px] h-[15px] opacity-70" />
          <span>Screen Share</span>
        </div>
      </div>

      {/* ── CENTER HERO DOCK WRAPPER ── */}
      <div className="absolute left-1/2 bottom-[26px] -translate-x-1/2 flex flex-col items-center gap-2.5 z-30">
        {/* Floating Prompt Line */}
        <div className="text-[15px] text-[#a9b3d6] tracking-[0.2px]">
          What shall we explore today?
        </div>

        {/* Floating Glass Dock (Vision Pro Glass & Specular Edge) */}
        <div className="flex items-center gap-1.5 px-3.5 py-3 rounded-[26px] vision-glass shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          {[
            { label: 'Write', icon: PenTool },
            { label: 'Read', icon: BookOpen },
            { label: 'Code', icon: Code },
            { label: 'Research', icon: Search },
          ].map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.label}
                className="group relative flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-[16px] text-[#a9b3d6] hover:text-white hover:bg-white/04 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              >
                <ItemIcon className="w-[19px] h-[19px]" />
                <span className="text-[11px]">{item.label}</span>
                <span className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 translate-y-1 bg-[#0a0c16]/90 border border-[rgba(255,255,255,0.1)] px-2.5 py-1 rounded-[8px] text-[11px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none transition-all">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Central Apple Liquid Glass Awake Capsule Button */}
          <div className="mx-1">
            <AwakeCrystalButton state={state} onAwake={onAwake} />
          </div>

          {[
            { label: 'Create', icon: PlusCircle },
            { label: 'Analyze', icon: BarChart2 },
            { label: 'Calendar', icon: Calendar },
            { label: 'More', icon: MoreHorizontal },
          ].map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.label}
                className="group relative flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-[16px] text-[#a9b3d6] hover:text-white hover:bg-white/04 hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              >
                <ItemIcon className="w-[19px] h-[19px]" />
                <span className="text-[11px]">{item.label}</span>
                <span className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 translate-y-1 bg-[#0a0c16]/90 border border-[rgba(255,255,255,0.1)] px-2.5 py-1 rounded-[8px] text-[11px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:translate-y-0 pointer-events-none transition-all">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Thinking / Telemetry Line */}
        <div className="text-[12.5px] text-[#6c7599] tracking-[0.5px] h-[16px]">
          {`Shashwat is ${stateTheme.hudLabel.toLowerCase()}…`}
        </div>
      </div>

      {/* Voice Diagnostics Real-time Panel (Ctrl+Shift+D) */}
      {showDiagnostics && (
        <VoiceDiagnosticsPanel onClose={() => setShowDiagnostics(false)} />
      )}
    </div>
  );
};
