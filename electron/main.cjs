const { app, BrowserWindow, ipcMain, session, shell, safeStorage, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { URL } = require('url');
const SERVER_URL = 'https://chronocord-server.onrender.com';
const SERVER_ORIGIN = new URL(SERVER_URL).origin;

let win;
let socketClient = null;
let socketImportPromise = null;
let localServer;
let localServerPort;
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
app.on('second-instance', () => { if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.focus(); } });


function assertAllowedServerUrl(rawUrl) {
  const target = new URL(String(rawUrl));
  const base = new URL(SERVER_URL);
  if (target.protocol !== 'https:' || target.origin !== base.origin) {
    throw new Error('Destino de rede não permitido.');
  }
  return target.toString();
}

const loginStorePath = () => path.join(app.getPath('userData'), 'login.dat');
function readSavedLogin() {
  try {
    const raw = fs.readFileSync(loginStorePath(), 'utf8');
    if (!safeStorage.isEncryptionAvailable()) return {};
    const data = JSON.parse(safeStorage.decryptString(Buffer.from(raw, 'base64')));
    return data && typeof data === 'object' ? data : {};
  } catch { return {}; }
}
function writeSavedLogin(data) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Armazenamento seguro indisponível.');
  const payload = Buffer.from(safeStorage.encryptString(JSON.stringify(data)), 'base64');
  fs.writeFileSync(loginStorePath(), payload.toString('base64'), { mode: 0o600 });
}
ipcMain.handle('auth:get-saved-login', () => readSavedLogin());
ipcMain.handle('auth:save-login', (_event, data = {}) => {
  if (!data.remember) { try { fs.unlinkSync(loginStorePath()); } catch {} return { ok:true }; }
  const username = String(data.username || '').trim(); const password = String(data.password || '');
  if (!username || !password || username.length > 64 || password.length > 256) throw new Error('Credenciais inválidas.');
  writeSavedLogin({ username, password }); return { ok:true };
});
ipcMain.handle('auth:clear-saved-login', () => { try { fs.unlinkSync(loginStorePath()); } catch {} return { ok:true }; });

ipcMain.handle('server:request', async (_event, request = {}) => {
  const target = assertAllowedServerUrl(request.url);
  const method = String(request.method || 'GET').toUpperCase();
  const headers = {};
  for (const [key, value] of Object.entries(request.headers || {})) {
    if (value == null) continue;
    const name = String(key);
    if (/^(host|origin|referer|content-length|connection|transfer-encoding)$/i.test(name)) continue;
    headers[name] = String(value);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(target, {
      method,
      headers,
      body: request.body == null || method === 'GET' || method === 'HEAD' ? undefined : String(request.body),
      signal: controller.signal,
      redirect: 'follow',
    });
    const body = await response.text();
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
  } catch (error) {
    const e = new Error(error?.name === 'AbortError' ? 'Tempo esgotado ao conectar ao servidor.' : `Falha de rede: ${error?.message || 'erro desconhecido'}`);
    e.code = error?.code || 'SERVER_REQUEST_FAILED';
    throw e;
  } finally {
    clearTimeout(timer);
  }
});

function sendMaximizedState() {
  if (win && !win.isDestroyed()) win.webContents.send('window:maximized-changed', win.isMaximized());
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
    '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
    '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp', '.ico':'image/x-icon', '.woff':'font/woff',
    '.woff2':'font/woff2', '.mp3':'audio/mpeg', '.mp4':'video/mp4', '.webm':'video/webm'
  })[ext] || 'application/octet-stream';
}

async function startLocalAppServer() {
  const root = path.resolve(__dirname, '..', 'dist');
  if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('dist/index.html não existe. Execute o build antes de abrir o Electron.');
  localServer = http.createServer((req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname === '/') pathname = '/index.html';
      const candidate = path.resolve(root, `.${pathname}`);
      if (!candidate.startsWith(root + path.sep) && candidate !== root) { res.writeHead(403); return res.end('Forbidden'); }
      let filePath = candidate;
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(root, 'index.html');
      const data = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': mimeType(filePath),
        'Cache-Control': filePath.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' https://www.youtube.com https://www.youtube-nocookie.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; frame-src https://www.youtube.com https://www.youtube-nocookie.com; connect-src 'self' https: wss: ws:; font-src 'self' data: https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none';"
      });
      res.end(data);
    } catch { res.writeHead(500); res.end('Internal Server Error'); }
  });
  await new Promise((resolve, reject) => {
    localServer.once('error', reject);
    localServer.listen(0, '127.0.0.1', () => { localServerPort = localServer.address().port; resolve(); });
  });
  return `http://127.0.0.1:${localServerPort}`;
}

function launchUpdateChecker() {
  if (process.platform !== 'win32') return;
  if (process.env.CHRONOCORD_SKIP_UPDATE === '1') return;
  const helper = path.join(process.resourcesPath, 'ChronoCordUpdater.exe');
  if (!fs.existsSync(helper)) return;
  const { spawn } = require('node:child_process');
  try {
    const child = spawn(helper, [`--current=${app.getVersion()}`, `--pid=${process.pid}`], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
  } catch {}
}


async function getSocketIoClient() {
  if (!socketImportPromise) socketImportPromise = import('socket.io-client');
  const mod = await socketImportPromise;
  return mod.io;
}

function socketBroadcast(eventName, args) {
  if (!win || win.isDestroyed()) return;
  win.webContents.send('socket:event', { event: eventName, args });
}

ipcMain.handle('socket:connect', async (_event, options = {}) => {
  const url = String(options.url || SERVER_URL);
  if (url !== SERVER_URL) throw new Error('Destino de Socket.IO não permitido.');
  if (socketClient?.connected) return { ok: true, connected: true };
  const io = await getSocketIoClient();
  if (socketClient) { try { socketClient.disconnect(); } catch {} }
  socketClient = io(url, {
    auth: { token: String(options.token || '') },
    transports: ['websocket', 'polling'],
    upgrade: true,
    timeout: 15000,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.2,
    autoConnect: true,
  });
  const forwarded = [
    'connect','connect_error','disconnect','reconnect','reconnect_attempt','reconnect_error','reconnect_failed',
    'voice-error','voice-joined','voice-participants','voice-peer-joined','voice-peer-left','voice-state','webrtc-signal',
    'sync-state','jukebox-sync','watch2-sync','jukebox-progress','watch2-progress','channel-created','channel-updated','channel-deleted',
    'dm-message','new-message','action-error','server-deleted','member-banned','soundboard-play'
  ];
  for (const name of forwarded) socketClient.on(name, (...args) => socketBroadcast(name, args));
  return await new Promise((resolve) => {
    let done = false;
    let lastError = null;
    const timer = setTimeout(() => finish({ ok: Boolean(socketClient?.connected), connected: Boolean(socketClient?.connected), id: socketClient?.id || null, error: lastError?.message || 'Tempo esgotado aguardando a conexão em tempo real.' }), 15000);
    const finish = (value) => { if (!done) { done = true; clearTimeout(timer); socketClient?.off('connect', onConnect); socketClient?.off('connect_error', onError); resolve(value); } };
    const onConnect = () => finish({ ok: true, connected: true, id: socketClient.id });
    const onError = (err) => { lastError = err; };
    socketClient.on('connect', onConnect);
    socketClient.on('connect_error', onError);
    if (socketClient.connected) onConnect();
  });
});

ipcMain.handle('socket:emit', async (_event, payload = {}) => {
  if (!socketClient) throw new Error('Socket.IO ainda não está conectado.');
  const event = String(payload.event || '');
  const args = Array.isArray(payload.args) ? payload.args : [];
  if (!event || event.length > 80) throw new Error('Evento inválido.');
  const needsAck = payload.expectAck === true;
  if (!needsAck) { socketClient.emit(event, ...args); return { ok: true }; }
  return await new Promise((resolve) => {
    let settled = false;
    const finish = (result) => { if (!settled) { settled = true; resolve(result ?? { ok: true }); } };
    const timer = setTimeout(() => finish({ ok: false, error: 'Tempo esgotado aguardando o servidor.' }), 12000);
    socketClient.emit(event, ...args, (ack) => { clearTimeout(timer); finish(ack || { ok: true }); });
  });
});

ipcMain.handle('socket:status', () => ({ connected: Boolean(socketClient?.connected), active: Boolean(socketClient?.active), id: socketClient?.id || null }));
ipcMain.handle('socket:disconnect', () => { try { socketClient?.disconnect(); } catch {} socketClient = null; return { ok: true }; });

async function create() {
  const localOrigin = await startLocalAppServer();
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1050,
    minHeight: 700,
    backgroundColor: '#0e0c18',
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    roundedCorners: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  win.once('ready-to-show', () => win.show());
  win.on('maximize', sendMaximizedState);
  win.on('unmaximize', sendMaximizedState);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = url.startsWith(localOrigin + '/') || url === localOrigin || url.startsWith('https://chronocord-server.onrender.com/');
    if (!allowed) event.preventDefault();
  });
  win.webContents.on('will-redirect', (event, url) => {
    if (!url.startsWith(localOrigin)) event.preventDefault();
  });

  // The app runs from a local Electron origin. HTTP API calls are proxied
  // through the main process above; Socket.IO still uses the renderer, so add
  // narrowly-scoped CORS response headers for the official ChronoCord server.
  const serverFilter = { urls: [`${SERVER_URL}/*`] };
  session.defaultSession.webRequest.onHeadersReceived(serverFilter, (details, callback) => {
    const headers = { ...details.responseHeaders };
    headers['Access-Control-Allow-Origin'] = [localOrigin];
    headers['Access-Control-Allow-Credentials'] = ['false'];
    headers['Access-Control-Allow-Headers'] = ['Content-Type, Authorization, X-Requested-With'];
    headers['Access-Control-Allow-Methods'] = ['GET, POST, PUT, PATCH, DELETE, OPTIONS'];
    headers['Access-Control-Max-Age'] = ['86400'];
    callback({ responseHeaders: headers });
  });

  await win.loadURL(localOrigin + '/');
}

ipcMain.on('window:minimize', () => win?.minimize());
ipcMain.on('window:close', () => win?.close());
ipcMain.handle('window:toggle-maximize', () => {
  if (!win) return false;
  if (win.isMaximized()) win.unmaximize(); else win.maximize();
  return win.isMaximized();
});
ipcMain.handle('window:is-maximized', () => Boolean(win?.isMaximized()));

if (gotLock) {
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(permission === 'media' || permission === 'display-capture');
    });
    session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
      try {
        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
        const screen = sources.find(s => /screen/i.test(s.name)) || sources[0];
        if (!screen) return callback({});
        callback({ video: screen });
      } catch { callback({}); }
    });
    create().then(() => setTimeout(launchUpdateChecker, 1800)).catch((err) => { console.error(err); app.quit(); });
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) create().catch(() => {}); });
  });
}

app.on('before-quit', () => {
  try { socketClient?.disconnect(); } catch {}
  try { localServer?.close(); } catch {}
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
