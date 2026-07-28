const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;

let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
  console.warn('[Electron Main] electron-updater notice:', e.message);
}

let mainWindow = null;
let tray = null;
let serverStarted = false;

const PORT = 3000;

function startBackendServer() {
  if (serverStarted) return;
  serverStarted = true;

  if (isDev) {
    const serverScript = path.join(process.cwd(), 'server.ts');
    console.log(`[Electron Main] Starting dev server via tsx: ${serverScript}`);
    const child = spawn('npx', ['tsx', serverScript], {
      cwd: process.cwd(),
      shell: true,
      env: { ...process.env, PORT: PORT.toString() },
    });
    child.on('error', (err) => {
      console.error('[Electron Main] Failed to spawn dev server:', err.message);
      try {
        new Notification({
          title: 'शाश्वत Server Failed to Start',
          body: `Could not launch the backend server: ${err.message}`,
        }).show();
      } catch (_) { /* Notification API not available */ }
    });
    child.on('exit', (code) => {
      if (code !== null && code !== 0) {
        console.error(`[Electron Main] Dev server exited with code ${code}`);
      }
    });
  } else {
    // Production Mode: Execute bundled server directly inside Electron Node engine!
    const bundledServer = path.join(app.getAppPath(), 'dist', 'server.cjs');
    console.log(`[Electron Main] Loading production server module: ${bundledServer}`);
    try {
      require(bundledServer);
      console.log('[Electron Main] Bundled server initialized successfully');
    } catch (err) {
      console.error('[Electron Main] Error loading bundled server module:', err);
      try {
        new Notification({
          title: 'शाश्वत Server Failed to Start',
          body: `Could not load bundled server: ${err.message}`,
        }).show();
      } catch (_) { /* Notification API not available */ }
    }
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

  // Enable Screen Sharing & Display Media Capturing in Electron
  const { session, desktopCapturer } = require('electron');
  if (session && session.defaultSession) {
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        if (sources && sources.length > 0) {
          callback({ video: sources[0], audio: 'loopback' });
        } else {
          callback({});
        }
      }).catch((err) => {
        console.error('[Electron DisplayMedia] Error fetching screen sources:', err);
        callback({});
      });
    });

    session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
      if (permission === 'display-capture' || permission === 'media') return true;
      return true;
    });
  }

  const appUrl = `http://localhost:${PORT}`;

  const loadApp = () => {
    mainWindow.loadURL(appUrl).catch((err) => {
      console.log('[Electron Main] Backend connection pending... retrying in 500ms:', err.message);
      setTimeout(loadApp, 500);
    });
  };

  loadApp();

  mainWindow.webContents.once('dom-ready', () => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
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
    console.warn('[Electron Main] System tray notice:', err.message);
  }
}

const { registerAllIPCHandlers } = require('./ipcHandlers.cjs');

function registerIPCHandlers() {
  registerAllIPCHandlers();

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

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Electron Main] Another instance is already running. Focus existing instance and exit secondary.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

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
      mainWindow.focus();
    }
  });
}
