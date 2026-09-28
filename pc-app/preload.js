// Bridge between the Olympus console page and the native PC shell.
// Native controller features (battery level, trigger rumble, player LEDs
// via SDL) will be exposed here as they are added.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('OlympusPC', {
  platform: process.platform,
  isPCApp: true,
  quit: () => ipcRenderer.send('olympus-quit'),
  screenshot: () => ipcRenderer.invoke('oly-screenshot'),
  screenSource: () => ipcRenderer.invoke('oly-screen-source'),
  listCaptures: () => ipcRenderer.invoke('oly-list-captures'),
  saveClip: (buf) => ipcRenderer.invoke('oly-save-clip', buf),
  deleteCapture: (name) => ipcRenderer.invoke('oly-delete-capture', name),
  openExternal: (url) => ipcRenderer.send('olympus-open-external', url)
});
