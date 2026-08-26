import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const settingsPath = path.join(root, 'src', 'SettingsPage.jsx');

function patch(file, from, to, label) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(to)) return false;
  if (!source.includes(from)) throw new Error(`Patch não encontrado: ${label}`);
  fs.writeFileSync(file, source.replace(from, to), 'utf8');
  console.log(`[sticker-studio] ${label}`);
  return true;
}

const source = fs.readFileSync(settingsPath, 'utf8');
if (!source.includes('import StickerStudio from "./StickerStudio";')) {
  patch(
    settingsPath,
    'import React, { useMemo, useState } from "react";\n',
    'import React, { useMemo, useState } from "react";\nimport StickerStudio from "./StickerStudio";\n',
    'import StickerStudio'
  );
}

patch(
  settingsPath,
  '  { id: "notificacoes", label: "Notificações", icon: "●" },\n  { id: "billing", label: "Cobrança", header: true },',
  '  { id: "notificacoes", label: "Notificações", icon: "●" },\n  { id: "figurinhas", label: "Figurinhas e GIFs", icon: "✦" },\n  { id: "billing", label: "Cobrança", header: true },',
  'settings navigation entry'
);

patch(
  settingsPath,
  '    if (active === "notificacoes") return <Section title="Notificações"><Row label="Som principal" value="Volume geral" action={`${sounds.masterVolume ?? 80}%`} /><input type="range" min="0" max="100" value={sounds.masterVolume ?? 80} onChange={(e) => setSounds({ ...sounds, masterVolume: Number(e.target.value) })} style={{ width: "100%", accentColor: themeColor }} /><Row label="Som de mensagem" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!sounds.messageSound} onChange={(v) => setSounds({ ...sounds, messageSound: v })} /></div><Row label="Som ao entrar em chamada" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!sounds.callJoinSound} onChange={(v) => setSounds({ ...sounds, callJoinSound: v })} /></div></Section>;\n    if (active === "voz")',
  '    if (active === "notificacoes") return <Section title="Notificações"><Row label="Som principal" value="Volume geral" action={`${sounds.masterVolume ?? 80}%`} /><input type="range" min="0" max="100" value={sounds.masterVolume ?? 80} onChange={(e) => setSounds({ ...sounds, masterVolume: Number(e.target.value) })} style={{ width: "100%", accentColor: themeColor }} /><Row label="Som de mensagem" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!sounds.messageSound} onChange={(v) => setSounds({ ...sounds, messageSound: v })} /></div><Row label="Som ao entrar em chamada" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!sounds.callJoinSound} onChange={(v) => setSounds({ ...sounds, callJoinSound: v })} /></div></Section>;\n    if (active === "figurinhas") return <StickerStudio T={T} themeColor={themeColor} />;\n    if (active === "voz")',
  'sticker studio content'
);
