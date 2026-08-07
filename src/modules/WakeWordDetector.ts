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
  // Devanagari Variations
  /शाश्वत/i,
  /शश्वत/i,
  /शासवत/i,
  /सास्वत/i,
  /स्वासत/i,
  /हे शाश्वत/i,
  /हे शासवत/i,
  /हे शश्वत/i,
  /हाय शाश्वत/i,
  /हेलो शाश्वत/i,
  /नमस्ते शाश्वत/i,
  /सुनो शाश्वत/i,
  /सुनो/i,
  // Latin / English Variations
  /shashwat/i,
  /shaashvat/i,
  /shaswat/i,
  /shashvat/i,
  /saswat/i,
  /shasvat/i,
  /swashwat/i,
  /swaswat/i,
  /hey shashwat/i,
  /hey shaswat/i,
  /hey saswat/i,
  /hi shashwat/i,
  /hi shaswat/i,
  /hello shashwat/i,
  /hello shaswat/i,
  /ok shashwat/i,
  /okay shashwat/i,
];

export class WakeWordDetector {
  private recognition: any = null;
  private isEnabled = false;
  private isListening = false;
  private options: WakeWordDetectorOptions;
  private restartTimer: any = null;
  private audioCtx: AudioContext | null = null;
  private _networkErrorCount = 0;
  private currentLang: 'hi-IN' | 'en-IN' = 'hi-IN';

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
      this.recognition.lang = this.currentLang;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.options.onListeningStateChange) {
          this.options.onListeningStateChange(true);
        }
      };

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const rawTranscript = event.results[i][0].transcript.trim();
          const transcript = rawTranscript.toLowerCase();
          console.log('[WakeWord check]', transcript);

          // Check regex patterns
          let matched = WAKE_PATTERNS.some((pattern) => pattern.test(transcript));

          // Substring fallback check for key roots
          if (!matched) {
            const lower = transcript.toLowerCase();
            if (
              lower.includes('shashwat') ||
              lower.includes('shaswat') ||
              lower.includes('shashvat') ||
              lower.includes('saswat') ||
              lower.includes('शाश्वत') ||
              lower.includes('शासवत') ||
              lower.includes('शश्वत')
            ) {
              matched = true;
            }
          }

          if (matched) {
            console.log('✨ Wake word detected!', rawTranscript);
            this.playWakeSound();
            this.options.onWakeWord(rawTranscript);

            // Briefly stop to avoid rapid multi-triggering
            this.stopTemporarily();
            return;
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        // Ignore aborted/no-speech errors when manually stopped
        if (event.error === 'aborted' || event.error === 'no-speech') return;
        // Offline: 'network' error - slow down retries dramatically to avoid spam
        if (event.error === 'network') {
          this._networkErrorCount = (this._networkErrorCount || 0) + 1;
          if (this._networkErrorCount > 3) {
            this.isEnabled = false;
            console.warn('[WakeWord] Network unavailable - wake word detection paused. Will retry on next Awaken click.');
            return;
          }
        } else {
          this._networkErrorCount = 0;
        }
        if (this.options.onError) {
          this.options.onError(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.options.onListeningStateChange) {
          this.options.onListeningStateChange(false);
        }

        // Auto-restart if enabled — use longer delay after network errors
        if (this.isEnabled) {
          const delay = (this._networkErrorCount || 0) > 0 ? 30000 : 1000;
          this.scheduleRestart(delay);
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
    this._networkErrorCount = 0; // Reset network error count on manual start
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
