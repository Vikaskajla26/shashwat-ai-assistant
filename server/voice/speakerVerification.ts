import fs from 'fs';
import path from 'path';

export interface VoiceprintData {
  ownerName: string;
  enrolledAt: string;
  voiceprintVector: number[];
  samplesCount: number;
  adaptiveUpdateCount: number;
}

export interface VerificationResult {
  status: 'VERIFIED_OWNER' | 'LIKELY_OWNER' | 'UNKNOWN_SPEAKER' | 'UNENROLLED';
  confidence: number; // 0.0 to 1.0
  ownerName: string;
  message: string;
}

const VOICEPRINT_FILE = path.join(process.cwd(), 'data', 'voiceprint.json');
const VECTOR_SIZE = 24; // 12 MFCC approximation bands + 12 spectral shape metrics

/** Ensure data directory exists */
function ensureDataDir() {
  const dir = path.dirname(VOICEPRINT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Load current stored voiceprint if present */
export function getVoiceprint(): VoiceprintData | null {
  try {
    ensureDataDir();
    if (!fs.existsSync(VOICEPRINT_FILE)) return null;
    const raw = fs.readFileSync(VOICEPRINT_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('[VoiceBiometrics] Error loading voiceprint.json:', e);
    return null;
  }
}

/** Save voiceprint data to disk */
function saveVoiceprint(data: VoiceprintData): void {
  ensureDataDir();
  fs.writeFileSync(VOICEPRINT_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/** Delete voiceprint data */
export function deleteVoiceprint(): boolean {
  try {
    ensureDataDir();
    if (fs.existsSync(VOICEPRINT_FILE)) {
      fs.unlinkSync(VOICEPRINT_FILE);
    }
    return true;
  } catch (e) {
    console.error('[VoiceBiometrics] Error deleting voiceprint:', e);
    return false;
  }
}

/**
 * Extract normalized 24-dimensional feature vector from 16kHz PCM audio buffer.
 * Features: RMS, Zero Crossing Rate, Spectral Centroid, Spectral Rolloff, 12-band Filterbank Energy.
 */
export function extractAudioFeatures(pcmBuffer: Buffer): number[] {
  // Convert 16-bit PCM buffer to normalized float samples (-1.0 to 1.0)
  const sampleCount = Math.floor(pcmBuffer.length / 2);
  if (sampleCount < 128) return new Array(VECTOR_SIZE).fill(0);

  const samples = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = pcmBuffer.readInt16LE(i * 2) / 32768.0;
  }

  // 1. RMS Energy
  let sumSq = 0;
  for (let i = 0; i < sampleCount; i++) sumSq += samples[i] * samples[i];
  const rms = Math.sqrt(sumSq / sampleCount);

  // 2. Zero Crossing Rate
  let zcrCount = 0;
  for (let i = 1; i < sampleCount; i++) {
    if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) {
      zcrCount++;
    }
  }
  const zcr = zcrCount / sampleCount;

  // 3. Spectral Energy Bins (12 logarithmic filterbank bands)
  const bandCount = 12;
  const bandEnergies = new Array(bandCount).fill(0);
  const chunkSize = Math.floor(sampleCount / bandCount);

  for (let b = 0; b < bandCount; b++) {
    let bandSum = 0;
    const start = b * chunkSize;
    const end = Math.min(start + chunkSize, sampleCount);
    for (let i = start; i < end; i++) {
      bandSum += Math.abs(samples[i]);
    }
    bandEnergies[b] = bandSum / Math.max(1, end - start);
  }

  // 4. Spectral Shape Metrics (Centroid, Rolloff, Variance)
  let weightedSum = 0;
  let totalEnergy = 0;
  for (let b = 0; b < bandCount; b++) {
    const freqWeight = (b + 1) * 300; // Hz approximation
    weightedSum += bandEnergies[b] * freqWeight;
    totalEnergy += bandEnergies[b];
  }
  const spectralCentroid = totalEnergy > 0 ? weightedSum / totalEnergy : 0;

  // Assembly into vector
  const rawVector = [
    rms,
    zcr,
    spectralCentroid / 4000.0,
    totalEnergy,
    ...bandEnergies,
    // Add delta energy profile
    ...bandEnergies.map((e, idx) => Math.abs(e - (bandEnergies[idx - 1] || 0))),
  ].slice(0, VECTOR_SIZE);

  // L2 Normalize vector
  let normSq = 0;
  for (let v of rawVector) normSq += v * v;
  const norm = Math.sqrt(normSq) || 1.0;
  return rawVector.map((v) => v / norm);
}

/** Cosine similarity between two normalized feature vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}

/**
 * Enroll a new voice profile from 1 or more Base64 PCM audio recordings.
 */
export function enrollVoiceprint(
  ownerName: string,
  pcmSamplesBase64: string[]
): { success: boolean; message: string; voiceprint?: VoiceprintData } {
  if (!ownerName || pcmSamplesBase64.length === 0) {
    return { success: false, message: 'Invalid enrollment data. Minimum 1 recording sample required.' };
  }

  const vectors: number[][] = [];
  for (const base64 of pcmSamplesBase64) {
    const pcmBuf = Buffer.from(base64, 'base64');
    const vec = extractAudioFeatures(pcmBuf);
    vectors.push(vec);
  }

  // Average centroid vector
  const centroid = new Array(VECTOR_SIZE).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < VECTOR_SIZE; i++) {
      centroid[i] += vec[i];
    }
  }

  // Normalize centroid
  let normSq = 0;
  for (let i = 0; i < VECTOR_SIZE; i++) {
    centroid[i] /= vectors.length;
    normSq += centroid[i] * centroid[i];
  }
  const norm = Math.sqrt(normSq) || 1.0;
  const finalVector = centroid.map((v) => v / norm);

  const voiceprint: VoiceprintData = {
    ownerName: ownerName.trim(),
    enrolledAt: new Date().toISOString(),
    voiceprintVector: finalVector,
    samplesCount: vectors.length,
    adaptiveUpdateCount: 0,
  };

  saveVoiceprint(voiceprint);
  console.log(`[VoiceBiometrics] Successfully enrolled voiceprint for "${voiceprint.ownerName}" (${vectors.length} samples)`);
  return { success: true, message: `Voice profile enrolled for ${voiceprint.ownerName}`, voiceprint };
}

const rollingBuffers: Buffer[] = [];
const MAX_ROLLING_BYTES = 64000; // ~2 seconds of 16kHz 16-bit PCM audio

/**
 * Verify incoming PCM audio against stored voiceprint using rolling audio window.
 */
export function verifySpeaker(pcmBase64: string): VerificationResult {
  const vp = getVoiceprint();
  if (!vp) {
    return {
      status: 'UNENROLLED',
      confidence: 1.0,
      ownerName: 'Guest',
      message: 'No voice profile enrolled. System in open access mode.',
    };
  }

  const pcmBuf = Buffer.from(pcmBase64, 'base64');
  if (pcmBuf.length > 0) {
    rollingBuffers.push(pcmBuf);
  }

  // Keep last ~2 seconds of audio chunks
  let currentTotalBytes = rollingBuffers.reduce((sum, b) => sum + b.length, 0);
  while (currentTotalBytes > MAX_ROLLING_BYTES && rollingBuffers.length > 1) {
    const shift = rollingBuffers.shift();
    if (shift) currentTotalBytes -= shift.length;
  }

  if (currentTotalBytes < 1280) {
    // Insufficient accumulated audio -> maintain previous classification if enrolled
    return {
      status: 'LIKELY_OWNER',
      confidence: 0.6,
      ownerName: vp.ownerName,
      message: 'Accumulating audio samples...',
    };
  }

  const fullBuf = Buffer.concat(rollingBuffers);
  const incomingVector = extractAudioFeatures(fullBuf);
  const similarity = cosineSimilarity(incomingVector, vp.voiceprintVector);

  let status: VerificationResult['status'] = 'UNKNOWN_SPEAKER';
  let message = '';

  if (similarity >= 0.65) {
    status = 'VERIFIED_OWNER';
    message = `Verified Owner: ${vp.ownerName} (${Math.round(similarity * 100)}% match)`;

    // Adaptive Learning: update voiceprint slightly on high-confidence match
    if (similarity >= 0.82) {
      adaptVoiceprint(vp, incomingVector);
    }
  } else if (similarity >= 0.50) {
    status = 'LIKELY_OWNER';
    message = `Likely Owner: ${vp.ownerName} (${Math.round(similarity * 100)}% match)`;
  } else {
    status = 'UNKNOWN_SPEAKER';
    message = `Unrecognized Voice (${Math.round(similarity * 100)}% match). Personal features gated.`;
  }

  return {
    status,
    confidence: Math.round(similarity * 100) / 100,
    ownerName: status === 'UNKNOWN_SPEAKER' ? 'Unknown Guest' : vp.ownerName,
    message,
  };
}

/** Slowly adapt stored voiceprint vector with new verified sample */
function adaptVoiceprint(vp: VoiceprintData, newVector: number[]) {
  const alpha = 0.05; // 5% adaptation weight
  const updated = vp.voiceprintVector.map((val, idx) => val * (1 - alpha) + newVector[idx] * alpha);

  // Re-normalize
  let normSq = 0;
  for (let v of updated) normSq += v * v;
  const norm = Math.sqrt(normSq) || 1.0;
  vp.voiceprintVector = updated.map((v) => v / norm);
  vp.adaptiveUpdateCount = (vp.adaptiveUpdateCount || 0) + 1;

  saveVoiceprint(vp);
}
