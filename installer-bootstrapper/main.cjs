'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const VERSION = '1.0.3';
let win = null;
let installing = false;
let selectedInstallDir = null;

function defaultInstallDir() {
  const local = process.env.LOCALAPPDATA || app.getPath('appData');
  return path.join(local, 'Programs', 'ChronoCord');
}

function payloadPath() {
  return path.join(process.resourcesPath, `ChronoCord-Setup-${VERSION}.exe`);
}

function safeInstallDir(value) {
  if (typeof value !== 'string' || !value.trim()) return defaultInstallDir();
  const resolved = path.resolve(value.trim());
  if (!path.isAbsolute(resolved)) return defaultInstallDir();
  return resolved;
}

function send(type, data = {}) {
  if (win && !win.isDestroyed()) win.webContents.send('installer:event', { type, ...data });
}

function createWindow() {
  win = new BrowserWindow({
    width: 920,
    height: 560,
    minWidth: 920,
    minHeight: 560,
    maxWidth: 920,
    maxHeight: 560,
    resizable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    hasShadow: true,
    center: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  win.loadFile(path.join(__dirname, 'ui.html'));
  win.once('ready-to-show', () => win.show());
}

ipcMain.handle('installer:get-info', () => {
  selectedInstallDir ||= defaultInstallDir();
  return { version: VERSION, installDir: selectedInstallDir };
});

ipcMain.handle('installer:choose-folder', async () => {
  if (installing) return { ok: false, cancelled: true };
  const result = await dialog.showOpenDialog(win, {
    title: 'Escolha onde instalar o ChronoCord',
    defaultPath: selectedInstallDir || defaultInstallDir(),
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths?.[0]) return { ok: false, cancelled: true };
  selectedInstallDir = safeInstallDir(result.filePaths[0]);
  return { ok: true, installDir: selectedInstallDir };
});

ipcMain.handle('installer:minimize', () => { if (win && !win.isDestroyed()) win.minimize(); return true; });
ipcMain.handle('installer:close', () => { if (!installing) app.quit(); return !installing; });

ipcMain.handle('installer:install', async (_event, requestedDir) => {
  if (installing) return { ok: false, error: 'A instalação já está em andamento.' };
  const payload = payloadPath();
  if (!fs.existsSync(payload)) return { ok: false, error: 'O instalador interno do ChronoCord não foi encontrado.' };

  selectedInstallDir = safeInstallDir(requestedDir || selectedInstallDir || defaultInstallDir());
  installing = true;
  send('state', { phase: 'preparing', progress: 6, text: 'Preparando a instalação…' });

  let progress = 6;
  const timer = setInterval(() => {
    if (progress < 88) {
      const step = progress < 35 ? 3 : progress < 68 ? 2 : 1;
      progress = Math.min(88, progress + step);
      send('state', {
        phase: progress < 30 ? 'preparing' : progress < 72 ? 'installing' : 'finishing',
        progress,
        text: progress < 30 ? 'Preparando arquivos…' : progress < 72 ? 'Instalando o ChronoCord…' : 'Finalizando…',
      });
    }
  }, 420);

  const args = ['/S', `/D=${selectedInstallDir}`];
  const code = await new Promise((resolve) => {
    const child = spawn(payload, args, { windowsHide: true, stdio: 'ignore' });
    child.on('error', () => resolve(-1));
    child.on('exit', (exitCode) => resolve(Number.isInteger(exitCode) ? exitCode : -1));
  });

  clearInterval(timer);
  installing = false;

  if (code !== 0) {
    send('error', { text: code === -1 ? 'Não foi possível iniciar o instalador interno.' : `A instalação terminou com o código ${code}.` });
    return { ok: false, error: 'A instalação não foi concluída.' };
  }

  send('state', { phase: 'done', progress: 100, text: 'ChronoCord instalado com sucesso.' });
  return { ok: true, installDir: selectedInstallDir };
});

ipcMain.handle('installer:launch', async () => {
  const dir = selectedInstallDir || defaultInstallDir();
  const exe = path.join(dir, 'ChronoCord.exe');
  if (!fs.existsSync(exe)) return { ok: false, error: 'O executável instalado não foi encontrado.' };
  try {
    const child = spawn(exe, [], { detached: true, stdio: 'ignore', cwd: dir, windowsHide: false });
    child.unref();
    setTimeout(() => app.quit(), 250);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || 'Não foi possível abrir o ChronoCord.' };
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
