const { ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

let db = null;

function initDatabase() {
  const { app } = require('electron');
  const baseDir = app ? app.getPath('userData') : process.cwd();
  const dataDir = path.join(baseDir, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'shashwat.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('[Electron IPC DB] Error opening database:', err);
    } else {
      console.log('[Electron IPC DB] Database opened successfully at:', dbPath);
      setupTables();
    }
  });
}

function setupTables() {
  if (!db) return;
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS bookmarks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, url TEXT NOT NULL, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS study_workspace (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, subject TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS task_history (id INTEGER PRIMARY KEY AUTOINCREMENT, task_name TEXT NOT NULL, status TEXT NOT NULL, started_at DATETIME, completed_at DATETIME, result TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS automation_history (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, target TEXT, parameters TEXT, executed_at DATETIME DEFAULT CURRENT_TIMESTAMP, success BOOLEAN DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, level TEXT NOT NULL, message TEXT NOT NULL, module TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS learning_items (id INTEGER PRIMARY KEY AUTOINCREMENT, topic TEXT NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL, ease_factor REAL DEFAULT 2.5, interval INTEGER DEFAULT 1, repetitions INTEGER DEFAULT 0)`);
  });
}

function registerAllIPCHandlers() {
  initDatabase();

  // Database - User Memory
  ipcMain.handle('db:get-memory', () => {
    return new Promise((resolve) => {
      db.all('SELECT key, value FROM memories', [], (err, rows) => {
        if (err) resolve([]);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('db:set-memory', (_event, key, value) => {
    return new Promise((resolve) => {
      db.run(
        'INSERT INTO memories (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=?, updated_at=CURRENT_TIMESTAMP',
        [key, value, value],
        function (err) {
          resolve(!err);
        }
      );
    });
  });

  ipcMain.handle('db:delete-memory', (_event, key) => {
    return new Promise((resolve) => {
      db.run('DELETE FROM memories WHERE key = ?', [key], function (err) {
        resolve(!err);
      });
    });
  });

  // Database - Settings
  ipcMain.handle('db:get-settings', () => {
    return new Promise((resolve) => {
      db.all('SELECT key, value FROM settings', [], (err, rows) => {
        if (err) resolve({});
        else {
          const res = {};
          (rows || []).forEach((r) => (res[r.key] = r.value));
          resolve(res);
        }
      });
    });
  });

  ipcMain.handle('db:set-setting', (_event, key, value) => {
    return new Promise((resolve) => {
      db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=?, updated_at=CURRENT_TIMESTAMP',
        [key, value, value],
        function (err) {
          resolve(!err);
        }
      );
    });
  });

  // Database - Conversations
  ipcMain.handle('db:get-conversations', (_event, sessionId) => {
    return new Promise((resolve) => {
      db.all('SELECT role, content, timestamp FROM conversations WHERE session_id = ? ORDER BY timestamp ASC', [sessionId], (err, rows) => {
        if (err) resolve([]);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('db:add-conversation', (_event, sessionId, role, content) => {
    return new Promise((resolve) => {
      db.run('INSERT INTO conversations (session_id, role, content) VALUES (?, ?, ?)', [sessionId, role, content], function (err) {
        resolve(!err);
      });
    });
  });

  // Database - Bookmarks
  ipcMain.handle('db:get-bookmarks', () => {
    return new Promise((resolve) => {
      db.all('SELECT * FROM bookmarks ORDER BY created_at DESC', [], (err, rows) => {
        if (err) resolve([]);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('db:add-bookmark', (_event, title, url, description) => {
    return new Promise((resolve) => {
      db.run('INSERT INTO bookmarks (title, url, description) VALUES (?, ?, ?)', [title, url, description], function (err) {
        resolve(this ? this.lastID : null);
      });
    });
  });

  ipcMain.handle('db:delete-bookmark', (_event, id) => {
    return new Promise((resolve) => {
      db.run('DELETE FROM bookmarks WHERE id = ?', [id], function (err) {
        resolve(!err);
      });
    });
  });

  // Database - Study Workspace
  ipcMain.handle('db:get-study-workspace', () => {
    return new Promise((resolve) => {
      db.all('SELECT * FROM study_workspace ORDER BY updated_at DESC', [], (err, rows) => {
        if (err) resolve([]);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('db:add-study-item', (_event, title, content, subject) => {
    return new Promise((resolve) => {
      db.run('INSERT INTO study_workspace (title, content, subject) VALUES (?, ?, ?)', [title, content, subject], function (err) {
        resolve(this ? this.lastID : null);
      });
    });
  });

  ipcMain.handle('db:update-study-item', (_event, id, title, content, subject) => {
    return new Promise((resolve) => {
      db.run('UPDATE study_workspace SET title = ?, content = ?, subject = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title, content, subject, id], function (err) {
        resolve(!err);
      });
    });
  });

  ipcMain.handle('db:delete-study-item', (_event, id) => {
    return new Promise((resolve) => {
      db.run('DELETE FROM study_workspace WHERE id = ?', [id], function (err) {
        resolve(!err);
      });
    });
  });

  // Database - Task History
  ipcMain.handle('db:get-task-history', () => {
    return new Promise((resolve) => {
      db.all('SELECT * FROM task_history ORDER BY id DESC LIMIT 50', [], (err, rows) => {
        if (err) resolve([]);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('db:add-task-history', (_event, taskName, status, result) => {
    return new Promise((resolve) => {
      db.run('INSERT INTO task_history (task_name, status, result, completed_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)', [taskName, status, result], function (err) {
        resolve(this ? this.lastID : null);
      });
    });
  });

  // Database - Automation History
  ipcMain.handle('db:get-automation-history', () => {
    return new Promise((resolve) => {
      db.all('SELECT * FROM automation_history ORDER BY executed_at DESC LIMIT 50', [], (err, rows) => {
        if (err) resolve([]);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('db:add-automation-history', (_event, action, target, parameters, success, result) => {
    return new Promise((resolve) => {
      db.run('INSERT INTO automation_history (action, target, parameters, success) VALUES (?, ?, ?, ?)', [action, target, JSON.stringify(parameters), success ? 1 : 0], function (err) {
        resolve(this ? this.lastID : null);
      });
    });
  });

  // Database - Logs
  ipcMain.handle('db:get-logs', (_event, level, limit = 100) => {
    return new Promise((resolve) => {
      const query = level ? 'SELECT * FROM logs WHERE level = ? ORDER BY timestamp DESC LIMIT ?' : 'SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?';
      const params = level ? [level, limit] : [limit];
      db.all(query, params, (err, rows) => {
        if (err) resolve([]);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('db:add-log', (_event, level, message, module) => {
    return new Promise((resolve) => {
      db.run('INSERT INTO logs (level, message, module) VALUES (?, ?, ?)', [level, message, module || 'system'], function (err) {
        resolve(!err);
      });
    });
  });

  // Database - Learning Items
  ipcMain.handle('db:get-learning-items', () => {
    return new Promise((resolve) => {
      db.all('SELECT * FROM learning_items', [], (err, rows) => {
        if (err) resolve([]);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('db:add-learning-item', (_event, topic, question, answer) => {
    return new Promise((resolve) => {
      db.run('INSERT INTO learning_items (topic, question, answer) VALUES (?, ?, ?)', [topic, question, answer], function (err) {
        resolve(this ? this.lastID : null);
      });
    });
  });

  ipcMain.handle('db:update-learning-item', (_event, id, easeFactor, interval, repetitions) => {
    return new Promise((resolve) => {
      db.run('UPDATE learning_items SET ease_factor = ?, interval = ?, repetitions = ? WHERE id = ?', [easeFactor, interval, repetitions, id], function (err) {
        resolve(!err);
      });
    });
  });

  // AI Provider IPCs
  ipcMain.handle('ai:get-providers', async () => {
    try {
      const res = await fetch('http://localhost:3000/api/ai/providers').then((r) => r.json());
      return res;
    } catch (_) {
      return { success: false, providers: [] };
    }
  });

  ipcMain.handle('ai:validate-provider', async (_event, payload) => {
    try {
      const res = await fetch('http://localhost:3000/api/ai/providers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
      return res;
    } catch (err) {
      return { success: false, message: err?.message || 'Network validation error' };
    }
  });

  ipcMain.handle('ai:save-provider', async (_event, payload) => {
    try {
      const res = await fetch('http://localhost:3000/api/ai/providers/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
      return res;
    } catch (err) {
      return { success: false, message: err?.message || 'Save error' };
    }
  });

  ipcMain.handle('ai:reset-provider', async (_event, id) => {
    try {
      const res = await fetch('http://localhost:3000/api/ai/providers/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      }).then((r) => r.json());
      return res;
    } catch (err) {
      return { success: false, message: err?.message || 'Reset error' };
    }
  });

  // Browser Routing IPCs
  ipcMain.handle('browser:get-default-browser', async () => {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      const os = require('os');
      if (os.platform() === 'win32') {
        const { stdout } = await execAsync('reg query "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\http\\UserChoice" /v ProgId');
        const match = /ProgId\s+REG_SZ\s+(\S+)/i.exec(stdout);
        if (match && match[1]) {
          const progId = match[1].toLowerCase();
          if (progId.includes('chrome')) return { name: 'Google Chrome', isDetected: true };
          if (progId.includes('msedge') || progId.includes('edge')) return { name: 'Microsoft Edge', isDetected: true };
          if (progId.includes('firefox')) return { name: 'Mozilla Firefox', isDetected: true };
          if (progId.includes('brave')) return { name: 'Brave Browser', isDetected: true };
          if (progId.includes('opera')) return { name: 'Opera Browser', isDetected: true };
          if (progId.includes('arc')) return { name: 'Arc Browser', isDetected: true };
          if (progId.includes('vivaldi')) return { name: 'Vivaldi Browser', isDetected: true };
          return { name: `System Default (${match[1]})`, isDetected: true };
        }
      }
      return { name: 'System Default Browser', isDetected: true };
    } catch (_) {
      return { name: 'System Default Browser', isDetected: false };
    }
  });

  ipcMain.handle('browser:open-external', async (_event, url) => {
    if (!url) return false;
    try {
      const { shell } = require('electron');
      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('file://')) {
        targetUrl = 'https://' + targetUrl;
      }
      await shell.openExternal(targetUrl);
      return true;
    } catch (err) {
      console.warn('[ipcHandlers] shell.openExternal failed:', err);
      return false;
    }
  });

  // Windows Auto-Launch IPCs
  ipcMain.handle('app:get-auto-launch', () => {
    try {
      const { app } = require('electron');
      const settings = app.getLoginItemSettings();
      return { enabled: settings.openAtLogin };
    } catch (_) {
      return { enabled: false };
    }
  });

  ipcMain.handle('app:set-auto-launch', (_event, enabled) => {
    try {
      const { app } = require('electron');
      app.setLoginItemSettings({
        openAtLogin: Boolean(enabled),
        path: process.execPath,
      });
      return { success: true, enabled: Boolean(enabled) };
    } catch (err) {
      return { success: false, message: err?.message || 'Failed to set auto-launch' };
    }
  });
}

module.exports = { registerAllIPCHandlers };
