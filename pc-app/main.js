const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#05070f',
    title: 'Olympus',
    icon: path.join(__dirname, 'assets', 'icon-transparent.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

app.whenReady().then(() => {
  // Allow mic/camera/screen-capture prompts from the console page
  // (voice parties + screen sharing).
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'display-capture' || permission === 'audioCapture') {
      callback(true);
    } else {
      callback(false);
    }
  });
  createWindow();
});

// Renderer asks to quit via the Exit button in the Olympus menu.
ipcMain.on('olympus-quit', () => {
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
