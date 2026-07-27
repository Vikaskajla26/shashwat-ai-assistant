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
import {
  AssistantState,
  AssistantMood,
  VisualCardData,
  ToolExecutionEvent,
  TranscriptMessage,
  TaskExecutionPlan,
} from './types';
import { Mic, MicOff, MessageSquare, AlertCircle, PieChart, Monitor, MonitorOff, Bot, Globe } from 'lucide-react';

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
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);
  const [activePlan, setActivePlan] = useState<TaskExecutionPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      {/* Ambient Void Background with Starfield */}
      <div className="ambient-void">
        <div className="starfield" />
      </div>

      {/* Header */}
      <AssistantHeader
        state={state}
        mood={mood}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={handleToggleScreenShare}
        onDisconnect={handleToggleMic}
        onOpenTranscript={() => setIsTranscriptOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* HUD Navigation / Event Log Box */}
      <div className="hidden lg:block absolute top-28 left-10 w-96 p-5 bg-white/[0.03] border-l-2 border-blue-500 backdrop-blur-2xl z-20 font-sans shadow-2xl rounded-r-lg">
        <div className="flex justify-between items-center text-[10px] font-mono text-blue-400 mb-1.5 uppercase tracking-widest">
          <span>EVENT_LOG</span>
          <span>{latestEvent ? latestEvent.timestamp : '18:25:04'}</span>
        </div>
        <div className="text-xs font-semibold text-white mb-1 uppercase font-mono tracking-wider">
          {latestEvent ? latestEvent.toolName : 'BROWSER_NAVIGATE'}
        </div>
        <div className="text-xs text-zinc-400 leading-relaxed font-sans">
          {latestEvent
            ? latestEvent.message
            : 'Action successful: Close tab and redirecting focus to primary interface node. Neural buffers clear.'}
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
    </div>
  );
}

