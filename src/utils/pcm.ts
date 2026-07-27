/**
 * PCM audio processing utilities for Gemini Live API
 * Input audio format: Raw Int16 PCM at 16000Hz
 * Output audio format: Raw Int16 PCM at 24000Hz
 */

// Convert Float32Array from AudioContext to Base64 Int16 PCM
export function float32ToInt16Base64(float32Array: Float32Array): string {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

// Convert Base64 Int16 PCM from Gemini Live to Float32Array for AudioContext playback
export function base64ToInt16Float32(base64: string): Float32Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32Array;
}

// Calculate RMS (Root Mean Square) volume level (0 - 100)
export function calculateVolume(dataArray: Float32Array): number {
  if (!dataArray || dataArray.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i] * dataArray[i];
  }
  const rms = Math.sqrt(sum / dataArray.length);
  const normalized = Math.min(100, Math.round(rms * 250));
  return normalized;
}
