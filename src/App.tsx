import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LiveSession } from './modules/LiveSession';
import { WakeWordDetector } from './modules/WakeWordDetector';
import { AssistantHeader } from './components/AssistantHeader';
import { VisualCardOverlay } from './components/VisualCardOverlay';
import { ToolActionBanner } from './components/ToolActionBanner';
import { TranscriptDrawer } from './components/TranscriptDrawer';
import { SettingsModal } from './components/SettingsModal';
import { openExternalUrl } from './utils/browser';
import { AISandboxBrowser } from './components/AISandboxBrowser';
import { VoiceEnrollmentModal } from './components/VoiceEnrollmentModal';
import { StudyStudioModal } from './components/docIntel/StudyStudioModal';
import { SanskritChantStudio } from './components/SanskritChantStudio';
import { SelfLearningDashboard } from './components/SelfLearningDashboard';
import { LeftDrawer, RightDrawer } from './components/CinematicPanels';
import { BottomDock } from './components/BottomDock';
import { ShashwatDittoDashboard } from './components/ShashwatDittoDashboard';
import {
  AssistantState,
  AssistantMood,
  VisualCardData,
  ToolExecutionEvent,
  TranscriptMessage,
  TaskExecutionPlan,
} from './types';
import { AlertCircle } from 'lucide-react';

import { PowerShutdownModal } from './components/PowerShutdownModal';
import { AIProviderSetupWizard } from './components/AIProviderSetupWizard';
import { AIWorkspaceModal } from './components/workspace/AIWorkspaceModal';
import { ConversationController } from './voice/ConversationController';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { ShashwatCore } from './core/ShashwatCore';

export default function App() {
  const [state, setState] = useState<AssistantState>('disconnected');
  const [mood, setMood] = useState<AssistantMood>('witty');
  const [inputVolume, setInputVolume] = useState<number>(0);
  const [outputVolume, setOutputVolume] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const activeAudioVolume = state === 'speaking' ? outputVolume : inputVolume;

  const stateRef = useRef<AssistantState>(state);
  const volumeRef = useRef<number>(activeAudioVolume);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const unsubscribe = ConversationController.getInstance().subscribe((newState: AssistantState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    volumeRef.current = activeAudioVolume;
  }, [activeAudioVolume]);

  const [cards, setCards] = useState<VisualCardData[]>([]);
  const [toolEvents, setToolEvents] = useState<ToolExecutionEvent[]>([]);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);

  const [isTranscriptOpen, setIsTranscriptOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState<boolean>(false);
  const [isDocWorkspaceOpen, setIsDocWorkspaceOpen] = useState<boolean>(false);
  const [isSanskritStudioOpen, setIsSanskritStudioOpen] = useState<boolean>(false);
  const [isSelfLearningOpen, setIsSelfLearningOpen] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);
  const [isAIWorkspaceOpen, setIsAIWorkspaceOpen] = useState<boolean>(false);
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState<boolean>(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState<boolean>(false);
  const [isPowerModalOpen, setIsPowerModalOpen] = useState<boolean>(false);
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState<boolean>(false);
  const [activePlan, setActivePlan] = useState<TaskExecutionPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Boot Shashwat OS Kernel & check startup state
  useEffect(() => {
    ShashwatCore.getInstance().boot().catch((err) => {
      console.error('[App] Core kernel boot notice:', err);
    });

    const checkInitializationOnLaunch = async () => {
      try {
        let res: any = null;
        if ((window as any).electronAPI?.systemGetInitStatus) {
          res = await (window as any).electronAPI.systemGetInitStatus();
        } else {
          res = await fetch('/api/system/init-status').then((r) => r.json());
        }

        if (res && res.success) {
          if (!res.isInitialized) {
            setIsSetupWizardOpen(true);
          } else {
            console.log('[App] Application initialized & persistent state restored successfully.');
          }
        }
      } catch (err) {
        console.warn('[App] Launch initialization check notice:', err);
      }
    };
    checkInitializationOnLaunch();
  }, []);

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
      onOpenEnrollment: () => {
        setIsEnrollmentOpen(true);
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
    } else if (toolName === 'open_sanskrit_chant_studio') {
      setIsSanskritStudioOpen(true);
      setToolEvents((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          toolName: 'open_sanskrit_chant_studio',
          status: 'success',
          message: 'Opened Sanskrit Chant Intelligence Studio',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  }, []);

  const latestEvent = toolEvents.length > 0 ? toolEvents[toolEvents.length - 1] : null;

  return (
    <GlobalErrorBoundary moduleName="Shashwat OS Root">
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#03040a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
        className="relative w-screen h-screen bg-[#03040a] text-white flex flex-col items-center justify-between overflow-hidden font-sans select-none"
      >

      {/* Volumetric Atmospheric Space Halos */}
      <div className="ambient-halo-1" />
      <div className="ambient-halo-2" />
      <div className="ambient-halo-3" />

      {/* Tool Action Banner */}
      <ToolActionBanner events={toolEvents} />

      {/* Visual Floating Cards Overlay */}
      <VisualCardOverlay cards={cards} onDismissCard={handleDismissCard} />

      {/* Ditto Reference UI Dashboard Overlay (3D Bioluminescent Orb + Full Interface) */}
      <ShashwatDittoDashboard
        state={state}
        stateRef={stateRef}
        volumeRef={volumeRef}
        inputVolume={inputVolume}
        outputVolume={outputVolume}
        isScreenSharing={isScreenSharing}
        isSandboxOpen={isSandboxOpen}
        isDocWorkspaceOpen={isDocWorkspaceOpen}
        onToggleMic={handleToggleMic}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleSandbox={() => setIsSandboxOpen((prev) => !prev)}
        onToggleDocWorkspace={() => setIsDocWorkspaceOpen((prev) => !prev)}
        onOpenSanskritStudio={() => setIsSanskritStudioOpen(true)}
        onOpenSelfLearning={() => setIsSelfLearningOpen(true)}
        onOpenLeftDrawer={() => setIsLeftDrawerOpen(true)}
        onOpenRightDrawer={() => setIsRightDrawerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSendTypedText={handleSendMessage}
        onAwake={async () => {
          if (liveSessionRef.current) {
            await liveSessionRef.current.triggerAwake();
          }
        }}
      />

      {/* Power Shutdown Confirmation Modal */}
      <PowerShutdownModal
        isOpen={isPowerModalOpen}
        onClose={() => setIsPowerModalOpen(false)}
        onConfirmShutdown={handleToggleMic}
        onPauseAssistant={() => setIsMuted(true)}
      />

      {/* Slide-out Drawers */}
      <LeftDrawer
        isOpen={isLeftDrawerOpen}
        onClose={() => setIsLeftDrawerOpen(false)}
        onOpenTranscript={() => {
          setIsLeftDrawerOpen(false);
          setIsTranscriptOpen(true);
        }}
        onOpenDocWorkspace={() => {
          setIsLeftDrawerOpen(false);
          setIsDocWorkspaceOpen(true);
        }}
      />

      <RightDrawer
        isOpen={isRightDrawerOpen}
        onClose={() => setIsRightDrawerOpen(false)}
        mood={mood}
        onSelectMood={(m) => setMood(m)}
        onOpenSettings={() => {
          setIsRightDrawerOpen(false);
          setIsSettingsOpen(true);
        }}
        onOpenEnrollment={() => {
          setIsRightDrawerOpen(false);
          setIsEnrollmentOpen(true);
        }}
      />

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
        onOpenSandbox={() => {
          setIsSettingsOpen(false);
          setIsSandboxOpen(true);
        }}
        onOpenEnrollmentModal={() => {
          setIsSettingsOpen(false);
          setIsEnrollmentOpen(true);
        }}
      />

      {/* AI Sandbox Autonomous Browser Modal */}
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
          fetch('/api/voice/enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ownerName: name, samples: samplesList }),
          }).catch((err) => console.warn('[App] Voice enroll API notice:', err));

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

      {/* 🎓 Study Studio Learning Ecosystem Modal */}
      <StudyStudioModal
        isOpen={isDocWorkspaceOpen}
        onClose={() => setIsDocWorkspaceOpen(false)}
        onSendMessage={handleSendMessage}
      />

      {/* 🕉️ Sanskrit Chant Intelligence Studio Modal */}
      {isSanskritStudioOpen && (
        <SanskritChantStudio onClose={() => setIsSanskritStudioOpen(false)} />
      )}

      {/* 🧠 Self Learning Engine & Improvement Dashboard Modal */}
      {isSelfLearningOpen && (
        <SelfLearningDashboard onClose={() => setIsSelfLearningOpen(false)} />
      )}

      {/* 📁 AI Workspace Hub Modal */}
      <AIWorkspaceModal
        isOpen={isAIWorkspaceOpen}
        onClose={() => setIsAIWorkspaceOpen(false)}
      />

      {/* AI Provider First-Run Setup Wizard */}
      <AIProviderSetupWizard
        isOpen={isSetupWizardOpen}
        onClose={() => setIsSetupWizardOpen(false)}
        onComplete={() => {
          setIsSetupWizardOpen(false);
          setErrorMessage(null);
        }}
      />

      {/* User-friendly Error Banner with Open AI Settings action */}
      {errorMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 max-w-lg w-full px-4">
          <div className="bg-slate-900/90 border border-rose-500/30 text-white p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setErrorMessage(null);
                  setIsSettingsOpen(true);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-all whitespace-nowrap"
              >
                Open AI Settings
              </button>
              <button
                onClick={() => setErrorMessage(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </GlobalErrorBoundary>
  );
}

