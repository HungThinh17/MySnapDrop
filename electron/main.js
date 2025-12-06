const path = require('path');
const { app, BrowserWindow } = require('electron');

const isDev =
  process.env.ELECTRON_DEV === 'true' ||
  process.env.NODE_ENV === 'development';

const serverPort = process.env.MYSD_SERVER_PORT
  ? parseInt(process.env.MYSD_SERVER_PORT, 10) || 3000
  : 3000;

let mainWindow;

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1024,
    height: 720,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '..', 'client', 'public', 'mysnapdropico.png')
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

function startBackendIfNeeded() {
  if (isDev) {
    return;
  }

  require(path.join(__dirname, '..', 'server', 'index.js'));
}

app.whenReady().then(() => {
  startBackendIfNeeded();
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
