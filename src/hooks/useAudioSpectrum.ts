import { useState, useEffect } from 'react';
import { AudioContextEngine, AudioSpectrumData } from '../engine/voice/AudioContextEngine';

export function useAudioSpectrum(isActive: boolean): AudioSpectrumData {
  const [spectrum, setSpectrum] = useState<AudioSpectrumData>({
    frequencyData: new Uint8Array(64),
    volume: 0,
    volumeNorm: 0,
    bassNorm: 0,
    midNorm: 0,
    trebleNorm: 0,
  });

  useEffect(() => {
    if (!isActive) return;

    let animId: number;
    const engine = AudioContextEngine.getInstance();

    const tick = () => {
      setSpectrum(engine.getSpectrum());
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isActive]);

  return spectrum;
}
