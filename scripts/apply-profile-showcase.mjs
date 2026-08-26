import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src', 'ProfilePage.jsx');
let source = fs.readFileSync(file, 'utf8');

const importFrom = 'import React, { useEffect, useMemo, useState } from "react";\n';
const importTo = `${importFrom}import ProfileShowcase from "./ProfileShowcase.jsx";\n`;
if (!source.includes('import ProfileShowcase from "./ProfileShowcase.jsx";')) {
  if (!source.includes(importFrom)) throw new Error('Patch não encontrado: ProfilePage React import');
  source = source.replace(importFrom, importTo);
}

const tabAnchor = '          <div style={{ display: "flex", alignItems: "center", gap: 22, borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>\n            {[["mural", "Mural"], ["atividade", "Atividade"], ["desejos", "Lista de desejos"]].map(([id, label]) => <button key={id} onClick={() => setTab(id)} style={{ border: 0, background: "none", color: tab === id ? T.textMain : T.textDim, padding: "11px 1px 10px", marginRight: 20, borderBottom: `2px solid ${tab === id ? themeColor : "transparent"}`, cursor: "pointer", fontWeight: tab === id ? 700 : 500 }}>{label}</button>)}\n          </div>\n';

if (!source.includes('<ProfileShowcase')) {
  if (!source.includes(tabAnchor)) throw new Error('Patch não encontrado: Profile tabs anchor');
  const showcase = `${tabAnchor}\n          <ProfileShowcase\n            T={T}\n            themeColor={themeColor}\n            isMe={isMe}\n            profile={{ ...profile, about: draftAbout || profile?.about }}\n            favoriteGames={favoriteGames}\n            wantGames={wantGames}\n            onAddGame={() => { setGameTarget("favorite"); setEditOpen(true); }}\n            onEditProfile={onEditProfile}\n          />\n`;
  source = source.replace(tabAnchor, showcase);
}

fs.writeFileSync(file, source, 'utf8');
console.log('Profile showcase patch applied.');
