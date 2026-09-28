// Bridge between the Olympus console page and the native PC shell.
// Native controller features (battery level, trigger rumble, player LEDs
// via SDL) will be exposed here as they are added.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('OlympusPC', {
  platform: process.platform,
  isPCApp: true,
  quit: () => ipcRenderer.send('olympus-quit')
});
