import { AudioContextEngine } from '../../engine/voice/AudioContextEngine';
import type { AssistantState } from '../../types';

export interface AudioMetrics {
  normVol: number;
  audioBoost: number;
  volumeNorm: number;
  bassNorm: number;
  midNorm: number;
  trebleNorm: number;
}

export class OrbAudio {
  public static getMetrics(state: AssistantState, volume: number): AudioMetrics {
    const normVol = Math.min(1, Math.max(0, volume / 100));
    const isSpeaking = state === 'speaking';
    const isListening = state === 'listening';
    const isThinking =
      state === 'reasoning' || state === 'understanding' || state === 'searching';

    const audioBoost = isSpeaking
      ? 0.35 + normVol * 0.65
      : isListening
        ? 0.2 + normVol * 0.4
        : isThinking
          ? 0.3
          : 0.1;

    const spectrum = AudioContextEngine.getInstance().getSpectrum();

    return {
      normVol,
      audioBoost,
      volumeNorm: spectrum.volumeNorm,
      bassNorm: spectrum.bassNorm,
      midNorm: spectrum.midNorm,
      trebleNorm: spectrum.trebleNorm,
    };
  }
}
