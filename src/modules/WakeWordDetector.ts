/**
 * Wake Word Detector for शाश्वत AI Operating System.
 * Continuously listens in the background for "शाश्वत" or "shashwat" (and variations)
 * using Web Speech API with dual Hindi/English recognition engines.
 */

export interface WakeWordDetectorOptions {
  onWakeWord: (phrase: string) => void;
  onListeningStateChange?: (isListening: boolean) => void;
  onError?: (error: string) => void;
}

const WAKE_PATTERNS = [
  /शाश्वत/i,
  /शश्वत/i,
  /शासवत/i,
  /shashwat/i,
  /shaashvat/i,
  /shaswat/i,
  /shashvat/i,
  /saswat/i,
  /hey shashwat/i,
  /ok shashwat/i,
  /hello shashwat/i,
  /सुनो/i,
];

export class WakeWordDetector {
  private recognition: any = null;
  private isEnabled = false;
  private isListening = false;
  private options: WakeWordDetectorOptions;
  private restartTimer: any = null;
  private audioCtx: AudioContext | null = null;

  constructor(options: WakeWordDetectorOptions) {
    this.options = options;
    this.initRecognition();
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser for wake word detection.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'hi-IN'; // Default to Hindi, captures Hinglish & English phonemes well

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.options.onListeningStateChange) {
          this.options.onListeningStateChange(true);
        }
      };

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim().toLowerCase();
          console.log('[WakeWord check]', transcript);

          for (const pattern of WAKE_PATTERNS) {
            if (pattern.test(transcript)) {
              console.log('✨ Wake word detected!', transcript);
              this.playWakeSound();
              this.options.onWakeWord(transcript);

              // Briefly stop to avoid rapid multi-triggering
              this.stopTemporarily();
              return;
            }
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        // Ignore aborted error when manually stopped
        if (event.error === 'aborted' || event.error === 'no-speech') return;
        console.warn('[WakeWord Error]', event.error);
        if (this.options.onError) {
          this.options.onError(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.options.onListeningStateChange) {
          this.options.onListeningStateChange(false);
        }

        // Auto-restart if enabled
        if (this.isEnabled) {
          this.scheduleRestart(1000);
        }
      };
    } catch (err: any) {
      console.error('Failed to create SpeechRecognition:', err);
    }
  }

  private scheduleRestart(delayMs: number) {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => {
      if (this.isEnabled && !this.isListening && this.recognition) {
        try {
          this.recognition.start();
        } catch (_) {}
      }
    }, delayMs);
  }

  private stopTemporarily() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }
    // Resume listening after 3 seconds
    this.scheduleRestart(3000);
  }

  /** Play a short pleasant synth chime when wake word is detected */
  private playWakeSound() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.3);
    } catch (_) {}
  }

  public start() {
    this.isEnabled = true;
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (err) {
        console.warn('Could not start wake word recognition:', err);
      }
    }
  }

  public stop() {
    this.isEnabled = false;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (_) {}
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public isSupported(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }
}
