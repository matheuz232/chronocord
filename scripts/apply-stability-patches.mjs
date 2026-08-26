import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'src', 'ChronoCord.jsx');
const mainPath = path.join(root, 'electron', 'main.cjs');

function replaceOnce(file, from, to, label) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(to)) return { changed: false, label };
  if (!source.includes(from)) throw new Error(`Patch não encontrado: ${label}`);
  const next = source.replace(from, to);
  fs.writeFileSync(file, next, 'utf8');
  return { changed: true, label };
}

const patches = [];
patches.push(replaceOnce(sourcePath, 'const APP_VERSION = "1.0.2";', 'const APP_VERSION = "1.0.3";', 'APP_VERSION'));
patches.push(replaceOnce(sourcePath, 'setTimeout(() => { throw e; });', 'console.error("[ChronoCord socket listener]", e);', 'socket listener isolation'));
patches.push(replaceOnce(sourcePath, 'return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;', 'return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;', 'YouTube privacy embed'));
patches.push(replaceOnce(sourcePath, 'frame-src https://www.youtube.com https://www.youtube-nocookie.com;', 'frame-src https://www.youtube.com https://www.youtube-nocookie.com;', 'YouTube frame policy')); // idempotency marker

const watch2Anchor = 'function w2Advance(){const next=watch2Queue[0]||null;';
const watch2Effect = `useEffect(() => {\n    if (!watch2Current?.videoId) return;\n    const timer = setTimeout(() => {\n      w2Post("cueVideoById", [watch2Current.videoId]);\n      w2Post("setVolume", [Math.max(0, Math.min(100, Number(watch2Volume) || 0))]);\n      w2Post(watch2Muted ? "mute" : "unMute");\n      if (watch2Playing) w2Post("playVideo");\n    }, 350);\n    return () => clearTimeout(timer);\n  }, [watch2Current?.videoId, watch2Playing, watch2Volume, watch2Muted]);\n  ${watch2Anchor}`;
if (!fs.readFileSync(sourcePath, 'utf8').includes('watch2Current?.videoId, watch2Playing, watch2Volume, watch2Muted')) {
  const r = replaceOnce(sourcePath, watch2Anchor, watch2Effect, 'Watch2 player synchronization');
  patches.push(r);
}

const mainSource = fs.readFileSync(mainPath, 'utf8');
let mainNext = mainSource;
if (!mainNext.includes("clientVersion: app.getVersion()")) {
  const from = "auth: { token: String(options.token || '') },";
  const to = "auth: { token: String(options.token || ''), clientVersion: app.getVersion(), protocolVersion: 1 },";
  if (!mainNext.includes(from)) throw new Error('Patch não encontrado: Socket.IO client metadata');
  mainNext = mainNext.replace(from, to);
}
if (!mainNext.includes("youtube.com/*`")) {
  const anchor = "const serverFilter = { urls: [`${SERVER_URL}/*`] };";
  const insert = `${anchor}\n  const youtubeFilter = { urls: ['https://www.youtube.com/*', 'https://www.youtube-nocookie.com/*'] };\n  session.defaultSession.webRequest.onBeforeSendHeaders(youtubeFilter, (details, callback) => {\n    const headers = { ...details.requestHeaders };\n    headers['Referer'] = 'https://chronocord.app/';\n    headers['Origin'] = 'https://chronocord.app';\n    callback({ requestHeaders: headers });\n  });`;
  if (!mainNext.includes(anchor)) throw new Error('Patch não encontrado: YouTube request filter');
  mainNext = mainNext.replace(anchor, insert);
}
if (mainNext !== mainSource) {
  fs.writeFileSync(mainPath, mainNext, 'utf8');
  patches.push({ changed: true, label: 'Electron WebRTC/YouTube hardening' });
}

console.log(`ChronoCord stability patches: ${patches.filter(x => x.changed).length} applied, ${patches.filter(x => !x.changed).length} already present.`);
