const path = require('path');
const { app, BrowserWindow, Menu, ipcMain, session } = require('electron');

const isDev =
  process.env.ELECTRON_DEV === 'true' ||
  process.env.NODE_ENV === 'development';

const serverPort = process.env.MYSD_SERVER_PORT
  ? parseInt(process.env.MYSD_SERVER_PORT, 10) || 3000
  : 3000;

let mainWindow;

function createMainWindow() {
  const iconPath = isDev
    ? path.join(__dirname, '..', 'client', 'public', 'mysnapdropico.png')
    : path.join(__dirname, '..', 'client', 'dist', 'mysnapdropico.png');

  const window = new BrowserWindow({
    width: 1024,
    height: 720,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: iconPath
  });

  const targetUrl = isDev
    ? 'http://localhost:5173'
    : `http://localhost:${serverPort}`;

  window.loadURL(targetUrl);

  if (isDev) {
    window.webContents.openDevTools({ mode: 'detach' });
  }

  return window;
}

async function clearCacheAndReload() {
  const ses = session.defaultSession;

  try {
    if (ses) {
      await ses.clearCache();
      await ses.clearStorageData({
        storages: ['serviceworkers', 'caches', 'localstorage', 'indexdb']
      });
    }
  } catch (error) {
    console.error('Failed to clear cache/storage:', error);
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.reloadIgnoringCache();
  }
}

function registerCacheHandler() {
  ipcMain.handle('mysd-clear-cache-and-reload', clearCacheAndReload);
}

function registerContextMenu() {
  ipcMain.handle('mysd-open-devtools', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const wc = mainWindow.webContents;
    if (wc.isDevToolsOpened()) {
      wc.closeDevTools();
    } else {
      wc.openDevTools({ mode: 'detach' });
    }
  });

  ipcMain.handle('mysd-show-context-menu', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;

    const menu = Menu.buildFromTemplate([
      {
        label: 'Clear Cache and Reload',
        click: () => {
          clearCacheAndReload();
        }
      },
      { type: 'separator' },
      {
        label: 'Toggle Developer Tools',
        click: () => {
          const wc = win.webContents;
          if (wc.isDevToolsOpened()) {
            wc.closeDevTools();
          } else {
            wc.openDevTools({ mode: 'detach' });
          }
        }
      }
    ]);

    menu.popup({ window: win });
  });
}

function startBackendIfNeeded() {
  if (isDev) {
    return;
  }

  try {
    const userDataDir = app.getPath('userData');
    const uploadsDir = path.join(userDataDir, 'uploads');
    process.env.MYSD_UPLOADS_DIR = uploadsDir;

    // Start the Express backend from the packaged app.
    // server/index.js will listen on port 3000 by default and store uploads
    // under the userData directory so it is writable.
    // eslint-disable-next-line global-require, import/no-dynamic-require
    require(path.join(__dirname, '..', 'server', 'index.js'));
  } catch (error) {
    // Lazy-require dialog to avoid circular import issues.
    // eslint-disable-next-line global-require
    const { dialog } = require('electron');
    console.error('Failed to start backend server:', error);
    dialog.showErrorBox(
      'MySnapDrop',
      'Failed to start the backend server. Please ensure dependencies are installed and try reinstalling the app.'
    );
  }
}

app.whenReady().then(() => {
  if (Menu && typeof Menu.setApplicationMenu === 'function') {
    Menu.setApplicationMenu(null);
  }

  startBackendIfNeeded();
  registerCacheHandler();
  registerContextMenu();
  mainWindow = createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
