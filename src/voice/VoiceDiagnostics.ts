export interface VoicePipelineStageStatus {
  micInit: 'idle' | 'requesting' | 'active' | 'blocked' | 'error';
  vadDetected: boolean;
  vadEnergy: number; // 0..1
  framesCaptured: number;
  bytesTransmitted: number;
  wsState: 'CLOSED' | 'CONNECTING' | 'OPEN' | 'CLOSING';
  requestsSent: number;
  responsesReceived: number;
  currentState: string;
  lastError: string | null;
  latencyMs: number | null; // end-of-speech to audio playback start
  playbackStatus: 'idle' | 'buffering' | 'playing' | 'error';
  reconnectCount: number;
}

type Listener = (metrics: VoicePipelineStageStatus) => void;

export class VoiceDiagnostics {
  private static instance: VoiceDiagnostics;

  private state: VoicePipelineStageStatus = {
    micInit: 'idle',
    vadDetected: false,
    vadEnergy: 0,
    framesCaptured: 0,
    bytesTransmitted: 0,
    wsState: 'CLOSED',
    requestsSent: 0,
    responsesReceived: 0,
    currentState: 'idle',
    lastError: null,
    latencyMs: null,
    playbackStatus: 'idle',
    reconnectCount: 0,
  };

  private listeners: Set<Listener> = new Set();
  private endOfSpeechTimestamp: number | null = null;

  public static getInstance(): VoiceDiagnostics {
    if (!VoiceDiagnostics.instance) {
      VoiceDiagnostics.instance = new VoiceDiagnostics();
    }
    return VoiceDiagnostics.instance;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  public update(partial: Partial<VoicePipelineStageStatus>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  public logMicStatus(status: VoicePipelineStageStatus['micInit'], error?: string) {
    this.update({ micInit: status, lastError: error || this.state.lastError });
  }

  public logVAD(detected: boolean, energy: number) {
    this.update({ vadDetected: detected, vadEnergy: Math.min(1, Math.max(0, energy)) });
  }

  public incrementFrames() {
    this.state.framesCaptured++;
    this.notify();
  }

  public addBytesTransmitted(bytes: number) {
    this.state.bytesTransmitted += bytes;
    this.state.requestsSent++;
    this.notify();
  }

  public markEndOfSpeech() {
    this.endOfSpeechTimestamp = performance.now();
  }

  public markFirstAudioReceived() {
    if (this.endOfSpeechTimestamp) {
      const latency = Math.round(performance.now() - this.endOfSpeechTimestamp);
      this.state.latencyMs = latency;
      this.endOfSpeechTimestamp = null;
    }
    this.state.responsesReceived++;
    this.notify();
  }

  public logError(err: string) {
    this.state.lastError = `${new Date().toLocaleTimeString()}: ${err}`;
    this.notify();
  }

  public resetMetrics() {
    this.state = {
      ...this.state,
      framesCaptured: 0,
      bytesTransmitted: 0,
      requestsSent: 0,
      responsesReceived: 0,
      lastError: null,
      latencyMs: null,
    };
    this.notify();
  }

  public getState(): VoicePipelineStageStatus {
    return { ...this.state };
  }
}

export const diagnostics = VoiceDiagnostics.getInstance();
