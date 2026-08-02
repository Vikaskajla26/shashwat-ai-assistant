const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;

// Required global state variables
let mainWindow = null;
let tray = null;
let serverStarted = false;
let autoUpdater = null;

try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
  // electron-updater is optional — ignore if not installed
}

process.on('uncaughtException', (err) => {
  console.error('[Electron Main] Uncaught exception trapped:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Electron Main] Unhandled rejection trapped:', reason);
});

const PORT = parseInt(process.env.PORT || '3000', 10);

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
    try {
      process.chdir(app.getAppPath());
    } catch (_) {}
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

  const activePort = global.SHASHWAT_SERVER_PORT || process.env.SHASHWAT_SERVER_PORT || PORT;
  const appUrl = `http://localhost:${activePort}`;
  let retries = 0;

  const loadApp = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.loadURL(appUrl).catch((err) => {
      retries++;
      console.log(`[Electron Main] Backend connection pending (attempt ${retries})...`, err.message);
      if (retries > 20) {
        // After 10 seconds, fall back to loading local static build directly
        const localHtmlPath = path.join(app.getAppPath(), 'dist', 'index.html');
        const fs = require('fs');
        if (fs.existsSync(localHtmlPath)) {
          console.log('[Electron Main] Falling back to loading local static build:', localHtmlPath);
          mainWindow.loadFile(localHtmlPath).catch((e) => {
            console.error('[Electron Main] Even local file load failed:', e.message);
          });
          // Show the window anyway so user sees something
          if (!mainWindow.isVisible()) {
            mainWindow.show();
            mainWindow.focus();
          }
          return;
        }
      }
      setTimeout(loadApp, 500);
    });
  };

  // Show window immediately with a loading screen while backend starts
  mainWindow.loadURL('about:blank').catch(() => {});
  setTimeout(loadApp, 300);

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

  const { openInChromeOrSystemDefault } = require('./chromeLauncher.cjs');
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openInChromeOrSystemDefault(url);
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

// Single instance: if another instance is running, focus it; otherwise proceed normally
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is running — focus it and exit
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    startBackendServer();
    createMainWindow();
    createSystemTray();
    registerIPCHandlers();

    if (!isDev && autoUpdater) {
      try {
        autoUpdater.checkForUpdatesAndNotify().catch(() => {});
      } catch (_) {}
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
    if (!mainWindow || mainWindow.isDestroyed()) {
      createMainWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
