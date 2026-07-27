const { app, BrowserWindow, ipcMain, Tray, Menu, Notification, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let tray = null;
let serverProcess = null;

const PORT = 3000;

function startBackendServer() {
  if (serverProcess) return;

  const serverScript = isDev
    ? path.join(process.cwd(), 'server.ts')
    : path.join(process.cwd(), 'dist', 'server.cjs');

  console.log(`[Electron Main] Starting backend server: ${serverScript}`);

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
  const iconPath = path.join(process.cwd(), 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'शाश्वत AI Assistant',
    icon: iconPath,
    backgroundColor: '#05070D',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows local asset loading & WebRTC screen sharing
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
  const iconPath = path.join(process.cwd(), 'assets', 'icon.png');

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
        click: () => autoUpdater.checkForUpdatesAndNotify(),
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

  if (!isDev) {
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
