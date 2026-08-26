import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "src", "ChronoCord.jsx");
const source = fs.readFileSync(sourcePath, "utf8");
let next = source;

if (!next.includes('import ChronoAnimation from "./ChronoAnimations.jsx";')) {
  const anchor = 'import React, { useState, useRef, useEffect, useMemo } from "react";\n';
  if (!next.includes(anchor)) throw new Error("Animation pack: import anchor not found.");
  next = next.replace(anchor, `${anchor}import ChronoAnimation from "./ChronoAnimations.jsx";\n`);
}

const loadingText = '          <div style={{ fontSize: 12, color: T.textFaint, fontFamily: FONT_MONO, animation: "introPulse 1.6s ease-in-out infinite" }}>sincronizando sua timeline…</div>';
const loadingReplacement = '          <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: T.textFaint, fontFamily: FONT_MONO }}><ChronoAnimation type="dots" size={24} color={themeColor} speed={1.15} /> <span>sincronizando sua timeline…</span></div>';
if (next.includes(loadingText)) next = next.replace(loadingText, loadingReplacement);

fs.writeFileSync(sourcePath, next, "utf8");
console.log("ChronoCord animation pack: integrated.");
