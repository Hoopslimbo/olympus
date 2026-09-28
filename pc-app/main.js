const { app, BrowserWindow, ipcMain, session, desktopCapturer, shell } = require('electron');
const path = require('path');
const fs = require('fs');

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
  // Automated-test hook: only active when OLY_TEST_FILE is set (never in production).
  if (process.env.OLY_TEST_FILE) {
    win.webContents.on('did-finish-load', async () => {
      await new Promise(r => setTimeout(r, 7000));
      try {
        const fn = require(process.env.OLY_TEST_FILE);
        const out = await fn(win);
        console.log('OLY_TEST_RESULT:' + JSON.stringify(out));
      } catch (e) { console.log('OLY_TEST_RESULT:ERROR:' + String(e && e.message).slice(0,300)); }
      app.exit(0);
    });
  }
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

// Screenshot capture: renderer calls window.OlympusPC.screenshot().
ipcMain.handle('oly-screenshot', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
  const src = sources[0];
  if (!src) throw new Error('no screen source');
  const dir = path.join(app.getPath('pictures'), 'Olympus');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'olympus-' + Date.now() + '.png');
  fs.writeFileSync(file, src.thumbnail.toPNG());
  return file;
});

// Gallery: list captures (screenshots + clips) from ~/Pictures/Olympus.
function capturesDir() {
  const dir = path.join(app.getPath('pictures'), 'Olympus');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
ipcMain.handle('oly-screen-source', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  if (!sources[0]) throw new Error('no screen source');
  return sources[0].id;
});
ipcMain.handle('oly-list-captures', async () => {
  const dir = capturesDir();
  const { pathToFileURL } = require('url');
  return fs.readdirSync(dir)
    .filter(f => /\.(png|webm)$/i.test(f))
    .map(f => {
      const st = fs.statSync(path.join(dir, f));
      return { name: f, url: pathToFileURL(path.join(dir, f)).href,
               kind: /\.webm$/i.test(f) ? 'video' : 'image',
               mtime: st.mtimeMs, size: st.size };
    })
    .sort((a, b) => b.mtime - a.mtime);
});
ipcMain.handle('oly-save-clip', async (e, buf) => {
  const name = 'olympus-clip-' + Date.now() + '.webm';
  fs.writeFileSync(path.join(capturesDir(), name), Buffer.from(buf));
  return name;
});
ipcMain.handle('oly-delete-capture', async (e, name) => {
  const safe = path.basename(String(name || ''));
  if (!/\.(png|webm)$/i.test(safe)) throw new Error('bad capture name');
  fs.unlinkSync(path.join(capturesDir(), safe));
  return true;
});

// Open an https URL in the user's real browser.
ipcMain.on('olympus-open-external', (e, url) => {
  if (typeof url === 'string' && /^https:\/\//.test(url)) shell.openExternal(url);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
