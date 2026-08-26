import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'src', 'ChronoCord.jsx');
const mainPath = path.join(root, 'electron', 'main.cjs');

function replaceOnce(file, from, to, label) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(to)) return { changed: false, label };
  if (!source.includes(from)) throw new Error(`Patch não encontrado: ${label}`);
  fs.writeFileSync(file, source.replace(from, to), 'utf8');
  return { changed: true, label };
}

const patches = [];
patches.push(replaceOnce(sourcePath, 'const APP_VERSION = "1.0.2";', 'const APP_VERSION = "1.0.3";', 'APP_VERSION'));
patches.push(replaceOnce(sourcePath, 'setTimeout(() => { throw e; });', 'console.error("[ChronoCord socket listener]", e);', 'socket listener isolation'));
patches.push(replaceOnce(sourcePath, 'return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;', 'return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;', 'YouTube privacy embed'));

if (!fs.readFileSync(sourcePath, 'utf8').includes('import ProfilePage from "./ProfilePage";')) {
  patches.push(replaceOnce(sourcePath, 'import React, { useState, useRef, useEffect, useMemo } from "react";\n', 'import React, { useState, useRef, useEffect, useMemo } from "react";\nimport ProfilePage from "./ProfilePage";\n', 'ProfilePage import'));
}

const watch2Anchor = 'function w2Advance(){const next=watch2Queue[0]||null;';
if (!fs.readFileSync(sourcePath, 'utf8').includes('watch2Current?.videoId, watch2Playing, watch2Volume, watch2Muted')) {
  const watch2Effect = `useEffect(() => {\n    if (!watch2Current?.videoId) return;\n    const timer = setTimeout(() => {\n      w2Post("cueVideoById", [watch2Current.videoId]);\n      w2Post("setVolume", [Math.max(0, Math.min(100, Number(watch2Volume) || 0))]);\n      w2Post(watch2Muted ? "mute" : "unMute");\n      if (watch2Playing) w2Post("playVideo");\n    }, 350);\n    return () => clearTimeout(timer);\n  }, [watch2Current?.videoId, watch2Playing, watch2Volume, watch2Muted]);\n  ${watch2Anchor}`;
  patches.push(replaceOnce(sourcePath, watch2Anchor, watch2Effect, 'Watch2 player synchronization'));
}

const voiceAnchor = '      if (!chan || !["voice","stage"].includes(String(chan.type).toLowerCase())) {\n        setVoiceJoinStatus("Este canal não é um canal de voz válido.");';
const voiceGateFrom = '        socket.emit("voice-join", { serverId: activeEra, channelId: chanId }, (ack={}) => {';
const voiceGateTo = `        if (!socket.connected) {\n          setVoiceJoinStatus("Conectando ao serviço de voz…");\n          const connection = await socket.connect();\n          if (!connection?.ok) {\n            throw new Error(connection?.error || "Não foi possível conectar ao serviço de voz.");\n          }\n        }\n        socket.emit("voice-join", { serverId: activeEra, channelId: chanId }, (ack={}) => {`;
const sourceSnapshot = fs.readFileSync(sourcePath, 'utf8');
if (sourceSnapshot.includes(voiceAnchor) && !sourceSnapshot.includes('setVoiceJoinStatus("Conectando ao serviço de voz…")')) {
  patches.push(replaceOnce(sourcePath, voiceGateFrom, voiceGateTo, 'Voice connection gate'));
}

if (!fs.readFileSync(sourcePath, 'utf8').includes('const [profilePage, setProfilePage]')) {
  patches.push(replaceOnce(
    sourcePath,
    '  const [profileModal, setProfileModal] = useState(null); // { isMe: bool, name, color, status, role, imgSrc }\n',
    '  const [profileModal, setProfileModal] = useState(null); // { isMe: bool, name, color, status, role, imgSrc }\n  const [profilePage, setProfilePage] = useState(null);\n',
    'Profile page state'
  ));
}

if (!fs.readFileSync(sourcePath, 'utf8').includes('function openProfilePage(person)')) {
  patches.push(replaceOnce(
    sourcePath,
    '  function openProfile(person) {\n    setProfileModal(person);\n  }\n',
    '  function openProfile(person) {\n    setProfileModal(person);\n  }\n\n  function openProfilePage(person) {\n    setProfileModal(null);\n    setProfilePage(person);\n  }\n',
    'Profile page opener'
  ));
}

const profileSelfButtonFrom = '<div onClick={() => { setProfileModal(null); setSettingsOpen(true); setSettingsTab("perfil"); }} style={{ marginTop: 14, textAlign: "center", background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "9px 0", borderRadius: 7, cursor: "pointer" }}>Editar perfil</div>';
const profileSelfButtonTo = '<div style={{ display: "flex", gap: 8, marginTop: 14 }}><div onClick={() => { setProfileModal(null); setSettingsOpen(true); setSettingsTab("perfil"); }} style={{ flex: 1, textAlign: "center", background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "9px 0", borderRadius: 7, cursor: "pointer" }}>Editar perfil</div><div onClick={() => openProfilePage(profileModal)} style={{ flex: 1, textAlign: "center", background: T.bg1, border: `1px solid ${T.border}`, color: T.textMain, fontWeight: 600, fontSize: 13, padding: "9px 0", borderRadius: 7, cursor: "pointer" }}>Abrir perfil</div></div>';
if (fs.readFileSync(sourcePath, 'utf8').includes(profileSelfButtonFrom)) {
  patches.push(replaceOnce(sourcePath, profileSelfButtonFrom, profileSelfButtonTo, 'Profile page self action'));
}

const profileOtherButtonFrom = '<div style={{ display: "flex", gap: 8, marginTop: 14 }}>\n                  <div onClick={() => setProfileModal(null)} style={{ flex: 1, textAlign: "center", background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "9px 0", borderRadius: 7, cursor: "pointer" }}>Enviar mensagem</div>\n                </div>';
const profileOtherButtonTo = '<div style={{ display: "flex", gap: 8, marginTop: 14 }}><div onClick={() => setProfileModal(null)} style={{ flex: 1, textAlign: "center", background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "9px 0", borderRadius: 7, cursor: "pointer" }}>Enviar mensagem</div><div onClick={() => openProfilePage(profileModal)} style={{ flex: 1, textAlign: "center", background: T.bg1, border: `1px solid ${T.border}`, color: T.textMain, fontWeight: 600, fontSize: 13, padding: "9px 0", borderRadius: 7, cursor: "pointer" }}>Ver perfil</div></div>';
if (fs.readFileSync(sourcePath, 'utf8').includes(profileOtherButtonFrom)) {
  patches.push(replaceOnce(sourcePath, profileOtherButtonFrom, profileOtherButtonTo, 'Profile page member action'));
}

const profilePageAnchor = '      {/* MODAL: CRIAR / ENTRAR EM ERA */}';
if (!fs.readFileSync(sourcePath, 'utf8').includes('{profilePage && <ProfilePage')) {
  const profilePageBlock = `      {profilePage && (\n        <ProfilePage\n          profile={profilePage}\n          isMe={!!profilePage.isMe}\n          T={T}\n          themeColor={themeColor}\n          onClose={() => setProfilePage(null)}\n          onEditProfile={() => { setProfilePage(null); setSettingsOpen(true); setSettingsTab("perfil"); }}\n        />\n      )}\n\n${profilePageAnchor}`;
  patches.push(replaceOnce(sourcePath, profilePageAnchor, profilePageBlock, 'Profile page overlay'));
}

const mainSource = fs.readFileSync(mainPath, 'utf8');
let mainNext = mainSource;
if (!mainNext.includes("clientVersion: app.getVersion()")) {
  const from = "auth: { token: String(options.token || '') },";
  const to = "auth: { token: String(options.token || ''), clientVersion: app.getVersion(), protocolVersion: 1 },";
  if (!mainNext.includes(from)) throw new Error('Patch não encontrado: Socket.IO client metadata');
  mainNext = mainNext.replace(from, to);
}
if (!mainNext.includes('const youtubeFilter =')) {
  const anchor = "const serverFilter = { urls: [`${SERVER_URL}/*`] };";
  const insert = `${anchor}\n  const youtubeFilter = { urls: ['https://www.youtube.com/*', 'https://www.youtube-nocookie.com/*'] };\n  session.defaultSession.webRequest.onBeforeSendHeaders(youtubeFilter, (details, callback) => {\n    const headers = { ...details.requestHeaders };\n    headers['Referer'] = 'https://chronocord.app/';\n    headers['Origin'] = 'https://chronocord.app';\n    callback({ requestHeaders: headers });\n  });`;
  if (!mainNext.includes(anchor)) throw new Error('Patch não encontrado: YouTube request filter');
  mainNext = mainNext.replace(anchor, insert);
}
if (!mainNext.includes('setPermissionCheckHandler')) {
  const anchor = "    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {\n      callback(permission === 'media' || permission === 'display-capture');\n    });";
  const insert = `${anchor}\n    session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin) => {\n      try {\n        const u = new URL(requestingOrigin);\n        return (permission === 'media' || permission === 'display-capture') && u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');\n      } catch { return false; }\n    });`;
  if (!mainNext.includes(anchor)) throw new Error('Patch não encontrado: permission request handler');
  mainNext = mainNext.replace(anchor, insert);
}
if (mainNext !== mainSource) {
  fs.writeFileSync(mainPath, mainNext, 'utf8');
  patches.push({ changed: true, label: 'Electron media/voice hardening' });
}

console.log(`ChronoCord stability patches: ${patches.filter(x => x.changed).length} applied, ${patches.filter(x => !x.changed).length} already present.`);
