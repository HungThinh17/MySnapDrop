const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mysnapdropDesktop', {
  clearCacheAndReload: () => ipcRenderer.invoke('mysd-clear-cache-and-reload'),
  openDevTools: () => ipcRenderer.invoke('mysd-open-devtools')
});

window.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  ipcRenderer.invoke('mysd-show-context-menu');
});
