const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Built-in Electron check: true when running inside compiled .exe
const isDev = !app.isPackaged;

let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
  console.warn('[Electron Main] electron-updater module notice:', e.message);
}

let mainWindow = null;
let tray = null;
let serverProcess = null;

const PORT = 3000;

function startBackendServer() {
  if (serverProcess) return;

  const appPath = app.getAppPath();
  const serverScript = isDev
    ? path.join(process.cwd(), 'server.ts')
    : path.join(appPath, 'dist', 'server.cjs');

  console.log(`[Electron Main] Starting backend server (isDev: ${isDev}): ${serverScript}`);

  if (isDev) {
    serverProcess = spawn('npx', ['tsx', serverScript], {
      cwd: process.cwd(),
      shell: true,
      env: { ...process.env, PORT: PORT.toString() },
    });
  } else {
    serverProcess = spawn('node', [serverScript], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: PORT.toString(), NODE_ENV: 'production' },
    });
  }

  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (data) => {
      console.log(`[Backend Log] ${data.toString().trim()}`);
    });
  }

  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (data) => {
      console.error(`[Backend Err] ${data.toString().trim()}`);
    });
  }
}

function createMainWindow() {
  const iconPath = isDev
    ? path.join(process.cwd(), 'assets', 'icon.png')
    : path.join(app.getAppPath(), 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'शाश्वत AI Assistant',
    icon: iconPath,
    backgroundColor: '#000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  const appUrl = `http://localhost:${PORT}`;

  const loadApp = () => {
    mainWindow.loadURL(appUrl).catch(() => {
      console.log('[Electron Main] Backend loading... retrying in 1s');
      setTimeout(loadApp, 1000);
    });
  };

  loadApp();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createSystemTray() {
  const iconPath = isDev
    ? path.join(process.cwd(), 'assets', 'icon.png')
    : path.join(app.getAppPath(), 'assets', 'icon.png');

  try {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show शाश्वत AI Operating System',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: 'Wake Word: "Shashwat" (Active)',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Check for Updates',
        click: () => {
          if (autoUpdater) {
            autoUpdater.checkForUpdatesAndNotify().catch((e) => console.log('Update notice:', e.message));
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Exit शाश्वत',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip('शाश्वत AI Assistant');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('[Electron Main] System tray initialization warning:', err.message);
  }
}

function registerIPCHandlers() {
  ipcMain.handle('app:get-version', () => app.getVersion());

  ipcMain.on('app:notification', (_event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title: title || 'शाश्वत AI', body: body || '' }).show();
    }
  });

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.hide());
}

app.on('ready', () => {
  startBackendServer();
  createMainWindow();
  createSystemTray();
  registerIPCHandlers();

  if (!isDev && autoUpdater) {
    autoUpdater.checkForUpdatesAndNotify().catch((e) => console.log('AutoUpdater notice:', e.message));
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (serverProcess) {
    try {
      serverProcess.kill('SIGTERM');
    } catch (_) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  } else {
    mainWindow.show();
  }
});
