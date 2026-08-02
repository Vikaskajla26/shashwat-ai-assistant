/**
 * VoicePipelineEngine for Shashwat AI OS.
 * Orchestrates sub-second low-latency voice pipeline:
 * - 16kHz Int16 PCM streaming
 * - Adaptive VAD energy tracking & instant barge-in interruption
 * - 6-second anti-freeze response watchdog timer
 * - Persistent WebSocket session streaming & self-healing auto-recovery
 */

import { AudioStreamer } from '../modules/AudioStreamer';
import { AudioPlayer } from '../modules/AudioPlayer';
import { WakeWordDetector } from '../modules/WakeWordDetector';
import { diagnostics } from './VoiceDiagnostics';

import { ConversationController } from './ConversationController';

export class VoicePipelineEngine {
  private streamer: AudioStreamer;
  private player: AudioPlayer;
  private wakeDetector: WakeWordDetector;

  private isPipelineActive = false;
  private isAIResponding = false;
  private responseWatchdogTimer: any = null;
  private lastSpeechTime = 0;
  private firstAudioByteReceived = false;

  constructor() {
    this.streamer = new AudioStreamer();
    this.player = new AudioPlayer();

    this.wakeDetector = new WakeWordDetector({
      onWakeWord: (phrase) => {
        diagnostics.setWakeDetected(true);
        diagnostics.logTelemetry('WakeWord', `Detected: ${phrase}`);
        ConversationController.getInstance().transitionTo('wakeWord', `Wake word: ${phrase}`);
      },
      onError: (err) => {
        diagnostics.setLastError(err);
      },
    });

    this.player.setVolumeCallback((vol) => {
      diagnostics.updatePlaybackStatus(vol > 0 ? 'playing' : 'idle');
    });

    this.player.setOnEnded(() => {
      this.isAIResponding = false;
      this.clearResponseWatchdog();
      diagnostics.updatePlaybackStatus('idle');

      // FSM Auto-Restart: SPEAKING -> WAITING -> LISTENING
      const fsm = ConversationController.getInstance();
      if (fsm.getCurrentState() === 'speaking') {
        fsm.transitionTo('waiting', 'TTS Audio Playback Completed');
        setTimeout(() => {
          fsm.transitionTo('listening', 'Auto-reopen mic after audio completion');
        }, 300);
      }
    });
  }

  public async startPipeline(
    wsSendChunk: (base64Pcm: string) => void,
    onStateChange: (state: string) => void
  ): Promise<void> {
    if (this.isPipelineActive) return;
    this.isPipelineActive = true;
    diagnostics.updateMicStatus('active');

    try {
      this.wakeDetector.start();
      await this.streamer.start(
        (chunk) => {
          diagnostics.recordCapturedFrame(chunk.length);
          if (wsSendChunk) {
            wsSendChunk(chunk);
          }
        },
        (energy, isSpeech) => {
          diagnostics.updateVad(isSpeech, energy);

          // 1. Barge-in Interruption: If AI is speaking and user starts talking, interrupt AI!
          if (isSpeech && this.player.getIsPlaying()) {
            diagnostics.logTelemetry('BargeIn', 'User speech detected during AI playback - interrupting!');
            this.player.stopAndClear();
            this.isAIResponding = false;
            this.clearResponseWatchdog();
            onStateChange('listening');
          }

          // Track end of speech for latency calculation
          if (isSpeech) {
            this.lastSpeechTime = Date.now();
            this.firstAudioByteReceived = false;
          }
        }
      );
    } catch (err: any) {
      diagnostics.updateMicStatus('failed');
      diagnostics.setLastError(err?.message || 'Mic init error');
      this.isPipelineActive = false;
      throw err;
    }
  }

  /** Called when first audio chunk arrives from cloud AI API */
  public handleIncomingAudioChunk(base64Pcm: string): void {
    if (!this.firstAudioByteReceived && this.lastSpeechTime > 0) {
      this.firstAudioByteReceived = true;
      const latency = Date.now() - this.lastSpeechTime;
      diagnostics.setLatency(latency);
      diagnostics.logTelemetry('Latency', `First audio chunk received in ${latency}ms`);
    }

    this.isAIResponding = true;
    this.startResponseWatchdog();
    this.player.playChunk(base64Pcm);
    diagnostics.recordResponsePacket();
  }

  /** 6-second Anti-Freeze Watchdog: auto-resets pipeline if API stalls */
  private startResponseWatchdog(): void {
    this.clearResponseWatchdog();
    this.responseWatchdogTimer = setTimeout(() => {
      if (this.isAIResponding) {
        diagnostics.logTelemetry('Watchdog', 'Response watchdog triggered (6s stall). Resetting state.');
        this.player.stopAndClear();
        this.isAIResponding = false;
        diagnostics.updateState('listening');
      }
    }, 6000);
  }

  private clearResponseWatchdog(): void {
    if (this.responseWatchdogTimer) {
      clearTimeout(this.responseWatchdogTimer);
      this.responseWatchdogTimer = null;
    }
  }

  /** Force subsystem recovery without restarting the entire app */
  public forceSubsystemRecovery(): void {
    diagnostics.logTelemetry('SelfHeal', 'Subsystem recovery triggered.');
    this.player.stopAndClear();
    this.clearResponseWatchdog();
    this.isAIResponding = false;
    diagnostics.updateState('listening');
  }

  public stopPipeline(): void {
    this.isPipelineActive = false;
    this.clearResponseWatchdog();
    this.streamer.stop();
    this.player.stopAndClear();
    this.wakeDetector.stop();
    diagnostics.updateMicStatus('inactive');
  }

  public getPlayer(): AudioPlayer {
    return this.player;
  }
}
