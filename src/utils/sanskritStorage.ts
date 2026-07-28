/**
 * Sanskrit Audio & Profile Persistence Manager
 * Uses localStorage & IndexedDB to preserve uploaded MP3 files, extracted phonetic knowledge,
 * and learned voice profiles across page refreshes and browser restarts.
 */

import { SanskritVoiceProfile, AudioImportVerificationResult } from '../../server/sanskritEngine';

const PROFILE_KEY = 'shashwat_sanskrit_profile_v1';
const FILES_KEY = 'shashwat_sanskrit_files_v1';
const DB_NAME = 'ShashwatAudioDB';
const STORE_NAME = 'mp3_blobs';

export interface StoredFileInfo {
  id: string;
  name: string;
  sizeMb: number;
  uploadedAt: string;
  verification: AudioImportVerificationResult;
}

// 1. Voice Profile Persistence
export function saveStoredVoiceProfile(profile: SanskritVoiceProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('[SanskritStorage] Failed to save profile to localStorage:', err);
  }
}

export function getStoredVoiceProfile(): SanskritVoiceProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SanskritVoiceProfile;
  } catch (err) {
    console.error('[SanskritStorage] Failed to read profile from localStorage:', err);
    return null;
  }
}

export function clearStoredVoiceProfile(): void {
  try {
    localStorage.removeItem(PROFILE_KEY);
  } catch (err) {
    console.error('[SanskritStorage] Failed to clear profile:', err);
  }
}

// 2. MP3 File Metadata Persistence
export function saveStoredMP3Files(files: StoredFileInfo[]): void {
  try {
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
  } catch (err) {
    console.error('[SanskritStorage] Failed to save files metadata:', err);
  }
}

export function getStoredMP3Files(): StoredFileInfo[] {
  try {
    const raw = localStorage.getItem(FILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredFileInfo[];
  } catch (err) {
    console.error('[SanskritStorage] Failed to read files metadata:', err);
    return [];
  }
}

export function clearStoredMP3Files(): void {
  try {
    localStorage.removeItem(FILES_KEY);
  } catch (err) {
    console.error('[SanskritStorage] Failed to clear files metadata:', err);
  }
}

// 3. IndexedDB Binary Audio Blob Storage
function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openAudioDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    await new Promise((res) => (tx.oncomplete = res));
  } catch (err) {
    console.warn('[SanskritStorage] IndexedDB blob save notice:', err);
  }
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openAudioDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}
