import { useState } from 'react';

export interface AudioSpectrumData {
  frequencyData: Uint8Array;
  volume: number;
  volumeNorm: number;
  bassNorm: number;
  midNorm: number;
  trebleNorm: number;
}

export function useAudioSpectrum(isActive: boolean): AudioSpectrumData {
  const [spectrum] = useState<AudioSpectrumData>({
    frequencyData: new Uint8Array(64),
    volume: 0,
    volumeNorm: 0,
    bassNorm: 0,
    midNorm: 0,
    trebleNorm: 0,
  });

  return spectrum;
}
