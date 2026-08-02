/**
 * Voice Subsystem Module for Shashwat AI OS.
 * Manages 16kHz PCM Audio Streamer, VAD, Wake Word Detector, and Audio Player.
 * Operates as an independent BaseModule with isolated lifecycle and restart capability.
 */

import { BaseModule } from '../BaseModule';
import { AudioStreamer } from '../../modules/AudioStreamer';
import { AudioPlayer } from '../../modules/AudioPlayer';
import { WakeWordDetector } from '../../modules/WakeWordDetector';
import { GlobalStateManager } from '../GlobalStateManager';

export class VoiceModule extends BaseModule {
  public readonly id = 'voice';
  public readonly name = 'Voice & Audio Subsystem';

  private audioStreamer: AudioStreamer | null = null;
  private audioPlayer: AudioPlayer | null = null;
  private wakeWordDetector: WakeWordDetector | null = null;
  private stateManager = GlobalStateManager.getInstance();

  public async init(): Promise<void> {
    this.logger.info(this.id, 'Initializing Voice Subsystem...');
    this.audioPlayer = new AudioPlayer();
    
    // Wake Word Detector
    this.wakeWordDetector = new WakeWordDetector({
      onWakeWord: (phrase) => {
        this.logger.info(this.id, `Wake word detected: "${phrase}"`);
        this.eventBus.emit('voice:wake_word', { phrase }, this.id);
      },
      onError: (err) => {
        this.logger.warn(this.id, `WakeWord error notice: ${err}`);
      },
    });

    this.status = 'UNINITIALIZED';
  }

  public async start(): Promise<void> {
    this.logger.info(this.id, 'Starting Voice Subsystem...');
    try {
      if (this.wakeWordDetector) {
        this.wakeWordDetector.start();
      }
      this.status = 'RUNNING';
      this.stateManager.updateState({ isMicActive: true }, this.id);
      this.logger.info(this.id, 'Voice Subsystem running.');
    } catch (err: any) {
      this.handleError(err, 'start');
    }
  }

  public async pause(): Promise<void> {
    if (this.wakeWordDetector) {
      this.wakeWordDetector.stop();
    }
    this.status = 'PAUSED';
    this.logger.info(this.id, 'Voice Subsystem paused.');
  }

  public async stop(): Promise<void> {
    this.logger.info(this.id, 'Stopping Voice Subsystem...');
    if (this.audioStreamer) {
      try {
        this.audioStreamer.stop();
      } catch (_) {}
      this.audioStreamer = null;
    }
    if (this.wakeWordDetector) {
      try {
        this.wakeWordDetector.stop();
      } catch (_) {}
      this.wakeWordDetector = null;
    }
    if (this.audioPlayer) {
      try {
        this.audioPlayer.stop();
      } catch (_) {}
      this.audioPlayer = null;
    }
    this.status = 'UNINITIALIZED';
    this.stateManager.updateState({ isMicActive: false }, this.id);
  }

  public getAudioPlayer(): AudioPlayer | null {
    return this.audioPlayer;
  }

  public getAudioStreamer(): AudioStreamer | null {
    return this.audioStreamer;
  }
}
