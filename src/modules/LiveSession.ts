import { AudioStreamer } from './AudioStreamer';
import { AudioPlayer } from './AudioPlayer';
import { ToolManager } from './ToolManager';
import { ScreenStreamer } from './ScreenStreamer';
import { AssistantState, AssistantMood, AssistantPhase, VisualCardData, ToolExecutionEvent, TranscriptMessage } from '../types';

export interface TelemetryLog {
  timestamp: string;
  type: string;
  message: string;
  latencyMs?: number;
}

export interface LiveSessionOptions {
  onStateChange: (state: AssistantState) => void;
  onVolumesChange: (inputVol: number, outputVol: number) => void;
  onMoodChange: (mood: AssistantMood) => void;
  onVisualCard: (card: VisualCardData) => void;
  onToolEvent: (event: ToolExecutionEvent) => void;
  onTranscriptMessage?: (msg: TranscriptMessage) => void;
  onScreenShareChange?: (isSharing: boolean) => void;
  onSpeakerVerification?: (res: { status: string; confidence: number; ownerName: string; message: string }) => void;
  onVoiceStatus?: (status: { enrolled: boolean; ownerName: string }) => void;
  onOpenDocWorkspace?: () => void;
  onOpenEnrollment?: () => void;
  onPhase?: (phase: AssistantPhase) => void;
  onTurnComplete?: () => void;
  onTelemetry?: (log: TelemetryLog) => void;
  onError: (errorMsg: string) => void;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private audioStreamer: AudioStreamer | null = null;
  private audioPlayer: AudioPlayer | null = null;
  private screenStreamer: ScreenStreamer | null = null;
  private toolManager: ToolManager;

  private currentState: AssistantState = 'disconnected';
  private options: LiveSessionOptions;

  private inputVolume = 0;
  private outputVolume = 0;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;

  // Watchdog timer for freeze recovery
  private watchdogTimer: any = null;
  private speechStartTime = 0;

  // Telemetry logs
  private telemetryLogs: TelemetryLog[] = [];

  constructor(options: LiveSessionOptions) {
    this.options = options;

    this.audioPlayer = new AudioPlayer({
      onVolumeChange: (vol) => {
        this.outputVolume = vol;
        this.options.onVolumesChange(this.inputVolume, this.outputVolume);

        if (vol > 0.05 && this.currentState !== 'speaking') {
          this.setState('speaking');
        }
      },
      onPlaybackEnded: () => {
        this.clearWatchdog();
        if (this.currentState === 'speaking') {
          this.setState('listening');
        }
      },
    });

    this.toolManager = new ToolManager({
      onMoodChange: options.onMoodChange,
      onVisualCard: options.onVisualCard,
      onToolEvent: options.onToolEvent,
      onOpenDocWorkspace: options.onOpenDocWorkspace,
      onOpenEnrollment: options.onOpenEnrollment,
    });

    this.screenStreamer = new ScreenStreamer({
      onFrame: (base64Jpeg) => {
        this.sendImageInput(base64Jpeg);
      },
      onEnded: () => {
        if (this.options.onScreenShareChange) {
          this.options.onScreenShareChange(false);
        }
      },
      onError: (err) => {
        this.options.onError(`Screen share error: ${err.message}`);
      },
    });

    this.audioStreamer = new AudioStreamer({
      onAudioData: (base64Pcm) => {
        this.sendAudioInput(base64Pcm);
      },
      onVolumeChange: (vol) => {
        this.inputVolume = vol;
        this.options.onVolumesChange(this.inputVolume, this.outputVolume);

        // VAD Speech Detection Trigger
        if (vol > 0.15) {
          if (this.speechStartTime === 0) {
            this.speechStartTime = Date.now();
            this.logTelemetry('Speech Detected', `Input level ${(vol * 100).toFixed(0)}%`);
          }

          // Barge-in: Interrupt playback if user speaks while AI is speaking
          if (this.audioPlayer?.getIsPlaying()) {
            this.logTelemetry('Barge-In Interruption', 'User spoke during playback');
            this.audioPlayer.interrupt();
            this.setState('listening');
          }

          // Start watchdog timer when user starts speaking
          this.resetWatchdog();
        }
      },
      onError: (err) => {
        this.logTelemetry('Microphone Error', err.message);
        this.options.onError(`Microphone error: ${err.message}`);
      },
    });
  }

  private logTelemetry(type: string, message: string, latencyMs?: number) {
    const log: TelemetryLog = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      latencyMs,
    };
    this.telemetryLogs.push(log);
    if (this.telemetryLogs.length > 100) this.telemetryLogs.shift();
    this.options.onTelemetry?.(log);
    console.log(`[VoicePipeline] [${log.timestamp}] ${type}: ${message}${latencyMs ? ` (${latencyMs}ms)` : ''}`);
  }

  private setState(newState: AssistantState) {
    if (this.currentState === newState) return;
    const oldState = this.currentState;
    this.currentState = newState;

    const latency = this.speechStartTime > 0 ? Date.now() - this.speechStartTime : undefined;
    this.logTelemetry('State Transition', `${oldState} ➔ ${newState}`, latency);

    if (newState === 'speaking' || newState === 'idle' || newState === 'listening') {
      this.speechStartTime = 0;
    }

    // Set auto-recovery watchdog on thinking/reasoning/searching
    if (newState === 'reasoning' || newState === 'searching' || newState === 'understanding') {
      this.resetWatchdog();
    }

    this.options.onStateChange(newState);
  }

  /** Watchdog timer to recover from stuck listening/thinking state */
  private resetWatchdog() {
    this.clearWatchdog();
    this.watchdogTimer = setTimeout(() => {
      if (this.currentState === 'reasoning' || this.currentState === 'searching' || this.currentState === 'understanding' || this.currentState === 'listening') {
        this.logTelemetry('Watchdog Auto-Recovery', 'Voice pipeline timeout after 6s — resetting to listening state');
        this.options.onError('Voice response delayed. Ready for your next command.');
        this.setState('listening');
      }
    }, 6000);
  }

  private clearWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  public async connect(): Promise<void> {
    if (this.ws || this.isConnecting) return;

    this.isConnecting = true;
    this.logTelemetry('Connection', 'Initiating WebSocket connection...');
    this.setState('connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.logTelemetry('Connection Status', 'WebSocket connected successfully');

        this.audioPlayer?.unlockAudio();

        try {
          await this.audioStreamer?.start();
          this.logTelemetry('Microphone Status', 'Microphone active and streaming PCM chunks');
          this.setState('listening');
        } catch (micErr: any) {
          this.logTelemetry('Microphone Error', micErr?.message || 'Mic access denied');
          this.options.onError('Microphone access denied. You can still chat with text.');
          this.setState('listening');
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'audio' && msg.data) {
            this.clearWatchdog();
            this.setState('speaking');
            this.audioPlayer?.playChunk(msg.data);
          } else if (msg.type === 'interrupted') {
            this.clearWatchdog();
            this.audioPlayer?.interrupt();
            this.setState('listening');
          } else if (msg.type === 'turnComplete') {
            this.clearWatchdog();
            this.options.onTurnComplete?.();
            this.setState('listening');
          } else if (msg.type === 'phase') {
            if (msg.phase) {
              this.options.onPhase?.(msg.phase as AssistantPhase);
            }
          } else if (msg.type === 'toolCall') {
            const { id, name, args } = msg;
            this.logTelemetry('Tool Call', `Executing ${name}`);
            const result = await this.toolManager.executeTool(id, name, args);
            this.ws?.send(
              JSON.stringify({
                type: 'toolResponse',
                id,
                name,
                response: result,
              })
            );
          } else if (msg.type === 'toolEvent') {
            const targetUrl = msg.card?.url || msg.url;
            const toolEvent: ToolExecutionEvent = {
              id: msg.id || Date.now().toString(),
              toolName: msg.toolName,
              status: msg.status || 'success',
              message: msg.message || '',
              timestamp: msg.timestamp || new Date().toLocaleTimeString(),
              actionUrl: targetUrl,
            };
            this.options.onToolEvent(toolEvent);

            if (targetUrl && (msg.toolName === 'open_website' || msg.toolName === 'searchYouTube' || msg.toolName === 'playFirstVideo')) {
              try {
                if ((window as any).electronAPI?.openExternal) {
                  (window as any).electronAPI.openExternal(targetUrl);
                } else {
                  window.open(targetUrl, '_blank', 'noopener,noreferrer');
                }
              } catch (_) {}
            }

            if (msg.card) {
              this.options.onVisualCard({
                id: Date.now().toString(),
                title: msg.card.title,
                content: msg.card.content,
                category: msg.card.category,
                timestamp: msg.timestamp || new Date().toLocaleTimeString(),
                url: msg.card.url,
              });
            }
          } else if (msg.type === 'transcription') {
            this.clearWatchdog();
            if (this.options.onTranscriptMessage) {
              this.options.onTranscriptMessage({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
                role: msg.role === 'user' ? 'user' : 'model',
                text: msg.text,
                timestamp: new Date().toLocaleTimeString(),
              });
            }
          } else if (msg.type === 'speaker_verification') {
            if (this.options.onSpeakerVerification && msg.result) {
              this.options.onSpeakerVerification(msg.result);
            }
          } else if (msg.type === 'voice_status') {
            if (this.options.onVoiceStatus) {
              this.options.onVoiceStatus({ enrolled: msg.enrolled, ownerName: msg.ownerName });
            }
          } else if (msg.type === 'error') {
            this.logTelemetry('Session Error', msg.message || 'Live session error');
            this.options.onError(msg.message || 'Live session error');
            this.resetWatchdog();
          }
        } catch (err) {
          console.error('[LiveSession] Error handling WebSocket message:', err);
        }
      };

      this.ws.onerror = (err) => {
        this.logTelemetry('WebSocket Error', 'Connection error encountered');
        this.options.onError('Connection error to Live server');
      };

      this.ws.onclose = () => {
        this.logTelemetry('Connection Closed', 'WebSocket closed. Attempting auto-reconnect...');
        this.handleAutoReconnect();
      };
    } catch (err: any) {
      this.isConnecting = false;
      this.handleAutoReconnect();
      this.options.onError(`Failed to connect: ${err?.message || 'Unknown error'}`);
    }
  }

  private handleAutoReconnect() {
    this.cleanup();
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(5000, 1000 * Math.pow(2, this.reconnectAttempts - 1));
      this.logTelemetry('Auto Reconnect', `Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      this.setState('disconnected');
      this.options.onError('Voice session disconnected. Click Awake to reconnect.');
    }
  }

  /**
   * Awake Button Action: Immediately wakes up or connects the voice session,
   * transitions state to listening, and sends text prompt if needed.
   */
  public async triggerAwake(): Promise<void> {
    this.logTelemetry('Awake Button', 'User clicked Awake button');
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }
    this.audioPlayer?.unlockAudio();
    this.setState('listening');
    this.sendTextMessage("Hello Shashwat, I'm listening!");
  }

  private sendAudioInput(base64Pcm: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'audio',
          data: base64Pcm,
        })
      );
    }
  }

  private sendImageInput(base64Jpeg: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'image',
          mimeType: 'image/jpeg',
          data: base64Jpeg,
        })
      );
    }
  }

  public sendTextMessage(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && text.trim()) {
      this.logTelemetry('Request Sent', `Text prompt: "${text.substring(0, 30)}..."`);
      this.resetWatchdog();
      this.ws.send(
        JSON.stringify({
          type: 'text',
          text,
        })
      );
      if (this.options.onTranscriptMessage) {
        this.options.onTranscriptMessage({
          id: Date.now().toString(),
          role: 'user',
          text,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    }
  }

  public async startScreenShare(): Promise<boolean> {
    if (!this.screenStreamer) return false;
    const ok = await this.screenStreamer.start();
    if (ok && this.options.onScreenShareChange) {
      this.options.onScreenShareChange(true);
    }
    return ok;
  }

  public stopScreenShare(): void {
    this.screenStreamer?.stop();
    if (this.options.onScreenShareChange) {
      this.options.onScreenShareChange(false);
    }
  }

  public isScreenSharing(): boolean {
    return this.screenStreamer?.getIsStreaming() || false;
  }

  public setMute(muted: boolean) {
    this.audioStreamer?.setMuted(muted);
    this.logTelemetry('Mute Toggle', `Muted: ${muted}`);
  }

  public isMuted(): boolean {
    return this.audioStreamer?.getMuted() || false;
  }

  public getTelemetryLogs(): TelemetryLog[] {
    return this.telemetryLogs;
  }

  public disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
    this.cleanup();
  }

  private cleanup() {
    this.isConnecting = false;
    this.clearWatchdog();
    this.audioStreamer?.stop();
    this.screenStreamer?.stop();
    this.audioPlayer?.interrupt();
    this.setState('disconnected');
    this.options.onVolumesChange(0, 0);
    if (this.options.onScreenShareChange) {
      this.options.onScreenShareChange(false);
    }
  }

  public getState(): AssistantState {
    return this.currentState;
  }

  public sendVoiceEnrollSamples(ownerName: string, samples: string[]) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'voice_enroll_samples',
          ownerName,
          samples,
        })
      );
    }
  }

  public sendDeleteVoiceProfile() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'voice_delete' }));
    }
  }

  public sendGetVoiceStatus() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'voice_get_status' }));
    }
  }

  public emitLocalPhase(phase: AssistantPhase) {
    this.options.onPhase?.(phase);
  }
}
