import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LiveSession } from './modules/LiveSession';
import { WakeWordDetector } from './modules/WakeWordDetector';
import { AssistantHeader } from './components/AssistantHeader';
import { AssistantOrb } from './components/AssistantOrb';
import { AudioVisualizer } from './components/AudioVisualizer';
import { VisualCardOverlay } from './components/VisualCardOverlay';
import { ToolActionBanner } from './components/ToolActionBanner';
import { TranscriptDrawer } from './components/TranscriptDrawer';
import { SettingsModal } from './components/SettingsModal';
import { openExternalUrl } from './utils/browser';
import { AISandboxBrowser } from './components/AISandboxBrowser';
import { VoiceEnrollmentModal } from './components/VoiceEnrollmentModal';
import { DocumentWorkspaceModal } from './components/docIntel/DocumentWorkspaceModal';
import {
  AssistantState,
  AssistantMood,
  VisualCardData,
  ToolExecutionEvent,
  TranscriptMessage,
  TaskExecutionPlan,
} from './types';
import { Mic, MicOff, MessageSquare, AlertCircle, PieChart, Monitor, MonitorOff, Bot, Globe, FileSearch } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AssistantState>('disconnected');
  const [mood, setMood] = useState<AssistantMood>('witty');
  const [inputVolume, setInputVolume] = useState<number>(0);
  const [outputVolume, setOutputVolume] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [cards, setCards] = useState<VisualCardData[]>([]);
  const [toolEvents, setToolEvents] = useState<ToolExecutionEvent[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);

  const [isTranscriptOpen, setIsTranscriptOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState<boolean>(false);
  const [isDocWorkspaceOpen, setIsDocWorkspaceOpen] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);
  const [activePlan, setActivePlan] = useState<TaskExecutionPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [speakerStatus, setSpeakerStatus] = useState<{
    status: string;
    confidence: number;
    ownerName: string;
  }>({ status: 'UNENROLLED', confidence: 1.0, ownerName: 'Guest' });

  const liveSessionRef = useRef<LiveSession | null>(null);
  const persistentWindowRef = useRef<Window | null>(null);

  // Initialize LiveSession instance
  useEffect(() => {
    const session = new LiveSession({
      onStateChange: (newState) => {
        setState(newState);
      },
      onVolumesChange: (inVol, outVol) => {
        setInputVolume(inVol);
        setOutputVolume(outVol);
      },
      onMoodChange: (newMood) => {
        setMood(newMood);
      },
      onVisualCard: (card) => {
        setCards((prev) => [card, ...prev.slice(0, 3)]);
      },
      onToolEvent: (event) => {
        setToolEvents((prev) => [...prev, event]);
        if (event.plan) {
          setActivePlan(event.plan);
          setIsSandboxOpen(true);
        } else if (
          event.toolName === 'browser_sandbox_exec' ||
          event.toolName === 'create_execution_plan' ||
          event.toolName === 'browser_navigate'
        ) {
          setIsSandboxOpen(true);
        }
      },
      onTranscriptMessage: (msg) => {
        setTranscripts((prev) => [...prev, msg]);
      },
      onScreenShareChange: (active) => {
        setIsScreenSharing(active);
      },
      onSpeakerVerification: (res) => {
        setSpeakerStatus({ status: res.status, confidence: res.confidence, ownerName: res.ownerName });
      },
      onVoiceStatus: (status) => {
        if (!status.enrolled) {
          setSpeakerStatus({ status: 'UNENROLLED', confidence: 1.0, ownerName: 'Guest' });
        } else {
          setSpeakerStatus((prev) => ({ ...prev, ownerName: status.ownerName }));
        }
      },
      onOpenDocWorkspace: () => {
        setIsDocWorkspaceOpen(true);
      },
      onError: (err) => {
        console.error('Session Error:', err);
        setErrorMessage(err);
      },
    });

    liveSessionRef.current = session;

    return () => {
      session.disconnect();
    };
  }, []);

  // Initialize Wake Word Detector for hands-free "शाश्वत" or "shashwat" wake activation
  const wakeWordDetectorRef = useRef<WakeWordDetector | null>(null);

  useEffect(() => {
    const detector = new WakeWordDetector({
      onWakeWord: (phrase) => {
        console.log('⚡ Wake word triggered by phrase:', phrase);
        setErrorMessage(null);
        if (liveSessionRef.current) {
          liveSessionRef.current.connect();
        }
      },
    });

    wakeWordDetectorRef.current = detector;
    detector.start();

    return () => {
      detector.stop();
    };
  }, []);

  // Handlers
  const handleToggleMic = useCallback(() => {
    setErrorMessage(null);
    if (state === 'disconnected') {
      liveSessionRef.current?.connect();
    } else {
      liveSessionRef.current?.disconnect();
    }
  }, [state]);

  const handleToggleScreenShare = useCallback(async () => {
    setErrorMessage(null);
    if (liveSessionRef.current?.isScreenSharing()) {
      liveSessionRef.current.stopScreenShare();
      setIsScreenSharing(false);
    } else {
      if (state === 'disconnected') {
        await liveSessionRef.current?.connect();
      }
      const ok = await liveSessionRef.current?.startScreenShare();
      if (ok) {
        setIsScreenSharing(true);
      }
    }
  }, [state]);

  const handleSendMessage = useCallback((text: string) => {
    if (state === 'disconnected') {
      liveSessionRef.current?.connect().then(() => {
        setTimeout(() => liveSessionRef.current?.sendTextMessage(text), 800);
      });
    } else {
      liveSessionRef.current?.sendTextMessage(text);
    }
  }, [state]);

  const handleDismissCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleClearHistory = useCallback(() => {
    setTranscripts([]);
  }, []);

  const handleTriggerTestTool = useCallback((toolName: string) => {
    if (toolName === 'openWebsite') {
      const url = 'https://youtube.com';
      openExternalUrl(url, '_blank');

      setToolEvents((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          toolName: 'openWebsite',
          status: 'success',
          message: 'Opening https://youtube.com in browser',
          timestamp: new Date().toLocaleTimeString(),
          actionUrl: url,
        },
      ]);
    } else if (toolName === 'changeAssistantMood') {
      const moods: AssistantMood[] = ['witty', 'playful', 'focused', 'charming', 'energetic'];
      const nextMood = moods[Math.floor(Math.random() * moods.length)];
      setMood(nextMood);
      setToolEvents((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          toolName: 'changeAssistantMood',
          status: 'success',
          message: `Changed mood to ${nextMood}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } else if (toolName === 'showVisualCard') {
      const newCard: VisualCardData = {
        id: Date.now().toString(),
        title: 'शाश्वत Wisdom Tip',
        content: '“Confidence combined with witty warmth creates unstoppable charisma.”',
        category: 'Assistant Quote',
        timestamp: new Date().toLocaleTimeString(),
      };
      setCards((prev) => [newCard, ...prev.slice(0, 3)]);
      setToolEvents((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          toolName: 'showVisualCard',
          status: 'success',
          message: 'Displayed card',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  }, []);

  const activeAudioVolume = state === 'speaking' ? outputVolume : inputVolume;
  const latestEvent = toolEvents.length > 0 ? toolEvents[toolEvents.length - 1] : null;

  return (
    <div className="relative w-screen h-screen bg-[#030303] text-white flex flex-col items-center justify-between overflow-hidden font-sans select-none">
      {/* Ambient Radial Halos & Particles */}
      <div className="ambient-halo-1" />
      <div className="ambient-halo-2" />
      <div className="ambient-halo-3" />

      {/* Header */}
      <AssistantHeader
        state={state}
        mood={mood}
        speakerStatus={speakerStatus}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={handleToggleScreenShare}
        onDisconnect={handleToggleMic}
        onOpenTranscript={() => setIsTranscriptOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenEnrollment={() => setIsEnrollmentOpen(true)}
        onOpenDocWorkspace={() => setIsDocWorkspaceOpen(true)}
      />

      {/* LEFT PANEL: Glassmorphic Cyberpunk Event Log */}
      <div className="hidden xl:block absolute top-28 left-8 w-80 glass-panel p-5 z-20 font-sans shadow-2xl">
        <div className="flex justify-between items-center text-[10px] font-mono text-[#00E0FF] mb-2 uppercase tracking-[0.2em] border-b border-white/10 pb-2">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E0FF] animate-pulse" />
            EVENT_LOG
          </span>
          <span>{latestEvent ? latestEvent.timestamp : '18:25:04'}</span>
        </div>
        <div className="text-xs font-bold text-white mb-1 uppercase font-mono tracking-wider">
          {latestEvent ? latestEvent.toolName : 'NEURAL_SYSTEM_ACTIVE'}
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed font-sans">
          {latestEvent
            ? latestEvent.message
            : 'Neural memory pipeline initialized. Real-time audio biometrics & live session ready.'}
        </p>
      </div>

      {/* RIGHT PANEL: Health-App Style Quick Intelligence Widgets */}
      <div className="hidden xl:flex flex-col gap-3.5 absolute top-28 right-8 w-72 z-20">
        {/* Widget 1: AI Confidence % */}
        <div className="glass-panel widget-card-cyan p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold text-[#00E0FF] uppercase tracking-wider mb-0.5">AI CONFIDENCE</div>
            <div className="text-xl font-bold text-white font-mono">98.4%</div>
            <div className="text-[10px] text-zinc-400">High Precision Model</div>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-[#00E0FF] flex items-center justify-center text-[#00E0FF] shadow-[0_0_15px_#00E0FF]">
            <span className="text-xs font-bold">98%</span>
          </div>
        </div>

        {/* Widget 2: Voice Clarity */}
        <div className="glass-panel widget-card-purple p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold text-[#A78BFA] uppercase tracking-wider mb-0.5">VOICE CLARITY</div>
            <div className="text-xl font-bold text-white font-mono">96.8%</div>
            <div className="text-[10px] text-zinc-400">16kHz Int16 Stream</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/20 border border-[#A78BFA]/40 flex items-center justify-center text-[#A78BFA]">
            <span className="text-xs font-bold font-mono">HD</span>
          </div>
        </div>

        {/* Widget 3: Response Speed */}
        <div className="glass-panel widget-card-pink p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold text-[#FF4D8D] uppercase tracking-wider mb-0.5">RESPONSE SPEED</div>
            <div className="text-xl font-bold text-white font-mono">180 ms</div>
            <div className="text-[10px] text-zinc-400">Ultra-Low Latency</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FF4D8D]/20 border border-[#FF4D8D]/40 flex items-center justify-center text-[#FF4D8D]">
            <span className="text-xs font-bold font-mono">⚡</span>
          </div>
        </div>

        {/* Widget 4: System Load */}
        <div className="glass-panel widget-card-blue p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono font-bold text-[#22D3EE] uppercase tracking-wider mb-0.5">SYSTEM LOAD</div>
            <div className="text-xl font-bold text-white font-mono">14.2%</div>
            <div className="text-[10px] text-zinc-400">Optimal Runtime</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/20 border border-[#22D3EE]/40 flex items-center justify-center text-[#22D3EE]">
            <span className="text-xs font-bold font-mono">OK</span>
          </div>
        </div>
      </div>

      {/* Tool Action Banner */}
      <ToolActionBanner events={toolEvents} />

      {/* Error Toast */}
      {errorMessage && (
        <div className="absolute top-20 z-50 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2 backdrop-blur-md max-w-md">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-zinc-400 hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Center Interactive Orb Viewport */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-2xl px-4 my-auto">
        <AssistantOrb
          state={state}
          mood={mood}
          volume={activeAudioVolume}
          inputVolume={inputVolume}
          outputVolume={outputVolume}
          isMuted={isMuted}
          onToggleConnection={handleToggleMic}
          onToggleMute={() => setIsMuted((prev) => !prev)}
        />

        {/* Live Audio Spectrum */}
        <div className="w-full max-w-sm mt-4">
          <AudioVisualizer volume={activeAudioVolume} isActive={state !== 'disconnected'} />
        </div>
      </main>

      {/* Visual Floating Cards Overlay */}
      <VisualCardOverlay cards={cards} onDismissCard={handleDismissCard} />

      {/* Footer Controls matching Design HTML */}
      <footer className="z-30 w-full pb-10 pt-4 flex items-center justify-center gap-6 sm:gap-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-auto">
        {/* Conversation Log Toggle Button */}
        <button
          id="shashwat-transcript-toggle"
          onClick={() => setIsTranscriptOpen(true)}
          className="action-btn cursor-pointer"
          title="Conversation Log"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Screen Share Action Button */}
        <button
          onClick={handleToggleScreenShare}
          className={`action-btn cursor-pointer transition-all ${
            isScreenSharing
              ? '!border-emerald-500 !bg-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
              : ''
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Start Screen Share (Visual Assistant)'}
        >
          {isScreenSharing ? (
            <MonitorOff className="w-5 h-5 text-emerald-400" />
          ) : (
            <Monitor className="w-5 h-5" />
          )}
        </button>

        {/* AI Sandbox Browser Workspace Button */}
        <button
          id="shashwat-sandbox-browser-toggle"
          onClick={() => setIsSandboxOpen((prev) => !prev)}
          className={`action-btn cursor-pointer transition-all ${
            isSandboxOpen
              ? '!border-blue-400 !bg-blue-600/30 text-blue-200 shadow-[0_0_25px_rgba(59,130,246,0.5)] ring-1 ring-blue-400/50'
              : 'hover:border-blue-400/50'
          }`}
          title="Autonomous AI Sandbox Workspace Browser"
        >
          <Globe className="w-5 h-5 text-blue-400" />
        </button>

        {/* Document Intelligence & AI Research Workspace Button */}
        <button
          id="shashwat-doc-intel-toggle"
          onClick={() => setIsDocWorkspaceOpen((prev) => !prev)}
          className={`action-btn cursor-pointer transition-all ${
            isDocWorkspaceOpen
              ? '!border-cyan-400 !bg-cyan-600/30 text-cyan-200 shadow-[0_0_25px_rgba(6,182,212,0.5)] ring-1 ring-cyan-400/50'
              : 'hover:border-cyan-400/50'
          }`}
          title="Document Intelligence & AI Researcher Workspace"
        >
          <FileSearch className="w-5 h-5 text-cyan-400" />
        </button>

        {/* Primary Action Button */}
        <button
          onClick={handleToggleMic}
          className={`action-btn primary cursor-pointer transition-transform duration-300 ${
            state !== 'disconnected' ? 'animate-pulse' : ''
          }`}
          title={state === 'disconnected' ? 'Start Session' : 'End Session'}
        >
          {state === 'disconnected' ? (
            <Mic className="w-7 h-7 text-white" />
          ) : (
            <MicOff className="w-7 h-7 text-white" />
          )}
        </button>

        {/* Analysis Mode Button (Opens Settings / Tools) */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="action-btn cursor-pointer"
          title="Analysis Mode & Settings"
        >
          <PieChart className="w-5 h-5" />
        </button>
      </footer>

      {/* Transcript Drawer */}
      <TranscriptDrawer
        isOpen={isTranscriptOpen}
        messages={transcripts}
        onClose={() => setIsTranscriptOpen(false)}
        onSendMessage={handleSendMessage}
        onClearHistory={handleClearHistory}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        state={state}
        currentMood={mood}
        onClose={() => setIsSettingsOpen(false)}
        onChangeMood={(newMood) => setMood(newMood)}
        onTriggerTestTool={handleTriggerTestTool}
      />

      {/* Autonomous AI Sandbox Workspace Browser */}
      <AISandboxBrowser
        isOpen={isSandboxOpen}
        onClose={() => setIsSandboxOpen(false)}
        activePlan={activePlan}
        onExecutePrompt={handleSendMessage}
      />

      {/* Voice Identity Enrollment Modal */}
      <VoiceEnrollmentModal
        isOpen={isEnrollmentOpen}
        onClose={() => setIsEnrollmentOpen(false)}
        onEnrollComplete={(name, samplesList) => {
          if (liveSessionRef.current) {
            if (state === 'disconnected') {
              liveSessionRef.current.connect().then(() => {
                setTimeout(() => liveSessionRef.current?.sendVoiceEnrollSamples(name, samplesList), 600);
              });
            } else {
              liveSessionRef.current.sendVoiceEnrollSamples(name, samplesList);
            }
          }
        }}
      />

      {/* Document Intelligence & AI Research Workspace Modal */}
      <DocumentWorkspaceModal
        isOpen={isDocWorkspaceOpen}
        onClose={() => setIsDocWorkspaceOpen(false)}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}

