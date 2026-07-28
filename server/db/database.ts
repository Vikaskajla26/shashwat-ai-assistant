import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'shashwat.db');

export class AsyncDatabase {
  private db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  public all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  public get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  public run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  public exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

let asyncDbInstance: AsyncDatabase | null = null;

export const getDB = async (): Promise<AsyncDatabase> => {
  if (asyncDbInstance) return asyncDbInstance;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const rawDb = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      const wrapped = new AsyncDatabase(rawDb);
      asyncDbInstance = wrapped;
      initializeDatabase(wrapped)
        .then(() => resolve(wrapped))
        .catch(reject);
    });
  });
};

async function initializeDatabase(db: AsyncDatabase): Promise<void> {
  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS study_workspace (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      subject TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pronunciation_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_name TEXT NOT NULL,
      voiceprint BLOB,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sample_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS task_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_name TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at DATETIME,
      completed_at DATETIME,
      result TEXT
    );

    CREATE TABLE IF NOT EXISTS automation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target TEXT,
      parameters TEXT,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      success BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);
    CREATE INDEX IF NOT EXISTS idx_user_memory_key ON user_memory(key);
    CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
    CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
    CREATE INDEX IF NOT EXISTS idx_study_workspace_subject ON study_workspace(subject);
    CREATE INDEX IF NOT EXISTS idx_pronunciation_profiles_owner ON pronunciation_profiles(owner_name);
    CREATE INDEX IF NOT EXISTS idx_task_history_task_name ON task_history(task_name);
    CREATE INDEX IF NOT EXISTS idx_automation_history_action ON automation_history(action);
    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
  `);
}

export const closeDB = async (): Promise<void> => {
  if (asyncDbInstance) {
    await asyncDbInstance.close();
    asyncDbInstance = null;
  }
};