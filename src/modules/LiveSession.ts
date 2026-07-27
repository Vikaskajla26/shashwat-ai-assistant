import { AudioStreamer } from './AudioStreamer';
import { AudioPlayer } from './AudioPlayer';
import { ToolManager } from './ToolManager';
import { ScreenStreamer } from './ScreenStreamer';
import { AssistantState, AssistantMood, VisualCardData, ToolExecutionEvent, TranscriptMessage } from '../types';

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

  constructor(options: LiveSessionOptions) {
    this.options = options;

    this.audioPlayer = new AudioPlayer({
      onVolumeChange: (vol) => {
        this.outputVolume = vol;
        this.options.onVolumesChange(this.inputVolume, this.outputVolume);

        // If output volume > 0 and state is not speaking, update state
        if (vol > 5 && this.currentState !== 'speaking') {
          this.setState('speaking');
        }
      },
      onPlaybackEnded: () => {
        if (this.currentState === 'speaking') {
          this.setState('listening');
        }
      },
    });

    // Client-side tool manager handles only UI tools (mood, card).
    // All real tools execute server-side and never pass through here.
    this.toolManager = new ToolManager({
      onMoodChange: (mood) => this.options.onMoodChange(mood),
      onVisualCard: (card) => this.options.onVisualCard(card),
      onToolEvent: (event) => this.options.onToolEvent(event),
      onOpenDocWorkspace: () => this.options.onOpenDocWorkspace?.(),
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

        // If user is speaking loudly, interrupt playback
        if (vol > 20 && this.audioPlayer?.getIsPlaying()) {
          this.audioPlayer.interrupt();
          this.setState('listening');
        }
      },
      onError: (err) => {
        this.options.onError(`Microphone error: ${err.message}`);
      },
    });
  }

  private setState(newState: AssistantState) {
    if (this.currentState === newState) return;
    this.currentState = newState;
    this.options.onStateChange(newState);
  }

  public async connect(): Promise<void> {
    if (this.ws || this.isConnecting) return;

    this.isConnecting = true;
    this.setState('connecting');

    try {
      // Build WebSocket URL relative to window.location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        this.isConnecting = false;

        // Start microphone streamer
        try {
          await this.audioStreamer?.start();
          this.setState('listening');
        } catch (micErr: any) {
          console.warn('Microphone start failed:', micErr);
          this.options.onError('Microphone access denied. You can still listen to शाश्वत.');
          this.setState('listening');
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'audio' && msg.data) {
            this.setState('speaking');
            this.audioPlayer?.playChunk(msg.data);
          } else if (msg.type === 'interrupted') {
            this.audioPlayer?.interrupt();
            this.setState('listening');
          } else if (msg.type === 'turnComplete') {
            // End of current turn
          } else if (msg.type === 'toolCall') {
            // Server forwards UI-only tool calls (mood, card) for client execution
            const { id, name, args } = msg;
            const result = await this.toolManager.executeTool(id, name, args);
            // Send the result back to the server, which forwards it to Gemini
            this.ws?.send(
              JSON.stringify({
                type: 'toolResponse',
                id,
                name,
                response: result,
              })
            );
          } else if (msg.type === 'toolEvent') {
            // Server-side tool execution event (for display in UI)
            const toolEvent: ToolExecutionEvent = {
              id: msg.id || Date.now().toString(),
              toolName: msg.toolName,
              status: msg.status || 'success',
              message: msg.message || '',
              timestamp: msg.timestamp || new Date().toLocaleTimeString(),
              actionUrl: msg.card?.url,
            };
            this.options.onToolEvent(toolEvent);

            // Also show card if provided
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
          } else if (msg.type === 'voice_enroll_result') {
            if (msg.success) {
              this.sendGetVoiceStatus();
            }
          } else if (msg.type === 'status') {
            if (msg.message) {
              console.log('Session Status:', msg.message);
            }
          } else if (msg.type === 'error') {
            this.options.onError(msg.message || 'Live session error');
          }
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
        this.options.onError('Connection error to शाश्वत Live server');
      };

      this.ws.onclose = () => {
        this.cleanup();
      };
    } catch (err: any) {
      this.isConnecting = false;
      this.cleanup();
      this.options.onError(`Failed to connect: ${err?.message || 'Unknown error'}`);
    }
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

  public sendTextMessage(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && text.trim()) {
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

  public setMute(muted: boolean) {
    this.audioStreamer?.setMuted(muted);
  }

  public isMuted(): boolean {
    return this.audioStreamer?.getMuted() || false;
  }

  public disconnect() {
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
}
