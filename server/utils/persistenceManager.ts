import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDB, closeDB } from '../db/database';

export interface UserProfile {
  name: string;
  avatar?: string;
  preferences?: Record<string, any>;
  createdAt: string;
  lastActiveAt: string;
}

export interface AppStateData {
  isInitialized: boolean;
  userProfile: UserProfile;
  activeProviderId: string;
  selectedModel: string;
  browserRoutingMode: 'system_default' | 'always_ask' | 'always_sandbox';
  theme: string;
  wakeWord: string;
  voiceSettings: Record<string, any>;
  windowState: { width: number; height: number; x?: number; y?: number };
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const APP_STATE_FILE = path.join(DATA_DIR, 'app_state.json');

const DEFAULT_APP_STATE: AppStateData = {
  isInitialized: false,
  userProfile: {
    name: 'Vikas',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  activeProviderId: 'gemini',
  selectedModel: 'gemini-3.1-flash-live-preview',
  browserRoutingMode: 'system_default',
  theme: 'witty',
  wakeWord: 'शाश्वत',
  voiceSettings: { pitch: 1.0, rate: 1.0, voice: 'Puck' },
  windowState: { width: 1280, height: 800 },
  updatedAt: new Date().toISOString(),
};

/**
 * Ensure data directories exist.
 */
function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Create a versioned timestamped backup of state and database.
 */
export function createBackup(): void {
  try {
    ensureDirectories();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Backup app_state.json
    if (fs.existsSync(APP_STATE_FILE)) {
      const backupPath = path.join(BACKUP_DIR, `app_state_v${timestamp}.json`);
      fs.copyFileSync(APP_STATE_FILE, backupPath);
    }

    // Keep only last 10 versioned backups to optimize disk footprint
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('app_state_v')).sort();
    if (files.length > 10) {
      files.slice(0, files.length - 10).forEach(f => {
        try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch (_) {}
      });
    }
  } catch (err) {
    console.warn('[PersistenceManager] Backup creation notice:', err);
  }
}

/**
 * Restore state from the latest valid backup in data/backups/
 */
function restoreFromBackup(): AppStateData | null {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return null;
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('app_state_v')).sort().reverse();
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(BACKUP_DIR, file), 'utf8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed.isInitialized === 'boolean') {
          console.log(`[PersistenceManager] Restored application state from backup: ${file}`);
          return parsed;
        }
      } catch (_) {}
    }
  } catch (err) {
    console.warn('[PersistenceManager] Backup restoration notice:', err);
  }
  return null;
}

/**
 * Load Persistent Application State (with auto-repair fallback).
 */
export function loadAppState(): AppStateData {
  ensureDirectories();
  if (!fs.existsSync(APP_STATE_FILE)) {
    const backupState = restoreFromBackup();
    if (backupState) {
      saveAppState(backupState);
      return backupState;
    }
    saveAppState(DEFAULT_APP_STATE);
    return DEFAULT_APP_STATE;
  }

  try {
    const raw = fs.readFileSync(APP_STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_APP_STATE,
      ...parsed,
      userProfile: {
        ...DEFAULT_APP_STATE.userProfile,
        ...(parsed.userProfile || {}),
        lastActiveAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error('[PersistenceManager] Corrupted app_state.json detected! Attempting recovery...', err);
    const backupState = restoreFromBackup();
    if (backupState) {
      saveAppState(backupState);
      return backupState;
    }
    // Fall back to clean defaults if no valid backup
    saveAppState(DEFAULT_APP_STATE);
    return DEFAULT_APP_STATE;
  }
}

/**
 * Save Persistent Application State atomically with versioned backup.
 */
export function saveAppState(statePartial: Partial<AppStateData>): AppStateData {
  ensureDirectories();
  createBackup();

  const currentState = fs.existsSync(APP_STATE_FILE)
    ? ((): AppStateData => {
        try { return JSON.parse(fs.readFileSync(APP_STATE_FILE, 'utf8')); }
        catch (_) { return DEFAULT_APP_STATE; }
      })()
    : DEFAULT_APP_STATE;

  const nextState: AppStateData = {
    ...currentState,
    ...statePartial,
    userProfile: {
      ...currentState.userProfile,
      ...(statePartial.userProfile || {}),
      lastActiveAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };

  const tempPath = `${APP_STATE_FILE}.tmp_${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(nextState, null, 2), 'utf8');
  fs.renameSync(tempPath, APP_STATE_FILE);

  // Sync key settings into SQLite DB asynchronously
  syncStateToDB(nextState).catch(err => {
    console.warn('[PersistenceManager] DB sync notice:', err);
  });

  return nextState;
}

/**
 * Sync Key State Fields to SQLite `settings` table.
 */
async function syncStateToDB(state: AppStateData): Promise<void> {
  try {
    const db = await getDB();
    const entries = [
      ['is_initialized', String(state.isInitialized)],
      ['user_name', state.userProfile.name],
      ['active_provider', state.activeProviderId],
      ['selected_model', state.selectedModel],
      ['browser_routing_mode', state.browserRoutingMode],
      ['theme', state.theme],
      ['wake_word', state.wakeWord],
    ];

    for (const [key, value] of entries) {
      await db.run(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [key, value]
      );
    }
  } catch (err) {
    console.warn('[PersistenceManager] SQLite sync notice:', err);
  }
}

/**
 * Perform Clean Exit & Database Buffer Flush.
 */
export async function performCleanShutdown(): Promise<void> {
  console.log('[PersistenceManager] Performing clean shutdown: flushing memory buffers & closing database...');
  try {
    const state = loadAppState();
    saveAppState(state);
    await closeDB();
    console.log('[PersistenceManager] Shutdown complete.');
  } catch (err) {
    console.error('[PersistenceManager] Shutdown flush notice:', err);
  }
}

// Register process exit listeners for crash prevention
process.on('SIGINT', async () => {
  await performCleanShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await performCleanShutdown();
  process.exit(0);
});
