import React, { useState, useRef, useEffect, useMemo } from "react";
import { io } from "socket.io-client";

/* ============================================================
   ChronoCord — protótipo completo e funcional de interface
   "Discord shape, Chronos soul"

   Sistema de tema: a cor escolhida em Aparência tinge todos os
   painéis do app (barra de servidores, sidebar, chat, membros,
   modais) e é usada em botões e destaques. Qualquer texto sobre
   um bloco sólido dessa cor troca automaticamente entre preto e
   branco, conforme o brilho da cor escolhida, para manter a
   leitura sempre nítida.
   ============================================================ */

const FONT_DISPLAY = "'Space Grotesk', sans-serif";
const FONT_BODY = "'Inter', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

// paleta base (antes de aplicar o tingimento da cor de tema)
const BASE_DARK = {
  bg0: "#0E0C18",
  bg1: "#151228",
  bg2: "#1B1832",
  bg3: "#211D3D",
  bg4: "#262146",
  bg5: "#2E2856",
  border: "#332C57",
};
const BASE_LIGHT = {
  bg0: "#FFFFFF",
  bg1: "#F4F3F8",
  bg2: "#ECEBF3",
  bg3: "#F9F8FC",
  bg4: "#E4E2EF",
  bg5: "#D9D6E8",
  border: "#D6D3E6",
};
const BASE = BASE_DARK; // mantido por compatibilidade com o restante do arquivo

const TEXT_DARK = { main: "#EFEBFB", dim: "#9A93B8", faint: "#6A6390" };
const TEXT_LIGHT = { main: "#1C1830", dim: "#5B5570", faint: "#8B85A0" };
const TEXT = TEXT_DARK;

// cores semânticas fixas — não mudam com o tema, pra status continuar reconhecível
const STATUS = { online: "#3FD9BE", idle: "#E8A33D", dnd: "#E2574C", offline: "#6A6390", invisible: "#6A6390" };
const DANGER = "#E2574C";

const THEME_PRESETS = ["#E8A33D", "#3FD9BE", "#B07DF0", "#E86B9A", "#5B8CFF", "#57C765"];

const EMOJI = ["😀","😂","😍","🤔","👍","🎉","🔥","❤️","😢","😮","👀","⏳","✅","🙏","💀","😴","🥳","😎","🚀","⭐","🌙","☕","🎧","🃏"];

const AUTO_REPLIES = [
  "boa! concordo com isso.",
  "hmm, deixa eu ver aqui e te falo.",
  "kkkkk foi exatamente isso que pensei",
  "com certeza, bora marcar então.",
  "isso faz sentido, vou testar mais tarde.",
];

let uid = 1000;
const nextId = () => uid++;

/* ---------- utilidades de cor ---------- */

function hexToRgb(hex) {
  let h = (hex || "#000000").replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) h = "000000";
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(hexA, hexB, weight) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  return rgbToHex(a.r + (b.r - a.r) * weight, a.g + (b.g - a.g) * weight, a.b + (b.b - a.b) * weight);
}
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b; // brilho percebido, 0–255
}
function contrastText(hex) {
  return luminance(hex) > 150 ? "#000000" : "#FFFFFF";
}
function isValidHex(v) {
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(v);
}

function timeNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function renderRich(text, themeColor) {
  const parts = [];
  const re = /(\*\*.+?\*\*|\*.+?\*|`.+?`|@[A-Za-zÀ-ú]+(?:\s[A-Za-zÀ-ú]+)?)/g;
  let lastIndex = 0, m, key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    const token = m[0];
    if (token.startsWith("**")) parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) parts.push(<code key={key++} style={{ background: BASE.bg1, padding: "1px 5px", borderRadius: 4, fontFamily: FONT_MONO, fontSize: "0.9em" }}>{token.slice(1, -1)}</code>);
    else if (token.startsWith("@")) parts.push(<span key={key++} style={{ background: `${themeColor}33`, color: themeColor, padding: "0 4px", borderRadius: 4, fontWeight: 600 }}>{token}</span>);
    else if (token.startsWith("*")) parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function initialErasList() {
  return [
    { id: "dm", label: "Mensagens diretas", icon: "✉", isDM: true },
    { id: "1", label: "Era Aurora", icon: "AU", color: "#E8A33D" },
    { id: "2", label: "Vale Noturno", icon: "VN", color: "#3FD9BE" },
    { id: "3", label: "Setor Rift", icon: "SR", color: "#B07DF0" },
    { id: "4", label: "Confraria Sigma", icon: "CS", color: "#E2574C" },
  ];
}
function initialChannels() {
  return {
    "1": [
      { name: "Presente", channels: [{ id: "geral", name: "geral", type: "text" }, { id: "anuncios", name: "anuncios", type: "announcement" }] },
      { name: "Passado arquivado", channels: [{ id: "temporada-1", name: "temporada-1", type: "text" }, { id: "off-topic", name: "off-topic", type: "text" }] },
      { name: "Salas temporais", channels: [{ id: "voz-principal", name: "Câmara Principal", type: "voice" }, { id: "voz-estudo", name: "Estudo Cronal", type: "voice" }] },
    ],
    "2": [{ name: "Canais", channels: [{ id: "vn-geral", name: "geral", type: "text" }] }],
    "3": [{ name: "Canais", channels: [{ id: "sr-geral", name: "geral", type: "text" }] }],
    "4": [{ name: "Canais", channels: [{ id: "cs-geral", name: "geral", type: "text" }] }],
  };
}
const eraNames = { "1": "Era Aurora", "2": "Vale Noturno", "3": "Setor Rift", "4": "Confraria Sigma" };

function initialFriends() {
  return [
    { id: "lira", name: "Lira Vance", color: "#E8A33D", status: "online", role: "Guardiã do Tempo" },
    { id: "theo", name: "Theo Marsh", color: "#3FD9BE", status: "idle", role: "Cronista" },
    { id: "nyx", name: "Nyx", color: "#B07DF0", status: "dnd", role: "Cronista" },
    { id: "ferro", name: "Ferro", color: "#E2574C", status: "offline", role: "Membro" },
  ];
}
function initialMembers() {
  return {
    "1": [
      { name: "Lira Vance", status: "online", role: "Guardiã do Tempo", color: "#E8A33D" },
      { name: "Theo Marsh", status: "online", role: "Guardiã do Tempo", color: "#3FD9BE" },
      { name: "Nyx", status: "idle", role: "Cronista", color: "#B07DF0" },
      { name: "Pax", status: "idle", role: "Cronista" },
      { name: "Odalys", status: "dnd", role: "Membro" },
      { name: "Ferro", status: "offline", role: "Membro", color: "#E2574C" },
      { name: "Suri Kaan", status: "offline", role: "Membro" },
    ],
    "2": [{ name: "Você", status: "online", role: "Membro", color: "#E2574C" }],
    "3": [{ name: "Você", status: "online", role: "Membro", color: "#E2574C" }],
    "4": [{ name: "Você", status: "online", role: "Membro", color: "#E2574C" }],
  };
}
function seedMessages() {
  return {
    geral: [
      { id: nextId(), author: "Lira Vance", color: "#E8A33D", time: "14:02", text: "pessoal, a sincronização do próximo ciclo já tá marcada — sexta às 20h.", reactions: {} },
      { id: nextId(), author: "Theo Marsh", color: "#3FD9BE", time: "14:05", text: "eu marco presença. alguém mais topa testar o *novo mapa* antes disso?", reactions: { "🎉": ["Nyx"] } },
      { id: nextId(), author: "Nyx", color: "#B07DF0", time: "14:11", text: "posso testar amanhã de manhã, meu fuso adianta 3h em relação ao resto do grupo 😅", reactions: {} },
      { id: nextId(), author: "Você", color: "#E2574C", time: "14:13", text: "fechado, eu entro com vocês. @Lira Vance bora deixar isso registrado no #anuncios também.", reactions: { "👍": ["Lira Vance", "Theo Marsh"] } },
    ],
    anuncios: [{ id: nextId(), author: "Lira Vance", color: "#E8A33D", time: "09:00", text: "📌 lembrete: manutenção cronal domingo às 3h.", reactions: {} }],
    "temporada-1": [], "off-topic": [], "vn-geral": [], "sr-geral": [], "cs-geral": [],
    "dm-lira": [{ id: nextId(), author: "Lira Vance", color: "#E8A33D", time: "13:40", text: "oi! você viu minha mensagem no #geral?", reactions: {} }],
    "dm-theo": [{ id: nextId(), author: "Theo Marsh", color: "#3FD9BE", time: "11:02", text: "valeu por ontem 🙏", reactions: {} }],
    "dm-nyx": [], "dm-ferro": [],
  };
}

/* ---------- átomos de UI ---------- */

function StatusDot({ status, size = 12, ringColor }) {
  return <span style={{ position: "absolute", bottom: -2, right: -2, width: size, height: size, borderRadius: "50%", background: STATUS[status] || TEXT.faint, border: `2.5px solid ${ringColor}` }} />;
}
function Avatar({ initials, color, size = 36, status, ringColor, imgSrc, onClick, shape = "circle" }) {
  const bg = color || "#3A3466";
  const txt = contrastText(bg);
  const radius = shape === "square" ? size * 0.32 : "50%";
  return (
    <div onClick={onClick} style={{ position: "relative", width: size, height: size, flexShrink: 0, cursor: onClick ? "pointer" : "default" }}>
      {imgSrc ? (
        <img src={imgSrc} alt={initials} style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", display: "block" }} />
      ) : (
        <div style={{ width: size, height: size, borderRadius: radius, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: size * 0.36, color: txt }}>{initials}</div>
      )}
      {status && <StatusDot status={status} size={size * 0.32} ringColor={ringColor} />}
    </div>
  );
}
function ChannelIcon({ type, color }) {
  if (type === "voice") return <Icon name="speaker" size={15} color={color || "currentColor"} style={{ opacity: 0.75 }} />;
  if (type === "announcement") return <Icon name="megaphone" size={14} color={color || "currentColor"} style={{ opacity: 0.75 }} />;
  if (type === "welcome") return <Icon name="wave" size={14} color={color || "currentColor"} style={{ opacity: 0.75 }} />;
  if (type === "leave-log") return <Icon name="doorOut" size={14} color={color || "currentColor"} style={{ opacity: 0.75 }} />;
  return <span style={{ opacity: 0.55, fontFamily: FONT_MONO }}>#</span>;
}
function Modal({ onClose, width = 380, bg, border, children }) {
  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "#000000aa", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width, background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 20, boxShadow: "0 30px 60px rgba(0,0,0,0.5)", maxHeight: "80vh", overflowY: "auto" }}>{children}</div>
    </div>
  );
}

const isElectron = typeof window !== "undefined" && !!window.electronAPI;

/* ---------- ícones (conjunto próprio, traço fino, 20x20) ---------- */

function Icon({ name, size = 16, color = "currentColor", style }) {
  const p = { fill: "none", stroke: color, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    settings: <><circle cx="10" cy="10" r="2.6" {...p} />{[0, 60, 120, 180, 240, 300].map((deg) => (<line key={deg} x1="10" y1="3.2" x2="10" y2="5.4" transform={`rotate(${deg} 10 10)`} {...p} />))}</>,
    pin: <path d="M10 2.5c-2.1 0-3.8 1.7-3.8 3.8 0 2.6 3.8 8.7 3.8 8.7s3.8-6.1 3.8-8.7c0-2.1-1.7-3.8-3.8-3.8Z M10 8.3a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z" {...p} />,
    bell: <path d="M5.5 14.5h9M15 14.5c-1-1-1.3-2.4-1.3-4V9a3.7 3.7 0 0 0-7.4 0v1.5c0 1.6-.3 3-1.3 4M8.3 16.8a1.7 1.7 0 0 0 3.4 0" {...p} />,
    bellOff: <><path d="M5.5 14.5h9M15 14.5c-1-1-1.3-2.4-1.3-4V9c0-.6-.1-1.1-.3-1.6M8.3 16.8a1.7 1.7 0 0 0 3.4 0M6.7 6.7A3.7 3.7 0 0 0 5.7 9v1.5c0 1.6-.3 3-1.3 4" {...p} /><line x1="3.5" y1="3.5" x2="16.5" y2="16.5" {...p} /></>,
    mic: <><rect x="7.3" y="2.8" width="5.4" height="8.6" rx="2.7" {...p} /><path d="M4.5 9.3a5.5 5.5 0 0 0 11 0M10 14.8v2.4M7.3 17.2h5.4" {...p} /></>,
    micOff: <><path d="M4.5 9.3a5.5 5.5 0 0 0 8.2 4.8M14.8 10.6c.1-.4.2-.9.2-1.3M10 14.8v2.4M7.3 17.2h5.4M7.3 6.3V5.4a2.7 2.7 0 0 1 5.2-1" {...p} /><line x1="3.2" y1="3.2" x2="16.8" y2="16.8" {...p} /></>,
    headphones: <path d="M4 12.5V10a6 6 0 0 1 12 0v2.5 M4 12.5a1.6 1.6 0 0 0-1.6 1.6v1.3A1.6 1.6 0 0 0 4 17H5a1 1 0 0 0 1-1v-2.5a1 1 0 0 0-1-1H4Zm12 0h-1a1 1 0 0 0-1 1V16a1 1 0 0 0 1 1h1a1.6 1.6 0 0 0 1.6-1.6v-1.3A1.6 1.6 0 0 0 16 12.5Z" {...p} />,
    speaker: <><path d="M3.5 8v4h2.6L10 15V5L6.1 8H3.5Z" {...p} /><path d="M12.6 7a4 4 0 0 1 0 6M14.8 5a7 7 0 0 1 0 10" {...p} /></>,
    megaphone: <path d="M3 8.5v3a1 1 0 0 0 1 1h1l1.5 4h1.6l-1-4H10l5.5 3V4.5L10 7.5H5a1 1 0 0 0-1 1Z" {...p} />,
    plus: <><line x1="10" y1="4" x2="10" y2="16" {...p} /><line x1="4" y1="10" x2="16" y2="10" {...p} /></>,
    search: <><circle cx="8.6" cy="8.6" r="4.8" {...p} /><line x1="12.2" y1="12.2" x2="16.5" y2="16.5" {...p} /></>,
    paperclip: <path d="M13.5 6.2 8 11.7a2.3 2.3 0 0 0 3.3 3.3l5.2-5.2a3.7 3.7 0 0 0-5.3-5.3L5.9 9.8a5.2 5.2 0 0 0 7.4 7.4" {...p} />,
    smile: <><circle cx="10" cy="10" r="7" {...p} /><circle cx="7.3" cy="8.5" r="0.9" fill={color} stroke="none" /><circle cx="12.7" cy="8.5" r="0.9" fill={color} stroke="none" /><path d="M6.8 11.8c.7 1.2 2 2 3.2 2s2.5-.8 3.2-2" {...p} /></>,
    send: <path d="M17 3 3 9.2l5.8 2 2 5.8L17 3Zm0 0L8.8 11.2" {...p} />,
    image: <><rect x="3" y="4" width="14" height="12" rx="2" {...p} /><circle cx="7.3" cy="8.3" r="1.3" {...p} /><path d="M4 15l4.3-4.3a1.5 1.5 0 0 1 2.1 0L14 14.3M12.3 12.6l1-1a1.5 1.5 0 0 1 2.1 0L17 13.2" {...p} /></>,
    edit: <path d="M13.4 3.6a1.7 1.7 0 0 1 2.4 2.4L6.5 15.3l-3.2.8.8-3.2 9.3-9.3Z" {...p} />,
    trash: <path d="M4.5 6h11M8.2 6V4.3a1 1 0 0 1 1-1h1.6a1 1 0 0 1 1 1V6M6.3 6l.6 9.3a1.4 1.4 0 0 0 1.4 1.3h3.4a1.4 1.4 0 0 0 1.4-1.3L13.7 6" {...p} />,
    reply: <path d="M9 6.5 3.5 10 9 13.5v-2.6c4 0 6.5 1 8 4.1-1-5.5-3.5-8-8-8V6.5Z" {...p} />,
    x: <><line x1="4.5" y1="4.5" x2="15.5" y2="15.5" {...p} /><line x1="15.5" y1="4.5" x2="4.5" y2="15.5" {...p} /></>,
    chevronDown: <path d="M4.5 7.5 10 13l5.5-5.5" {...p} />,
    minimize: <line x1="4" y1="10" x2="16" y2="10" {...p} />,
    maximize: <rect x="4.8" y="4.8" width="10.4" height="10.4" rx="1.4" {...p} />,
    restore: <><rect x="6.6" y="3.5" width="9.2" height="9.2" rx="1.3" {...p} /><path d="M3.5 6.6v8.2a1.7 1.7 0 0 0 1.7 1.7h8.2" {...p} /></>,
    camera: <><rect x="2.5" y="6" width="15" height="10.5" rx="2" {...p} /><path d="M7 6l1.2-2h3.6L13 6" {...p} /><circle cx="10" cy="11.2" r="3" {...p} /></>,
    compass: <><circle cx="10" cy="10" r="7.3" {...p} /><path d="M12.6 7.4 11 11l-3.6 1.6L9 9l3.6-1.6Z" {...p} /></>,
    music: <><circle cx="6" cy="15.5" r="2.2" {...p} /><circle cx="14.5" cy="14" r="2.2" {...p} /><path d="M8.2 15.5V4.8L16.7 3v9.2" {...p} /></>,
    play: <path d="M6 4.2v11.6l9.5-5.8L6 4.2Z" {...p} fill={color} stroke="none" />,
    pause: <><rect x="5.5" y="4" width="3.2" height="12" rx="1" fill={color} stroke="none" /><rect x="11.3" y="4" width="3.2" height="12" rx="1" fill={color} stroke="none" /></>,
    skip: <><path d="M5 4.5v11l8-5.5-8-5.5Z" fill={color} stroke="none" /><rect x="14" y="4.5" width="2" height="11" rx="0.5" fill={color} stroke="none" /></>,
    video: <><rect x="2.5" y="5" width="10.5" height="10" rx="2" {...p} /><path d="M13 8.3l4.5-2.6v8.6L13 11.7" {...p} /></>,
    wave: <path d="M3.5 12c1-3 2-5 2-7a1.7 1.7 0 0 1 3.4 0v4M8.9 9V4a1.7 1.7 0 0 1 3.4 0v5M12.3 9.3V5.6a1.7 1.7 0 0 1 3.4 0V12c0 3-2 5.5-5 5.5h-1.6c-1.8 0-2.8-.6-3.8-2l-2-3c-.6-.9.4-2 1.4-1.4l1.8 1.2" {...p} />,
    doorOut: <><path d="M9 3.5H5.8a1.3 1.3 0 0 0-1.3 1.3v10.4a1.3 1.3 0 0 0 1.3 1.3H9" {...p} /><path d="M8.7 10h8M14 6.7 17 10l-3 3.3" {...p} /></>,
    lock: <><rect x="4.3" y="9" width="11.4" height="8" rx="1.8" {...p} /><path d="M6.5 9V6.2a3.5 3.5 0 0 1 7 0V9" {...p} /></>,
    sun: <><circle cx="10" cy="10" r="3.4" {...p} />{[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (<line key={d} x1="10" y1="3.2" x2="10" y2="5" transform={`rotate(${d} 10 10)`} {...p} />))}</>,
    rewind: <><path d="M9.5 4.5v11l-7-5.5 7-5.5Z" fill={color} stroke="none" /><path d="M17 4.5v11l-7-5.5 7-5.5Z" fill={color} stroke="none" /></>,
    forward: <><path d="M10.5 4.5v11l7-5.5-7-5.5Z" fill={color} stroke="none" /><path d="M3 4.5v11l7-5.5-7-5.5Z" fill={color} stroke="none" /></>,
    stop: <rect x="5" y="5" width="10" height="10" rx="1.5" fill={color} stroke="none" />,
    screen: <><rect x="2.5" y="4" width="15" height="10" rx="1.8" {...p} /><path d="M7 17.5h6M10 14v3.5" {...p} /></>,
    check: <path d="M4.5 10.5 8 14l7.5-8" {...p} />,
    crown: <path d="M3 15h14l-1.2-7-3.3 3-2.5-5.5-2.5 5.5-3.3-3L3 15Z" {...p} />,
    shield: <path d="M10 2.8 16 5v5c0 4-2.6 6.6-6 8-3.4-1.4-6-4-6-8V5l6-2.2Z" {...p} />,
    ban: <><circle cx="10" cy="10" r="7.3" {...p} /><line x1="4.8" y1="15.2" x2="15.2" y2="4.8" {...p} /></>,
    scroll: <path d="M5 3.5h9v11a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 14.5v-11ZM5 6.5H3.5a1.5 1.5 0 0 0 0 3H5" {...p} />,
    users: <><circle cx="7" cy="7.5" r="2.7" {...p} /><path d="M2.5 16c.5-3 2.2-4.6 4.5-4.6s4 1.6 4.5 4.6" {...p} /><circle cx="14.5" cy="8" r="2.1" {...p} /><path d="M12.6 11.6c1.8.3 3 1.6 3.5 4.4" {...p} /></>,
    puzzle: <path d="M7.5 3.5h3v1.6a1.4 1.4 0 0 0 2.4 1 1.4 1.4 0 0 1 2.4 1v3.2H14a1.4 1.4 0 1 0 0 2.8h1.3V16h-3.2a1.4 1.4 0 1 0-2.8 0H6.4v-3.2a1.4 1.4 0 1 0-2.8 0H2.3V9.1h1.3a1.4 1.4 0 1 0 0-2.8H2.3V3.5h5.2Z" {...p} />,
  };
  return <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: "block", flexShrink: 0, ...style }}>{paths[name]}</svg>;
}

const PUBLIC_ERAS = [
  { code: "vento-solar", name: "Vento Solar", icon: "VS", color: "#57C765", desc: "comunidade aberta sobre astronomia e ficção científica" },
  { code: "clube-cronal", name: "Clube Cronal", icon: "CC", color: "#5B8CFF", desc: "discussões abertas sobre a lore do ChronoCord" },
  { code: "arquivo-vivo", name: "Arquivo Vivo", icon: "AV", color: "#E86B9A", desc: "arte e escrita colaborativa" },
];

function RoleBadge({ role }) {
  if (role === "Dono(a)" || role === "Fundadora(o)") return <Icon name="crown" size={12} color="#E8A33D" style={{ flexShrink: 0 }} />;
  if (role === "Moderador(a)") return <Icon name="shield" size={12} color="#3FD9BE" style={{ flexShrink: 0 }} />;
  return null;
}

function BannerMedia({ banner, fallbackColor, borderRadius = 0, height }) {
  return (
    <div style={{ position: "relative", width: "100%", height, aspectRatio: height ? undefined : "2.5 / 1", borderRadius, overflow: "hidden", background: banner ? "#000" : `linear-gradient(135deg, ${fallbackColor}, #2E2856)` }}>
      {banner?.type === "video" && <video src={banner.src} autoPlay loop muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
      {banner?.type === "image" && <img src={banner.src} alt="banner" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
    </div>
  );
}

function mapRange(str, upperStart, lowerStart) {
  return [...str].map((ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(upperStart + (code - 65));
    if (code >= 97 && code <= 122) return String.fromCodePoint(lowerStart + (code - 97));
    return ch;
  }).join("");
}
const SMALLCAPS_MAP = { a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ" };
const NAME_STYLES = [
  { id: "bold", label: "𝐍𝐞𝐠𝐫𝐢𝐭𝐨", fn: (s) => mapRange(s, 0x1d400, 0x1d41a) },
  { id: "script", label: "𝒞𝓊𝓇𝓈𝒾𝓋𝑜", fn: (s) => mapRange(s, 0x1d4d0, 0x1d4ea) },
  { id: "fraktur", label: "𝔊ó𝔱𝔦𝔠𝔬", fn: (s) => mapRange(s, 0x1d56c, 0x1d586) },
  { id: "circle", label: "Ⓒ ⓘ ⓡ ⓒ", fn: (s) => mapRange(s, 0x24b6, 0x24d0) },
  { id: "fullwidth", label: "Ｌａｒｇｏ", fn: (s) => mapRange(s, 0xff21, 0xff41) },
  { id: "mono", label: "𝙼𝚘𝚗𝚘", fn: (s) => mapRange(s, 0x1d670, 0x1d68a) },
  { id: "smallcaps", label: "ᴘᴇǫᴜᴇɴᴀꜱ", fn: (s) => [...s.toLowerCase()].map((c) => SMALLCAPS_MAP[c] || c).join("") },
];

const APP_VERSION = "0.2.1";

function VoidFigureIcon({ size = 44, bg, fg }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="22" fill={bg} />
      <circle cx="22" cy="22" r="15" fill="none" stroke={fg} strokeWidth="1.1" opacity="0.35" />
      <circle cx="22" cy="22" r="9.5" fill="none" stroke={fg} strokeWidth="1.1" opacity="0.55" />
      {/* figura estilizada caindo em espiral pro centro */}
      <g transform="translate(22 19) rotate(18)" fill="none" stroke={fg} strokeWidth="1.8" strokeLinecap="round">
        <circle cx="0" cy="-5.6" r="1.7" fill={fg} stroke="none" />
        <path d="M0 -4 v3.2 M0 -0.8 l-3 3.4 M0 -0.8 l3.2 3 M0 2.4 l-2.4 4 M0 2.4 l2.6 3.8" />
      </g>
    </svg>
  );
}

/* ---------- app ---------- */

export default function ChronoCord() {
  const [eras, setEras] = useState(initialErasList);
  const [view, setView] = useState("server");
  const [activeEra, setActiveEra] = useState("1");
  const [activeChannel, setActiveChannel] = useState("geral");
  const [activeFriend, setActiveFriend] = useState("lira");
  const [friends, setFriends] = useState(initialFriends);
  const [membersByEra, setMembersByEra] = useState(initialMembers);
  const [channelsByEra, setChannelsByEra] = useState(initialChannels);
  const [unread, setUnread] = useState({ "1": 3, "2": 0, "3": 12, "4": 0 });
  const [mutedChannels, setMutedChannels] = useState({});
  const [mutedEras, setMutedEras] = useState({});

  const [store, setStore] = useState(seedMessages);
  const [pinned, setPinned] = useState({});
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [reactMenuFor, setReactMenuFor] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [typingOf, setTypingOf] = useState(null);
  const [showPinnedPanel, setShowPinnedPanel] = useState(false);
  const [search, setSearch] = useState("");

  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [myStatus, setMyStatus] = useState("online");
  const [myName, setMyName] = useState("Você");

  // ---- TEMA ----
  const [themeColor, setThemeColor] = useState("#E8A33D");
  const [themeMode, setThemeMode] = useState("padrao"); // 'padrao' | 'escuro' | 'claro'
  const [hexDraft, setHexDraft] = useState("#E8A33D");
  const [hexError, setHexError] = useState(false);
  const [tintStrength, setTintStrength] = useState(9); // % de tingimento nos painéis

  const [notifPrefs, setNotifPrefs] = useState({ sons: true, desktop: true, mencoes: true });
  const [voiceIn, setVoiceIn] = useState("Microfone padrão");
  const [voiceOut, setVoiceOut] = useState("Alto-falantes padrão");
  const [inputVol, setInputVol] = useState(72);
  const [outputVol, setOutputVol] = useState(85);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("conta");
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [newChanName, setNewChanName] = useState("");
  const [newChanType, setNewChanType] = useState("text");
  const [newChanRestricted, setNewChanRestricted] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [addFriendName, setAddFriendName] = useState("");
  const [addFriendMsg, setAddFriendMsg] = useState("");
  const [copyState, setCopyState] = useState("Copiar");

  const [voiceState, setVoiceState] = useState({ connected: false, channelId: null, channelName: "", muted: false, deafened: false });

  // ---- PERFIL ----
  const [myAvatarUrl, setMyAvatarUrl] = useState(null);
  const [avatarShape, setAvatarShape] = useState("circle"); // 'circle' | 'square'
  const [nameEmojiPickerOpen, setNameEmojiPickerOpen] = useState(false);

  // ---- JUKEBOX (player compartilhado da chamada de voz) ----
  const [jukeboxOpen, setJukeboxOpen] = useState(false);
  const [queue, setQueue] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null); // { id, title, type, duration }
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showVideoArea, setShowVideoArea] = useState(false);
  const [newTrackTitle, setNewTrackTitle] = useState("");
  const [newTrackType, setNewTrackType] = useState("music");
  const jukeboxTimer = useRef(null);

  // ---- CONTA E SERVIDOR REAL ----
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const SERVER_URL = "https://chronocord-server.onrender.com";
  const socketRef = useRef(null);

  // ---- MENU DE CONTEXTO DO SERVIDOR ----
  const [eraContextMenu, setEraContextMenu] = useState(null); // { id, x, y }
  const [hideMutedChannels, setHideMutedChannels] = useState(false);
  const [leaveConfirmId, setLeaveConfirmId] = useState(null);

  // ---- CONFIGURAÇÕES DO SERVIDOR ----
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const [serverSettingsTab, setServerSettingsTab] = useState("perfil");
  const [eraSettingsMap, setEraSettingsMap] = useState({});
  const [rolesByEra, setRolesByEra] = useState({});
  const [invitesByEra, setInvitesByEra] = useState({});
  const [bansByEra, setBansByEra] = useState({});
  const [auditLogByEra, setAuditLogByEra] = useState({});
  const [customEmojisByEra, setCustomEmojisByEra] = useState({});
  const [stickersByEra, setStickersByEra] = useState({});
  const [serverSoundsByEra, setServerSoundsByEra] = useState({});

  const [newCharacteristic, setNewCharacteristic] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleIcon, setNewRoleIcon] = useState(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [newInviteMaxUses, setNewInviteMaxUses] = useState("Sem limite");
  const [banSearch, setBanSearch] = useState("");
  const [newEmojiName, setNewEmojiName] = useState("");
  const [newStickerName, setNewStickerName] = useState("");
  const [stickerError, setStickerError] = useState("");
  const [soundError, setSoundError] = useState("");
  const [deleteServerConfirm, setDeleteServerConfirm] = useState(false);
  const [membersTab, setMembersTab] = useState("ativos"); // 'ativos' | 'recentes' | 'sairam'

  // ---- WATCH2CHRONOS ----
  const [watch2Open, setWatch2Open] = useState(false);
  const [watch2Queue, setWatch2Queue] = useState([]);
  const [watch2Current, setWatch2Current] = useState(null); // { id, title, embedUrl }
  const [watch2Playing, setWatch2Playing] = useState(true);
  const [watch2Volume, setWatch2Volume] = useState(80);
  const [watch2Brightness, setWatch2Brightness] = useState(100);
  const [watch2UrlInput, setWatch2UrlInput] = useState("");
  const [watch2Elapsed, setWatch2Elapsed] = useState(0);
  const watch2IframeRef = useRef(null);
  const watch2Timer = useRef(null);
  const [myBanner, setMyBanner] = useState(null); // { type: 'image'|'video', src }
  const [myBannerUrl, setMyBannerUrl] = useState(null);
  const [nameStyle, setNameStyle] = useState({ effect: "solid", color: "#EFEBFB", surprise: false });
  const [customStatus, setCustomStatus] = useState("");
  const [bannerError, setBannerError] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [profileModal, setProfileModal] = useState(null); // { isMe: bool, name, color, status, role, imgSrc }

  // ---- CRIAR / ENTRAR EM ERA ----
  const [addEraOpen, setAddEraOpen] = useState(false);
  const [addEraTab, setAddEraTab] = useState("create");
  const [newEraName, setNewEraName] = useState("");
  const [newEraIcon, setNewEraIcon] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinedPublicCodes, setJoinedPublicCodes] = useState([]);

  // ---- NOVAS ABAS DE CONFIGURAÇÃO ----
  const [privacy, setPrivacy] = useState({ analytics: true, readReceipts: true, dmFromServerMembers: true });
  const [permissions, setPermissions] = useState({ dmFromMembers: true, friendRequests: true, filterExplicitImages: true });
  const [cameraDevice, setCameraDevice] = useState("Webcam padrão");
  const [cameraBg, setCameraBg] = useState("Nenhum");
  const [streamQuality, setStreamQuality] = useState("1080p 60fps");
  const [streamAudio, setStreamAudio] = useState(true);
  const [sounds, setSounds] = useState({ masterVolume: 80, messageSound: true, callJoinSound: true });
  const [soundboardVolume, setSoundboardVolume] = useState(70);
  const [playingSound, setPlayingSound] = useState(null);
  const [advanced, setAdvanced] = useState({ devMode: false, hardwareAccel: true, linkPreviews: true });
  const [accessibility, setAccessibility] = useState({ reduceMotion: false, autoplayGifs: true, highContrast: false, chatFontSize: 14 });
  const [systemPrefs, setSystemPrefs] = useState({ openOnStartup: false, minimizeToTray: true, startMinimized: false });
  const [language, setLanguage] = useState("Português (Brasil)");
  const [timeFormat, setTimeFormat] = useState("24 horas");

  const scrollRef = useRef(null);
  const typingTimeout = useRef(null);

  const [showIntro, setShowIntro] = useState(true);
  const [introFading, setIntroFading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setIntroFading(true), 1800);
    const t2 = setTimeout(() => setShowIntro(false), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  useEffect(() => {
    if (!isElectron) return;
    window.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});
    window.electronAPI.onMaximizeChange(setIsMaximized);
  }, []);

  // paleta derivada: cada painel ganha um pouco da cor do tema misturada
  const T = useMemo(() => {
    const isLight = themeMode === "claro";
    const base = isLight ? BASE_LIGHT : BASE_DARK;
    const textSet = isLight ? TEXT_LIGHT : TEXT_DARK;
    const w = (themeMode === "escuro" ? 0 : tintStrength) / 100;
    return {
      color: themeColor,
      text: contrastText(themeColor),
      textMain: textSet.main,
      textDim: textSet.dim,
      textFaint: textSet.faint,
      bg0: mix(base.bg0, themeColor, w * 0.6),
      bg1: mix(base.bg1, themeColor, w * 0.7),
      bg2: mix(base.bg2, themeColor, w * 0.8),
      bg3: mix(base.bg3, themeColor, w * 0.7),
      bg4: mix(base.bg4, themeColor, w),
      bg5: mix(base.bg5, themeColor, w * 1.1),
      border: mix(base.border, themeColor, w * 1.2),
    };
  }, [themeColor, themeMode, tintStrength]);

  const eraChannels = channelsByEra[activeEra] || [];
  const chatKey = view === "dm" ? `dm-${activeFriend}` : activeChannel;
  const messages = store[chatKey] || [];
  const members = membersByEra[activeEra] || [];
  const currentFriend = friends.find((f) => f.id === activeFriend);
  const pinnedList = pinned[chatKey] || [];

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, chatKey]);
  useEffect(() => () => clearTimeout(typingTimeout.current), []);

  useEffect(() => {
    if (!isPlaying || !nowPlaying) return;
    jukeboxTimer.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= nowPlaying.duration) {
          advanceQueue();
          return 0;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(jukeboxTimer.current);
  }, [isPlaying, nowPlaying]);

  function addToQueue() {
    if (!newTrackTitle.trim()) return;
    const track = { id: nextId(), title: newTrackTitle.trim(), type: newTrackType, duration: newTrackType === "video" ? 180 : 210, addedBy: myName };
    if (!nowPlaying) {
      setNowPlaying(track);
      setIsPlaying(true);
      setElapsed(0);
    } else {
      setQueue((q) => [...q, track]);
    }
    setNewTrackTitle("");
    if (socketRef.current && activeEra) socketRef.current.emit("jukebox-sync", { serverId: activeEra, state: { nowPlaying: !nowPlaying ? track : nowPlaying, queue: nowPlaying ? [...queue, track] : queue, isPlaying: true, elapsed: 0 } });
  }

  function advanceQueue() {
    setQueue((q) => {
      const [next, ...rest] = q;
      setNowPlaying(next || null);
      setIsPlaying(!!next);
      return rest;
    });
    setElapsed(0);
    if (socketRef.current && activeEra) socketRef.current.emit("jukebox-sync", { serverId: activeEra, state: { nowPlaying: null, queue: [], isPlaying: false, elapsed: 0 } });
  }

  function removeFromQueue(id) { setQueue((q) => q.filter((t) => t.id !== id)); }
  function fmtDuration(sec) { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return `${m}:${String(s).padStart(2, "0")}`; }

  // ---- canais restritos: só dono/moderador escrevem ----
  function canWriteInChannel(chan) {
    if (!chan?.restricted) return true;
    const era = eras.find((e) => e.id === activeEra);
    if (era?.real) return era.ownerId === authUser?.id;
    const myMember = (membersByEra[activeEra] || []).find((m) => m.name === myName);
    return !!myMember && ["Dono(a)", "Fundadora(o)", "Moderador(a)"].includes(myMember.role);
  }

  // ---- Watch2Chronos ----
  function extractYoutubeId(url) {
    const patterns = [/youtu\.be\/([\w-]{11})/, /[?&]v=([\w-]{11})/, /youtube\.com\/embed\/([\w-]{11})/, /youtube\.com\/live\/([\w-]{11})/];
    for (const re of patterns) {
      const m = url.match(re);
      if (m) return m[1];
    }
    return null;
  }
  function w2Post(func, args = []) {
    try { watch2IframeRef.current?.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*"); } catch (e) {}
  }
  function w2AddToQueue() {
    const id = extractYoutubeId(watch2UrlInput.trim());
    if (!id) { return; }
    const track = { id: nextId(), title: watch2UrlInput.trim(), videoId: id, embedUrl: `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&modestbranding=1&rel=0` };
    if (!watch2Current) { setWatch2Current(track); setWatch2Playing(true); }
    else setWatch2Queue((q) => [...q, track]);
    setWatch2UrlInput("");
  }
  function w2Advance() {
    setWatch2Queue((q) => { const [next, ...rest] = q; setWatch2Current(next || null); setWatch2Playing(!!next); return rest; });
  }
  function w2TogglePlay() { setWatch2Playing((p) => { w2Post(p ? "pauseVideo" : "playVideo"); return !p; }); }
  function w2Seek(delta) {
    const target = Math.max(0, watch2Elapsed + delta);
    w2Post("seekTo", [target, true]);
    setWatch2Elapsed(target);
  }
  function w2Stop() { setWatch2Current(null); setWatch2Queue([]); setWatch2Playing(false); }
  useEffect(() => { w2Post("setVolume", [watch2Volume]); }, [watch2Volume, watch2Current]);
  useEffect(() => {
    if (!watch2Playing || !watch2Current) return;
    watch2Timer.current = setInterval(() => setWatch2Elapsed((e) => e + 1), 1000);
    return () => clearInterval(watch2Timer.current);
  }, [watch2Playing, watch2Current]);
  useEffect(() => { setWatch2Elapsed(0); }, [watch2Current]);

  const filteredMessages = useMemo(() => {
    if (!search.trim()) return messages;
    return messages.filter((m) => m.text.toLowerCase().includes(search.toLowerCase()));
  }, [messages, search]);

  function updateMessages(key, updater) { setStore((s) => ({ ...s, [key]: updater(s[key] || []) })); }

  function triggerAutoReply(key, authorPool) {
    if (!authorPool.length) return;
    const author = authorPool[Math.floor(Math.random() * authorPool.length)];
    setTypingOf(author.name);
    typingTimeout.current = setTimeout(() => {
      setTypingOf(null);
      updateMessages(key, (m) => [...m, { id: nextId(), author: author.name, color: author.color, time: timeNow(), text: AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)], reactions: {} }]);
    }, 1300 + Math.random() * 900);
  }

  function sendMessage() {
    if (!draft.trim() && !attachment) return;
    const chan = view === "server" ? findChannelObj(activeEra, activeChannel) : null;
    if (chan?.real && socketRef.current) {
      socketRef.current.emit("send-message", { channelId: activeChannel, text: draft.trim(), attachment, replyTo: replyingTo });
      setDraft(""); setReplyingTo(null); setAttachment(null);
      return;
    }
    const msg = { id: nextId(), author: myName, color: themeColor, time: timeNow(), text: draft.trim(), reactions: {}, replyTo: replyingTo, attachment };
    updateMessages(chatKey, (m) => [...m, msg]);
    setDraft(""); setReplyingTo(null); setAttachment(null);
    const pool = view === "dm" ? [currentFriend] : members.filter((m) => m.name !== "Você");
    if (pool.length && Math.random() > 0.25) triggerAutoReply(chatKey, pool);
  }

  function toggleReaction(msgId, emoji) {
    updateMessages(chatKey, (m) => m.map((msg) => {
      if (msg.id !== msgId) return msg;
      const current = msg.reactions[emoji] || [];
      const has = current.includes(myName);
      const nextUsers = has ? current.filter((u) => u !== myName) : [...current, myName];
      const reactions = { ...msg.reactions };
      if (nextUsers.length) reactions[emoji] = nextUsers; else delete reactions[emoji];
      return { ...msg, reactions };
    }));
    setReactMenuFor(null);
  }

  function deleteMessage(id) { updateMessages(chatKey, (m) => m.filter((msg) => msg.id !== id)); }
  function saveEdit(id) { updateMessages(chatKey, (m) => m.map((msg) => (msg.id === id ? { ...msg, text: editText, edited: true } : msg))); setEditingId(null); }
  function togglePin(msg) {
    setPinned((p) => {
      const list = p[chatKey] || [];
      const exists = list.find((x) => x.id === msg.id);
      return { ...p, [chatKey]: exists ? list.filter((x) => x.id !== msg.id) : [...list, msg] };
    });
  }

  function selectEra(id) { setActiveEra(id); setView("server"); setUnread((u) => ({ ...u, [id]: 0 })); setServerMenuOpen(false); }
  function toggleMuteChannel(id) { setMutedChannels((m) => ({ ...m, [id]: !m[id] })); }

  function joinVoice(chanId, chanName) {
    if (voiceState.connected && voiceState.channelId === chanId) return;
    setVoiceState({ connected: true, channelId: chanId, channelName: chanName, muted: false, deafened: false });
    socketRef.current?.emit("voice-join", { serverId: activeEra, channelId: chanId });
  }
  function leaveVoice() { const old = voiceState.channelId; if (old) socketRef.current?.emit("voice-leave", { channelId: old }); setVoiceState({ connected: false, channelId: null, channelName: "", muted: false, deafened: false }); }
  function toggleMic() { setVoiceState((v) => { const next={ ...v, muted: !v.muted, deafened: v.deafened && v.muted ? false : v.deafened }; if(v.channelId) socketRef.current?.emit("voice-state", {channelId:v.channelId,muted:next.muted,deafened:next.deafened}); return next; }); }
  function toggleDeafen() { setVoiceState((v) => { const next={ ...v, deafened: !v.deafened, muted: !v.deafened ? true : v.muted }; if(v.channelId) socketRef.current?.emit("voice-state", {channelId:v.channelId,muted:next.muted,deafened:next.deafened}); return next; }); }

  async function createChannel() {
    if (!newChanName.trim()) return;
    const era = eras.find((e) => e.id === activeEra);
    if (era?.real && authToken) {
      try {
        const res = await fetch(`${SERVER_URL}/api/servers/${activeEra}/channels`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ name: newChanName.trim(), type: newChanType, category: "Canais", restricted: newChanRestricted }) });
        const c = await res.json();
        if (!res.ok) throw new Error(c.error || "Não foi possível criar o canal.");
        setChannelsByEra((cs) => ({ ...cs, [activeEra]: [{ name: "Canais", channels: [...(cs[activeEra]?.[0]?.channels || []), { ...c, real: true }] }] }));
        setStore((s) => ({ ...s, [c.id]: [] }));
        if (newChanType !== "voice") setActiveChannel(c.id);
        setNewChanName(""); setNewChanRestricted(false); setCreateChannelOpen(false);
        return;
      } catch (e) { /* fallback local abaixo */ }
    }
    const id = `${activeEra}-${newChanName.trim().toLowerCase().replace(/\s+/g, "-")}-${nextId()}`;
    setChannelsByEra((cs) => {
      const cats = [...(cs[activeEra] || [])]; if (!cats.length) cats.push({ name: "Canais", channels: [] });
      const last = { ...cats[cats.length - 1] }; last.channels = [...last.channels, { id, name: newChanName.trim(), type: newChanType, restricted: newChanRestricted }]; cats[cats.length - 1] = last; return { ...cs, [activeEra]: cats };
    });
    setStore((s) => ({ ...s, [id]: [] })); if (newChanType !== "voice") setActiveChannel(id);
    setNewChanName(""); setNewChanRestricted(false); setCreateChannelOpen(false);
  }

  function simulateMemberLeft(memberName) {
    const leaveChan = (channelsByEra[activeEra] || []).flatMap((c) => c.channels).find((c) => c.type === "leave-log");
    if (!leaveChan) return;
    updateMessages(leaveChan.id, (m) => [...m, { id: nextId(), author: "ChronoCord", color: themeColor, time: timeNow(), text: `${memberName} saiu do servidor.`, reactions: {} }]);
  }

  function leaveEra(id) {
    setEras((es) => es.filter((e) => e.id !== id));
    if (activeEra === id) {
      const remaining = eras.filter((e) => e.id !== id && !e.isDM);
      if (remaining.length) { setActiveEra(remaining[0].id); }
      else { setView("dm"); }
    }
    setLeaveConfirmId(null);
    setEraContextMenu(null);
  }

  // ---- configurações do servidor: helpers ----
  const DEFAULT_ERA_SETTINGS = {
    description: "", characteristics: [], bannerColor: "#5B8CFF", bannerImg: null,
    tagText: "", tagIcon: null, verificationLevel: "nenhum", contentFilter: "todos",
    accessMode: "convite", rulesEnabled: false, rulesText: "",
    showMembersInChannelList: false, securityAlerts: true, securityChannelId: "",
  };
  function getEraSettings(id) { return { ...DEFAULT_ERA_SETTINGS, ...(eraSettingsMap[id] || {}) }; }
  function updateEraSettings(id, patch) {
    setEraSettingsMap((m) => ({ ...m, [id]: { ...getEraSettings(id), ...patch } }));
    const era = eras.find((e) => e.id === id);
    if (era?.real && authToken) {
      fetch(`${SERVER_URL}/api/servers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ settings: patch }) }).catch(() => {});
    }
  }

  function isOwnerOf(id) {
    const era = eras.find((e) => e.id === id);
    if (!era) return false;
    if (era.real) return era.ownerId === authUser?.id;
    return (membersByEra[id] || []).find((m) => m.name === myName)?.role === "Fundadora(o)";
  }

  function addAudit(id, action) {
    const entry = { id: nextId(), actor: myName, action, time: new Date().toLocaleString("pt-BR") };
    setAuditLogByEra((a) => ({ ...a, [id]: [entry, ...(a[id] || [])].slice(0, 100) }));
  }

  function addCharacteristic() {
    const text = newCharacteristic.trim().slice(0, 20);
    if (!text) return;
    const current = getEraSettings(activeEra).characteristics;
    if (current.length >= 15) return;
    updateEraSettings(activeEra, { characteristics: [...current, text] });
    setNewCharacteristic("");
  }
  function removeCharacteristic(i) {
    const current = getEraSettings(activeEra).characteristics;
    updateEraSettings(activeEra, { characteristics: current.filter((_, idx) => idx !== i) });
  }

  async function createRole() {
    if (!newRoleName.trim()) return;
    const role = { id: nextId(), name: newRoleName.trim(), color: themeColor, icon: newRoleIcon, count: 0 };
    const era = eras.find((e) => e.id === activeEra);
    if (era?.real && authToken) {
      try { const res = await fetch(`${SERVER_URL}/api/servers/${activeEra}/roles`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ name: role.name, color: role.color, icon: role.icon || "●" }) }); const r = await res.json(); if (res.ok) role.id = r.id; } catch {}
    }
    setRolesByEra((r) => ({ ...r, [activeEra]: [...(r[activeEra] || []), role] })); addAudit(activeEra, `criou o cargo "${role.name}"`); setNewRoleName(""); setNewRoleIcon(null);
  }
  function deleteRole(id) {
    setRolesByEra((r) => ({ ...r, [activeEra]: (r[activeEra] || []).filter((x) => x.id !== id) }));
  }

  async function createInvite() {
    let invite = { code: nanoidLike(), maxUses: newInviteMaxUses === "Sem limite" ? null : Number(newInviteMaxUses), uses: 0, createdAt: new Date().toLocaleDateString("pt-BR") };
    const era = eras.find((e) => e.id === activeEra);
    if (era?.real && authToken) { try { const res = await fetch(`${SERVER_URL}/api/servers/${activeEra}/invites`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ maxUses: invite.maxUses }) }); const r = await res.json(); if (res.ok) invite = r; } catch {} }
    setInvitesByEra((i) => ({ ...i, [activeEra]: [invite, ...(i[activeEra] || [])] })); addAudit(activeEra, "criou um novo convite");
  }
  function nanoidLike() { return Math.random().toString(36).slice(2, 9); }
  function deleteInvite(code) { setInvitesByEra((i) => ({ ...i, [activeEra]: (i[activeEra] || []).filter((x) => x.code !== code) })); }

  async function uploadEmoji(file) {
    if (!file || !newEmojiName.trim()) return;
    const reader = new FileReader(); reader.onload = async (e) => {
      const item = { id: nextId(), name: newEmojiName.trim(), imgSrc: e.target.result };
      const era = eras.find((x) => x.id === activeEra);
      if (era?.real && authToken) { try { const res = await fetch(`${SERVER_URL}/api/servers/${activeEra}/emojis`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ name: item.name, data: item.imgSrc, type: file.type }) }); const r = await res.json(); if (res.ok) item.id = r.id; } catch {} }
      setCustomEmojisByEra((em) => ({ ...em, [activeEra]: [...(em[activeEra] || []), item] })); setNewEmojiName("");
    }; reader.readAsDataURL(file);
  }
  function deleteEmoji(id) { setCustomEmojisByEra((em) => ({ ...em, [activeEra]: (em[activeEra] || []).filter((x) => x.id !== id) })); }

  async function uploadSticker(file) {
    setStickerError(""); if (!file || !newStickerName.trim()) return;
    if (!/^image\/(png|gif)$/.test(file.type)) { setStickerError("Use PNG ou GIF. Para vídeo, converta para GIF antes de importar nesta versão."); return; }
    const reader = new FileReader(); reader.onload = async (e) => {
      const item = { id: nextId(), name: newStickerName.trim(), imgSrc: e.target.result, animated: file.type === "image/gif" };
      const era = eras.find((x) => x.id === activeEra);
      if (era?.real && authToken) { try { const res = await fetch(`${SERVER_URL}/api/servers/${activeEra}/stickers`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ name: item.name, data: item.imgSrc, type: file.type }) }); const r = await res.json(); if (res.ok) item.id = r.id; } catch {} }
      setStickersByEra((s) => ({ ...s, [activeEra]: [...(s[activeEra] || []), item] })); setNewStickerName("");
    }; reader.readAsDataURL(file);
  }
  function deleteSticker(id) { setStickersByEra((s) => ({ ...s, [activeEra]: (s[activeEra] || []).filter((x) => x.id !== id) })); }

  async function uploadServerSound(file) {
    setSoundError(""); if (!file) return; const url = URL.createObjectURL(file); const probe = document.createElement("audio"); probe.preload = "metadata";
    probe.onloadedmetadata = async () => {
      if (probe.duration > 35.5) { setSoundError("O áudio precisa ter até 35 segundos."); URL.revokeObjectURL(url); return; }
      const reader = new FileReader(); reader.onload = async (e) => {
        const item = { id: nextId(), name: file.name.replace(/\.[^.]+$/, ""), data: e.target.result, duration: probe.duration }; const era = eras.find((x) => x.id === activeEra);
        if (era?.real && authToken) { try { const res = await fetch(`${SERVER_URL}/api/servers/${activeEra}/sounds`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ name: item.name, data: item.data, type: file.type, duration: item.duration }) }); const r = await res.json(); if (res.ok) item.id = r.id; } catch {} }
        setServerSoundsByEra((s) => ({ ...s, [activeEra]: [...(s[activeEra] || []), item] }));
      }; reader.readAsDataURL(file); URL.revokeObjectURL(url);
    };
    probe.src = url;
  }
  function deleteServerSound(id) { setServerSoundsByEra((s) => ({ ...s, [activeEra]: (s[activeEra] || []).filter((x) => x.id !== id) })); }

  function banMember(name) {
    setBansByEra((b) => ({ ...b, [activeEra]: [{ id: nextId(), username: name, reason: "Não especificado", bannedAt: new Date().toLocaleDateString("pt-BR") }, ...(b[activeEra] || [])] }));
    setMembersByEra((ms) => ({ ...ms, [activeEra]: (ms[activeEra] || []).filter((m) => m.name !== name) }));
    addAudit(activeEra, `baniu ${name}`);
  }
  function unbanMember(id) { setBansByEra((b) => ({ ...b, [activeEra]: (b[activeEra] || []).filter((x) => x.id !== id) })); }

  function deleteServer() {
    leaveEra(activeEra);
    setServerSettingsOpen(false);
    setDeleteServerConfirm(false);
  }

  async function updateEraLabel(id, name) {
    setEras((es) => es.map((e) => (e.id === id ? { ...e, label: name } : e)));
    eraNames[id] = name;
    const era = eras.find((e) => e.id === id);
    if (era?.real && authToken) {
      try { await fetch(`${SERVER_URL}/api/servers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ name }) }); } catch {}
    }
  }
  async function updateEraIcon(id, imgSrc) {
    setEras((es) => es.map((e) => (e.id === id ? { ...e, imgSrc } : e)));
    const era = eras.find((e) => e.id === id);
    if (era?.real && authToken) {
      try { await fetch(`${SERVER_URL}/api/servers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ icon: imgSrc }) }); } catch {}
    }
  }
  function getLeftMembers(id) {
    const leaveChan = (channelsByEra[id] || []).flatMap((c) => c.channels).find((c) => c.type === "leave-log");
    if (!leaveChan) return [];
    return (store[leaveChan.id] || []).filter((m) => m.text.endsWith("saiu do servidor.")).map((m) => ({ name: m.text.replace(" saiu do servidor.", ""), time: m.time }));
  }

  function addFriend() {
    if (!addFriendName.trim()) { setAddFriendMsg("Digite um nome de usuário."); return; }
    const exists = friends.find((f) => f.name.toLowerCase() === addFriendName.trim().toLowerCase());
    if (exists) { setAddFriendMsg("Vocês já são cronistas conectados."); return; }
    const id = `f${nextId()}`;
    const palette = ["#3FD9BE", "#B07DF0", "#E8A33D", "#E2574C"];
    const newFriend = { id, name: addFriendName.trim(), color: palette[Math.floor(Math.random() * palette.length)], status: "online", role: "Membro" };
    setFriends((f) => [...f, newFriend]);
    setStore((s) => ({ ...s, [`dm-${id}`]: [] }));
    setAddFriendMsg(`Pedido enviado para ${addFriendName.trim()} — aceito automaticamente ✅`);
    setAddFriendName("");
  }

  function copyInvite() {
    const link = `chronocord.gg/${activeEra}-${eraNames[activeEra]?.toLowerCase().replace(/\s+/g, "-")}`;
    try { navigator.clipboard && navigator.clipboard.writeText(link); } catch (e) {}
    setCopyState("Copiado!");
    setTimeout(() => setCopyState("Copiar"), 1500);
  }

  function applyHexDraft() {
    if (isValidHex(hexDraft)) {
      const normalized = hexDraft.length === 4
        ? "#" + hexDraft.slice(1).split("").map((c) => c + c).join("")
        : hexDraft;
      setThemeColor(normalized);
      setHexError(false);
    } else {
      setHexError(true);
    }
  }

  function handleImageUpload(file, onLoaded) {
    if (!file) return;
    if (!/^image\/(png|gif|jpeg|webp)$/.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = (e) => onLoaded(e.target.result);
    reader.readAsDataURL(file);
  }

  function handleBannerUpload(file) {
    if (!file) return;
    setBannerError("");
    if (file.type.startsWith("video/")) {
      if (!/^video\/(mp4|webm)$/.test(file.type)) { setBannerError("Use um vídeo em MP4 ou WebM."); return; }
      const url = URL.createObjectURL(file);
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.onloadedmetadata = () => {
        if (probe.duration > 5.1) {
          setBannerError("O vídeo do banner precisa ter até 5 segundos.");
          URL.revokeObjectURL(url);
        } else {
          setMyBanner({ type: "video", src: url });
        }
      };
      probe.src = url;
    } else if (/^image\/(png|jpe?g|gif)$/.test(file.type)) {
      const reader = new FileReader();
      reader.onload = (e) => setMyBanner({ type: "image", src: e.target.result });
      reader.readAsDataURL(file);
    } else {
      setBannerError("Formato não suportado. Use PNG, JPEG, GIF ou vídeo MP4/WebM.");
    }
  }

  function openProfile(person) {
    setProfileModal(person);
  }

  function openMyProfile() {
    setProfileModal({ isMe: true, name: myName, color: themeColor, status: myStatus, role: "Cronista fundador", imgSrc: myAvatarUrl });
  }

  async function createEra() {
    if (!newEraName.trim()) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/servers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ name: newEraName.trim() }),
      });
      const s = await res.json();
      if (!res.ok) throw new Error(s.error);
      const id = s.id;
      setEras((es) => [...es, { id, label: s.name, icon: newEraIcon ? null : s.name.slice(0, 2).toUpperCase(), color: "#5B8CFF", imgSrc: newEraIcon, real: true, inviteCode: s.inviteCode, ownerId: s.ownerId }]);
      eraNames[id] = s.name;
      setChannelsByEra((cs) => ({ ...cs, [id]: [{ name: "Canais", channels: s.channels.map((c) => ({ id: c.id, name: c.name, type: c.type, real: true })) }] }));
      setStore((st) => { const n = { ...st }; s.channels.forEach((c) => (n[c.id] = [])); return n; });
      setMembersByEra((ms) => ({ ...ms, [id]: [{ name: myName, status: myStatus, role: "Dono(a)", color: themeColor, imgSrc: myAvatarUrl }] }));
      setUnread((u) => ({ ...u, [id]: 0 }));
      setNewEraName(""); setNewEraIcon(null); setAddEraOpen(false);
      setActiveEra(id); setView("server"); setActiveChannel(s.channels[0].id);
    } catch (e) {
      setJoinError(""); // mantém a UI limpa; erro de criação aparece no console do app por ora
    }
  }

  async function joinEraByCode() {
    const code = joinCode.trim();
    if (!code) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/servers/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ code }),
      });
      const s = await res.json();
      if (res.ok) {
        const id = s.id;
        if (!eras.find((e) => e.id === id)) {
          setEras((es) => [...es, { id, label: s.name, icon: s.name.slice(0, 2).toUpperCase(), color: "#5B8CFF", real: true, inviteCode: s.inviteCode, ownerId: s.ownerId }]);
          eraNames[id] = s.name;
        }
        setChannelsByEra((cs) => ({ ...cs, [id]: [{ name: "Canais", channels: s.channels.map((c) => ({ id: c.id, name: c.name, type: c.type, real: true })) }] }));
        setStore((st) => { const n = { ...st }; s.channels.forEach((c) => { if (!n[c.id]) n[c.id] = []; }); return n; });
        setMembersByEra((ms) => ({ ...ms, [id]: ms[id] || [{ name: myName, status: myStatus, role: "Membro", color: themeColor, imgSrc: myAvatarUrl }] }));
        setUnread((u) => ({ ...u, [id]: 0 }));
        setJoinCode(""); setJoinError(""); setAddEraOpen(false);
        setActiveEra(id); setView("server"); setActiveChannel(s.channels[0].id);
        return;
      }
    } catch (e) { /* servidor real fora do ar — tenta as eras públicas de demonstração abaixo */ }

    // convite não bateu com um servidor real: tenta as eras públicas de demonstração
    const codeLower = code.toLowerCase();
    const found = PUBLIC_ERAS.find((p) => p.code === codeLower);
    if (!found) { setJoinError("Convite inválido ou expirado."); return; }
    if (joinedPublicCodes.includes(codeLower)) { setJoinError("Você já faz parte dessa era."); return; }
    const id = `pub-${found.code}`;
    setEras((es) => [...es, { id, label: found.name, icon: found.icon, color: found.color }]);
    eraNames[id] = found.name;
    setChannelsByEra((cs) => ({ ...cs, [id]: [{ name: "Canais", channels: [{ id: `${id}-geral`, name: "geral", type: "text" }] }] }));
    setStore((s) => ({ ...s, [`${id}-geral`]: [{ id: nextId(), author: found.name.split(" ")[0], color: found.color, time: timeNow(), text: `bem-vindo(a) à era ${found.name}! ${found.desc}.`, reactions: {} }] }));
    setMembersByEra((ms) => ({ ...ms, [id]: [{ name: myName, status: myStatus, role: "Membro", color: themeColor, imgSrc: myAvatarUrl }] }));
    setUnread((u) => ({ ...u, [id]: 0 }));
    setJoinedPublicCodes((c) => [...c, codeLower]);
    setJoinCode(""); setJoinError(""); setAddEraOpen(false);
    setActiveEra(id); setView("server"); setActiveChannel(`${id}-geral`);
  }

  function playSound(name) {
    setPlayingSound(name);
    setTimeout(() => setPlayingSound(null), 900);
  }

  // ---- AUTENTICAÇÃO ----
  useEffect(() => {
    const savedToken = localStorage.getItem("cc_token");
    if (!savedToken) { setAuthChecking(false); return; }
    fetch(`${SERVER_URL}/api/me`, { headers: { Authorization: `Bearer ${savedToken}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((user) => { setAuthUser(user); setAuthToken(savedToken); setMyName(user.username); })
      .catch(() => { localStorage.removeItem("cc_token"); })
      .finally(() => setAuthChecking(false));
  }, []);

  async function submitAuth() {
    setAuthError("");
    if (!formUsername.trim() || !formPassword) { setAuthError("Preencha usuário e senha."); return; }
    setAuthLoading(true);
    try {
      const base = SERVER_URL;
      const res = await fetch(`${base}/api/${authMode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formUsername.trim(), password: formPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || "Não deu pra entrar."); setAuthLoading(false); return; }
      localStorage.setItem("cc_token", data.token);
      setAuthToken(data.token);
      setAuthUser(data.user);
      setMyName(data.user.username);
    } catch (e) {
      setAuthError("Não consegui conectar nesse endereço de servidor. Confira se ele está rodando.");
    }
    setAuthLoading(false);
  }

  function logout() {
    localStorage.removeItem("cc_token");
    if (socketRef.current) socketRef.current.disconnect();
    setAuthUser(null); setAuthToken(null); setFormUsername(""); setFormPassword("");
  }

  // ---- CONEXÃO EM TEMPO REAL ----
  useEffect(() => {
    if (!authUser || !authToken) return;
    const socket = io(SERVER_URL, { auth: { token: authToken }, transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: Infinity });
    socketRef.current = socket;
    socket.on("connect", () => { if (activeEra && activeEra !== "dm") socket.emit("join-server", activeEra); });
    socket.on("channel-created", (c) => { if (!c?.serverId) return; setChannelsByEra((cs) => ({ ...cs, [c.serverId]: [{ name: "Canais", channels: [...(cs[c.serverId]?.[0]?.channels || []).filter(x => x.id !== c.id), { ...c, real: true }] }] })); });
    socket.on("channel-updated", (c) => setChannelsByEra((cs) => ({ ...cs, [c.serverId]: [{ name: "Canais", channels: (cs[c.serverId]?.[0]?.channels || []).map(x => x.id === c.id ? { ...x, ...c, real: true } : x) }] })));
    socket.on("channel-deleted", (id) => setChannelsByEra((cs) => Object.fromEntries(Object.entries(cs).map(([k,v]) => [k,[{...v[0],channels:(v[0]?.channels||[]).filter(c=>c.id!==id)}]]))));
    socket.on("sync-state", ({ kind, data }) => {
      if (kind === "jukebox" && data) { setNowPlaying(data.nowPlaying || null); setQueue(data.queue || []); setIsPlaying(!!data.isPlaying); setElapsed(Number(data.elapsed || 0)); }
      if (kind === "watch2" && data) { setWatch2Current(data.current || null); setWatch2Queue(data.queue || []); setWatch2Playing(data.playing !== false); setWatch2Elapsed(Number(data.elapsed || 0)); }
    });
    socket.on("jukebox-sync", (data) => { if (data) { setNowPlaying(data.nowPlaying || null); setQueue(data.queue || []); setIsPlaying(!!data.isPlaying); setElapsed(Number(data.elapsed || 0)); } });
    socket.on("watch2-sync", (data) => { if (data) { setWatch2Current(data.current || null); setWatch2Queue(data.queue || []); setWatch2Playing(data.playing !== false); setWatch2Elapsed(Number(data.elapsed || 0)); } });
    socket.on("new-message", (msg) => {
      updateMessages(msg.channelId, (m) => [...m, {
        id: msg.id, author: msg.authorName, color: themeColor,
        time: new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        text: msg.text, reactions: {},
      }]);
    });
    fetchMyServers();
    return () => socket.disconnect();
  }, [authUser, authToken]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected || !activeEra || activeEra === "dm") return;
    socket.emit("join-server", activeEra);
  }, [activeEra]);

  async function fetchMyServers() {
    try {
      const res = await fetch(`${SERVER_URL}/api/servers`, { headers: { Authorization: `Bearer ${authToken}` } });
      const list = await res.json();
      if (!Array.isArray(list)) return;
      setEras((prev) => {
        const existing = new Set(prev.map((e) => e.id));
        const fresh = list.filter((s) => !existing.has(s.id)).map((s) => ({ id: s.id, label: s.name, icon: s.name.slice(0, 2).toUpperCase(), color: "#5B8CFF", real: true, inviteCode: s.inviteCode, ownerId: s.ownerId }));
        return [...prev, ...fresh];
      });
      setChannelsByEra((prev) => {
        const next = { ...prev };
        list.forEach((s) => { next[s.id] = [{ name: "Canais", channels: s.channels.map((c) => ({ id: c.id, name: c.name, type: c.type, real: true })) }]; });
        return next;
      });
      setMembersByEra((prev) => {
        const next = { ...prev };
        list.forEach((s) => { next[s.id] = [{ name: myName, status: myStatus, role: s.ownerId === authUser.id ? "Dono(a)" : "Membro", color: themeColor, imgSrc: myAvatarUrl }]; });
        return next;
      });
      setStore((prev) => {
        const next = { ...prev };
        list.forEach((s) => s.channels.forEach((c) => { if (!next[c.id]) next[c.id] = []; }));
        return next;
      });
    } catch (e) { /* servidor offline — segue só com o conteúdo local */ }
  }

  function findChannelObj(eraId, channelId) {
    for (const cat of channelsByEra[eraId] || []) {
      const found = cat.channels.find((c) => c.id === channelId);
      if (found) return found;
    }
    return null;
  }

  // ao trocar de canal: se for um canal real, entra na sala e busca o histórico
  useEffect(() => {
    if (view !== "server" || !socketRef.current) return;
    const chan = findChannelObj(activeEra, activeChannel);
    if (chan?.real) {
      socketRef.current.emit("join-channel", activeChannel);
      fetch(`${SERVER_URL}/api/channels/${activeChannel}/messages`, { headers: { Authorization: `Bearer ${authToken}` } })
        .then((r) => r.json())
        .then((history) => {
          if (Array.isArray(history)) {
            setStore((s) => ({ ...s, [activeChannel]: history.map((m) => ({ id: m.id, author: m.authorName, color: themeColor, time: new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), text: m.text, reactions: {} })) }));
          }
        }).catch(() => {});
    }
  }, [activeChannel, activeEra, view]);

  return (
    <div style={{ height: "100vh", width: "100%", padding: isElectron && !isMaximized ? 10 : 0, boxSizing: "border-box", background: "transparent" }}>
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", background: T.bg0, fontFamily: FONT_BODY, color: TEXT.main, position: "relative", transition: "background 200ms ease", borderRadius: isElectron && !isMaximized ? 14 : 0, overflow: "hidden", boxShadow: isElectron && !isMaximized ? "0 24px 70px rgba(0,0,0,0.55)" : "none", border: isElectron && !isMaximized ? `1px solid ${T.border}` : "none" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        .msg-row:hover .msg-toolbar { opacity: 1; }
        .hoverable:hover { background: ${T.bg4}; }
        .chan-row:hover .chan-bell { opacity: 1; }
        .titlebar-btn:hover { background: ${T.bg4}; }
        input[type=range] { accent-color: ${themeColor}; }
        @keyframes introRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes introPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes messageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>

      {isElectron && (
        <div onDoubleClick={() => window.electronAPI.maximize()} style={{ WebkitAppRegion: "drag", height: 34, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 4px 0 12px", background: T.bg1, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: themeColor, marginRight: 8 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: TEXT.dim, fontFamily: FONT_DISPLAY }}>ChronoCord</span>
          <div style={{ flex: 1 }} />
          <div style={{ WebkitAppRegion: "no-drag", display: "flex", height: "100%" }}>
            <div className="titlebar-btn" onClick={() => window.electronAPI.minimize()} style={{ width: 42, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TEXT.dim }}><Icon name="minimize" size={13} /></div>
            <div className="titlebar-btn" onClick={() => window.electronAPI.maximize()} style={{ width: 42, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TEXT.dim }}><Icon name={isMaximized ? "restore" : "maximize"} size={11} /></div>
            <div className="titlebar-btn" onClick={() => window.electronAPI.close()} style={{ width: 42, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TEXT.dim }}><Icon name="x" size={13} /></div>
          </div>
        </div>
      )}

      {showIntro && (
        <div style={{ position: "absolute", inset: 0, zIndex: 100, background: T.bg0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, opacity: introFading ? 0 : 1, transition: "opacity 500ms ease", pointerEvents: introFading ? "none" : "auto" }}>
          <div style={{ position: "relative", width: 72, height: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="72" height="72" style={{ position: "absolute", animation: "introRing 3s linear infinite" }}>
              <circle cx="36" cy="36" r="32" fill="none" stroke={themeColor} strokeWidth="1.6" strokeDasharray="10 8" opacity="0.7" />
            </svg>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: themeColor, display: "flex", alignItems: "center", justifyContent: "center", color: T.text, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18 }}>⏳</div>
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 20, letterSpacing: 1 }}>CHRONOCORD</div>
          <div style={{ fontSize: 10.5, color: T.textFaint, fontFamily: FONT_MONO, marginTop: -12 }}>v{APP_VERSION}</div>
          <div style={{ fontSize: 12, color: TEXT.faint, fontFamily: FONT_MONO, animation: "introPulse 1.6s ease-in-out infinite" }}>sincronizando sua timeline…</div>
        </div>
      )}

      {!showIntro && !authChecking && !authUser && (
        <div style={{ position: "absolute", inset: 0, zIndex: 90, background: T.bg0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 340, padding: 28, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{authMode === "login" ? "Entrar" : "Criar conta"}</div>
            <div style={{ fontSize: 12.5, color: T.textDim, marginBottom: 18 }}>{authMode === "login" ? "Entre com sua conta do ChronoCord." : "Leva menos de um minuto."}</div>

            <label style={{ fontSize: 12, color: T.textFaint }}>Usuário</label>
            <input value={formUsername} onChange={(e) => setFormUsername(e.target.value)} style={{ width: "100%", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", color: T.textMain, fontSize: 13.5, outline: "none", margin: "6px 0 12px" }} />

            <label style={{ fontSize: 12, color: T.textFaint }}>Senha</label>
            <input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAuth()} style={{ width: "100%", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", color: T.textMain, fontSize: 13.5, outline: "none", margin: "6px 0 12px" }} />

            {authError && <div style={{ fontSize: 12, color: DANGER, marginBottom: 12 }}>{authError}</div>}

            <div onClick={submitAuth} style={{ textAlign: "center", background: themeColor, color: T.text, fontWeight: 600, fontSize: 13.5, padding: "10px 0", borderRadius: 8, cursor: "pointer", opacity: authLoading ? 0.6 : 1 }}>{authLoading ? "Entrando…" : authMode === "login" ? "Entrar" : "Criar conta"}</div>

            <div onClick={() => { setAuthMode((m) => (m === "login" ? "register" : "login")); setAuthError(""); }} style={{ textAlign: "center", fontSize: 12.5, color: themeColor, cursor: "pointer", marginTop: 14 }}>{authMode === "login" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}</div>
          </div>
        </div>
      )}

      {authUser && (
      <div style={{ flex: 1, display: "flex", minHeight: 0, position: "relative" }}>
      {/* SERVER RAIL */}
      <div style={{ width: 72, background: T.bg1, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, paddingLeft: 16, flexShrink: 0, transition: "background 200ms ease" }}>
        {eras.map((e) => {
          const active = e.isDM ? view === "dm" : view === "server" && activeEra === e.id;
          const iconText = e.isDM ? themeColor : contrastText(e.color);
          return (
            <div key={e.id} onClick={() => (e.isDM ? setView("dm") : selectEra(e.id))}
              onContextMenu={(ev) => { if (e.isDM) return; ev.preventDefault(); setEraContextMenu({ id: e.id, x: ev.clientX, y: ev.clientY }); }}
              style={{ position: "relative", width: 48, height: 48, marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} title={e.label}>
              <div style={{ position: "absolute", left: -16, width: 4, borderRadius: 4, background: TEXT.main, height: active ? 24 : 0, transition: "height 150ms ease" }} />
              <div style={{ width: 48, height: 48, borderRadius: active ? "16px" : "50%", background: e.isDM ? T.bg3 : e.color, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: e.isDM ? 18 : 15, color: iconText, transition: "border-radius 150ms ease", overflow: "hidden" }}>
                {e.imgSrc ? <img src={e.imgSrc} alt={e.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : e.icon}
              </div>
              {!!unread[e.id] && !mutedEras[e.id] && <div style={{ position: "absolute", top: -2, right: 4, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 9, background: DANGER, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO }}>{unread[e.id]}</div>}
            </div>
          );
        })}
        <div style={{ width: 32, height: 2, background: T.border, margin: "6px 0" }} />
        <div onClick={() => { setAddEraOpen(true); setAddEraTab("create"); setJoinError(""); }} style={{ width: 48, height: 48, borderRadius: "50%", border: `1px dashed ${TEXT.faint}`, display: "flex", alignItems: "center", justifyContent: "center", color: TEXT.faint, marginBottom: 16, cursor: "pointer" }} title="Criar ou entrar em uma era"><Icon name="plus" size={20} /></div>
      </div>

      {/* SIDEBAR */}
      <div style={{ width: 240, background: T.bg2, display: "flex", flexDirection: "column", flexShrink: 0, transition: "background 200ms ease" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div onClick={() => view === "server" && setServerMenuOpen((v) => !v)} className="hoverable"
            style={{ height: 52, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: `1px solid ${T.border}`, fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, justifyContent: "space-between", cursor: view === "server" ? "pointer" : "default" }}>
            {view === "dm" ? (
              <>Mensagens diretas <span onClick={(e) => { e.stopPropagation(); setAddFriendMsg(""); setAddFriendOpen(true); }} style={{ color: themeColor, fontSize: 18, cursor: "pointer" }} title="Adicionar amigo">+</span></>
            ) : (
              <>{eraNames[activeEra]} <span style={{ color: TEXT.faint, display: "flex", transform: serverMenuOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}><Icon name="chevronDown" size={14} /></span></>
            )}
          </div>
          {serverMenuOpen && view === "server" && (
            <div style={{ position: "absolute", top: "100%", left: 8, right: 8, marginTop: 4, background: T.bg5, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", zIndex: 20, boxShadow: "0 10px 24px rgba(0,0,0,0.4)" }}>
              {[
                ["Convidar pessoas", () => { setServerMenuOpen(false); setInviteOpen(true); }],
                ["Criar canal", () => { setServerMenuOpen(false); setCreateChannelOpen(true); }],
                [mutedEras[activeEra] ? "Reativar notificações" : "Silenciar era", () => { setMutedEras((m) => ({ ...m, [activeEra]: !m[activeEra] })); setServerMenuOpen(false); }],
                ["Configurações da era", () => { setServerMenuOpen(false); setServerSettingsOpen(true); setServerSettingsTab("perfil"); }],
              ].map(([label, fn]) => <div key={label} onClick={fn} className="hoverable" style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>{label}</div>)}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
          {view === "dm"
            ? friends.map((f) => {
                const isActive = f.id === activeFriend;
                return (
                  <div key={f.id} onClick={() => setActiveFriend(f.id)} className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 8, cursor: "pointer", background: isActive ? T.bg4 : "transparent", marginBottom: 2 }}>
                    <Avatar initials={f.name.slice(0, 2).toUpperCase()} color={f.color} size={32} status={f.status} ringColor={T.bg2} imgSrc={f.imgSrc} onClick={(e) => { e.stopPropagation(); openProfile({ isMe: false, name: f.name, color: f.color, status: f.status, role: f.role, imgSrc: f.imgSrc }); }} />
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 500 }}>{f.name}</div><div style={{ fontSize: 11, color: TEXT.faint }}>{f.role}</div></div>
                  </div>
                );
              })
            : eraChannels.map((cat) => (
                <div key={cat.name} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, color: TEXT.faint, textTransform: "uppercase", padding: "0 8px 6px" }}>{cat.name}</div>
                  {cat.channels.map((c) => {
                    const isActive = c.id === activeChannel && c.type !== "voice";
                    const inThisVoice = voiceState.connected && voiceState.channelId === c.id;
                    return (
                      <div key={c.id}>
                        <div onClick={() => (c.type === "voice" ? joinVoice(c.id, c.name) : setActiveChannel(c.id))} className="hoverable chan-row"
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: isActive || inThisVoice ? T.bg4 : "transparent", color: isActive ? TEXT.main : TEXT.dim, fontSize: 14, fontWeight: isActive ? 500 : 400, marginBottom: 2 }}>
                          <ChannelIcon type={c.type} />
                          <span style={{ flex: 1, opacity: mutedChannels[c.id] ? 0.5 : 1 }}>{c.name}</span>
                          {c.type !== "voice" && <span className="chan-bell" onClick={(e) => { e.stopPropagation(); toggleMuteChannel(c.id); }} style={{ opacity: mutedChannels[c.id] ? 1 : 0, color: TEXT.faint, display: "flex" }} title="Silenciar canal"><Icon name={mutedChannels[c.id] ? "bellOff" : "bell"} size={13} /></span>}
                        </div>
                        {inThisVoice && (
                          <div style={{ paddingLeft: 24, marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: TEXT.dim, padding: "3px 0" }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS.online }} /> {myName} {voiceState.muted && "🔇"}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
        </div>

        {voiceState.connected && (
          <div style={{ background: T.bg5, padding: "8px 10px", borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: STATUS.online, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><Icon name="speaker" size={13} /> {voiceState.channelName}</div>
              <span onClick={leaveVoice} style={{ cursor: "pointer", color: TEXT.faint, display: "flex" }} title="Desconectar"><Icon name="x" size={13} /></span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span onClick={toggleMic} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "5px 0", borderRadius: 6, background: voiceState.muted ? DANGER : T.bg2, fontSize: 12, cursor: "pointer" }}><Icon name={voiceState.muted ? "micOff" : "mic"} size={14} /> {voiceState.muted ? "mudo" : "mic"}</span>
              <span onClick={toggleDeafen} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "5px 0", borderRadius: 6, background: voiceState.deafened ? DANGER : T.bg2, fontSize: 12, cursor: "pointer" }}><Icon name="headphones" size={14} /> {voiceState.deafened ? "surdo" : "áudio"}</span>
              <span onClick={() => setJukeboxOpen(true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "5px 0", borderRadius: 6, background: nowPlaying ? `${themeColor}33` : T.bg2, color: nowPlaying ? themeColor : "inherit", fontSize: 12, cursor: "pointer" }} title="Jukebox"><Icon name="music" size={14} /></span>
            </div>
            {nowPlaying && (
              <div onClick={() => setJukeboxOpen(true)} style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.textDim, cursor: "pointer" }}>
                <Icon name={isPlaying ? "pause" : "play"} size={11} color={themeColor} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nowPlaying.title}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ position: "relative", flexShrink: 0 }}>
          {statusMenuOpen && (
            <div style={{ position: "absolute", bottom: "100%", left: 8, marginBottom: 6, background: T.bg5, border: `1px solid ${T.border}`, borderRadius: 8, overflow: "hidden", width: 180, boxShadow: "0 10px 24px rgba(0,0,0,0.4)", zIndex: 10 }}>
              {[["online", "Online"], ["idle", "Ausente"], ["dnd", "Não perturbe"], ["invisible", "Invisível"]].map(([key, label]) => (
                <div key={key} onClick={() => { setMyStatus(key); setStatusMenuOpen(false); }} className="hoverable" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: STATUS[key] }} /> {label}
                </div>
              ))}
            </div>
          )}
          <div style={{ height: 56, background: "#12102190", display: "flex", alignItems: "center", padding: "0 8px", gap: 8 }}>
            <div onClick={() => setStatusMenuOpen((v) => !v)} style={{ cursor: "pointer" }}><Avatar initials="VC" color={themeColor} size={32} status={myStatus} ringColor="#121021" imgSrc={myAvatarUrl} /></div>
            <div style={{ flex: 1, minWidth: 0 }} onClick={openMyProfile}><div style={{ fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{myName}</div><div style={{ fontSize: 11, color: TEXT.faint, fontFamily: FONT_MONO }}>ciclo local {timeNow()}</div></div>
            <span onClick={() => { setSettingsOpen(true); setSettingsTab("conta"); }} style={{ cursor: "pointer", color: TEXT.faint, padding: 4, display: "flex" }} title="Configurações"><Icon name="settings" size={17} /></span>
          </div>
        </div>
      </div>

      {/* CHAT PRINCIPAL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg3, minWidth: 0, transition: "background 200ms ease" }}>
        <div style={{ height: 52, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: `1px solid ${T.border}`, flexShrink: 0, gap: 8 }}>
          {view === "dm" ? (<><Avatar initials={currentFriend.name.slice(0, 2).toUpperCase()} color={currentFriend.color} size={24} imgSrc={currentFriend.imgSrc} onClick={() => openProfile({ isMe: false, name: currentFriend.name, color: currentFriend.color, status: currentFriend.status, role: currentFriend.role, imgSrc: currentFriend.imgSrc })} /><span style={{ fontWeight: 600, fontFamily: FONT_DISPLAY }}>{currentFriend.name}</span></>) : (<><ChannelIcon type="text" /><span style={{ fontWeight: 600, fontFamily: FONT_DISPLAY }}>{activeChannel}</span></>)}
          <div style={{ width: 1, height: 20, background: T.border, margin: "0 8px" }} />
          <span style={{ fontSize: 13, color: TEXT.dim, flexShrink: 0 }}>registro cronal desta timeline</span>
          <div style={{ flex: 1 }} />
          {view === "server" && <span onClick={() => setShowPinnedPanel((v) => !v)} style={{ cursor: "pointer", fontSize: 13, color: pinnedList.length ? themeColor : TEXT.faint, marginRight: 12, display: "flex", alignItems: "center", gap: 4 }}><Icon name="pin" size={15} /> {pinnedList.length || ""}</span>}
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 12.5, color: TEXT.main, outline: "none", width: 140 }} />
        </div>

        {showPinnedPanel && (
          <div style={{ borderBottom: `1px solid ${T.border}`, padding: "10px 16px", background: T.bg2, maxHeight: 140, overflowY: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT.faint, textTransform: "uppercase", marginBottom: 6 }}>Fixadas</div>
            {pinnedList.length === 0 && <div style={{ fontSize: 12.5, color: TEXT.faint }}>Nenhuma mensagem fixada ainda.</div>}
            {pinnedList.map((p) => <div key={p.id} style={{ fontSize: 12.5, color: TEXT.dim, marginBottom: 4 }}><strong style={{ color: TEXT.main }}>{p.author}:</strong> {p.text}</div>)}
          </div>
        )}

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {filteredMessages.map((m) => {
            const replySource = m.replyTo ? messages.find((x) => x.id === m.replyTo) : null;
            return (
              <div key={m.id} className="msg-row" onMouseEnter={() => setHoveredMsg(m.id)} onMouseLeave={() => setHoveredMsg(null)}
                style={{ display: "flex", gap: 12, marginBottom: 16, position: "relative", padding: "2px 8px", marginLeft: -8, marginRight: -8, borderRadius: 8, background: hoveredMsg === m.id ? "#00000022" : "transparent", animation: "messageIn 260ms ease" }}>
                <Avatar initials={m.author.slice(0, 2).toUpperCase()} color={m.color} size={38} imgSrc={m.author === myName ? myAvatarUrl : null} onClick={() => openProfile(m.author === myName ? { isMe: true, name: myName, color: themeColor, status: myStatus, role: "Cronista fundador", imgSrc: myAvatarUrl } : { isMe: false, name: m.author, color: m.color, status: "online", role: view === "dm" ? "Cronista" : "Membro" })} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  {replySource && <div style={{ fontSize: 12, color: TEXT.faint, marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}><Icon name="reply" size={12} /> respondendo a <strong style={{ color: TEXT.dim }}>{replySource.author}</strong>: {replySource.text.slice(0, 40)}{replySource.text.length > 40 ? "…" : ""}</div>}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 4 }}>{m.author} <RoleBadge role={members.find((mm) => mm.name === m.author)?.role} /></span>
                    <span style={{ fontSize: 11, color: TEXT.faint, fontFamily: FONT_MONO, border: `1px solid ${T.border}`, borderRadius: 20, padding: "1px 8px" }}>◷ {m.time}</span>
                    {m.edited && <span style={{ fontSize: 10.5, color: TEXT.faint }}>(editado)</span>}
                  </div>
                  {editingId === m.id ? (
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <input value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEdit(m.id)} style={{ flex: 1, background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "6px 10px", color: TEXT.main, fontSize: 13.5, outline: "none" }} autoFocus />
                      <span onClick={() => saveEdit(m.id)} style={{ fontSize: 12, color: STATUS.online, cursor: "pointer", alignSelf: "center" }}>salvar</span>
                      <span onClick={() => setEditingId(null)} style={{ fontSize: 12, color: TEXT.faint, cursor: "pointer", alignSelf: "center" }}>cancelar</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 14.5, color: TEXT.main, lineHeight: 1.5, marginTop: 2 }}>
                      {renderRich(m.text, themeColor)}
                      {m.attachment && <div style={{ marginTop: 6, width: 160, height: 100, background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: TEXT.faint, fontSize: 12 }}><Icon name="image" size={22} />{m.attachment}</div>}
                    </div>
                  )}
                  {Object.keys(m.reactions || {}).length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {Object.entries(m.reactions).map(([emoji, users]) => (
                        <div key={emoji} onClick={() => toggleReaction(m.id, emoji)} style={{ display: "flex", alignItems: "center", gap: 4, background: users.includes(myName) ? `${themeColor}33` : T.bg2, border: `1px solid ${users.includes(myName) ? themeColor : T.border}`, borderRadius: 12, padding: "1px 8px", fontSize: 12, cursor: "pointer" }}>{emoji} <span style={{ color: TEXT.dim }}>{users.length}</span></div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="msg-toolbar" style={{ opacity: hoveredMsg === m.id ? 1 : 0, transition: "opacity 100ms", position: "absolute", top: -14, right: 8, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, display: "flex", padding: 2, gap: 1 }}>
                  <span onClick={() => setReactMenuFor(reactMenuFor === m.id ? null : m.id)} title="Reagir" style={{ padding: 6, cursor: "pointer", display: "flex" }}><Icon name="smile" size={15} /></span>
                  <span onClick={() => setReplyingTo(m.id)} title="Responder" style={{ padding: 6, cursor: "pointer", display: "flex" }}><Icon name="reply" size={15} /></span>
                  {view === "server" && <span onClick={() => togglePin(m)} title="Fixar" style={{ padding: 6, cursor: "pointer", display: "flex", color: pinnedList.find((p) => p.id === m.id) ? themeColor : TEXT.main }}><Icon name="pin" size={15} /></span>}
                  {m.author === myName && <span onClick={() => { setEditingId(m.id); setEditText(m.text); }} title="Editar" style={{ padding: 6, cursor: "pointer", display: "flex" }}><Icon name="edit" size={15} /></span>}
                  {m.author === myName && <span onClick={() => deleteMessage(m.id)} title="Excluir" style={{ padding: 6, cursor: "pointer", display: "flex", color: DANGER }}><Icon name="trash" size={15} /></span>}
                </div>
                {reactMenuFor === m.id && (
                  <div style={{ position: "absolute", top: -50, right: 8, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, padding: 6, display: "flex", gap: 4, zIndex: 5, boxShadow: "0 10px 24px rgba(0,0,0,0.4)" }}>
                    {["👍", "🎉", "😂", "❤️", "😮", "👀"].map((e) => <span key={e} onClick={() => toggleReaction(m.id, e)} style={{ cursor: "pointer", fontSize: 16 }}>{e}</span>)}
                  </div>
                )}
              </div>
            );
          })}
          {typingOf && <div style={{ fontSize: 12, color: TEXT.faint, fontStyle: "italic", padding: "2px 8px" }}>{typingOf} está digitando…</div>}
        </div>

        <div style={{ padding: "0 16px 16px", flexShrink: 0 }}>
          {replyingTo && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: TEXT.dim, background: T.bg2, borderRadius: "8px 8px 0 0", padding: "6px 12px" }}><span style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon name="reply" size={12} /> respondendo a {messages.find((m) => m.id === replyingTo)?.author}</span><span onClick={() => setReplyingTo(null)} style={{ cursor: "pointer", display: "flex" }}><Icon name="x" size={13} /></span></div>}
          {attachment && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: TEXT.dim, background: T.bg2, padding: "6px 12px" }}><span style={{ display: "flex", alignItems: "center", gap: 5 }}><Icon name="paperclip" size={13} /> {attachment}</span><span onClick={() => setAttachment(null)} style={{ cursor: "pointer", display: "flex" }}><Icon name="x" size={13} /></span></div>}
          {emojiPickerOpen && (
            <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 8, padding: 8, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, marginBottom: 6 }}>
              {EMOJI.map((e) => <span key={e} onClick={() => { setDraft((d) => d + e); setEmojiPickerOpen(false); }} style={{ cursor: "pointer", fontSize: 17, textAlign: "center", padding: 4 }}>{e}</span>)}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", background: T.bg4, borderRadius: replyingTo || attachment ? "0 0 10px 10px" : 10, padding: "10px 14px", gap: 12 }}>
            <span onClick={() => setAttachment("imagem.png")} style={{ color: TEXT.faint, cursor: "pointer", display: "flex" }} title="Anexar arquivo"><Icon name="paperclip" size={17} /></span>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder={view === "dm" ? `Enviar mensagem para ${currentFriend.name}` : `Registrar mensagem em #${activeChannel}`} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: TEXT.main, fontSize: 14, fontFamily: FONT_BODY }} />
            <span onClick={() => setEmojiPickerOpen((v) => !v)} style={{ cursor: "pointer", display: "flex", color: TEXT.faint }} title="Emoji"><Icon name="smile" size={17} /></span>
            <span onClick={sendMessage} style={{ color: themeColor, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>enviar <Icon name="send" size={14} /></span>
          </div>
        </div>
      </div>

      {/* MEMBROS */}
      {view === "server" && (
        <div style={{ width: 220, background: T.bg2, padding: "16px 12px", overflowY: "auto", flexShrink: 0, transition: "background 200ms ease" }}>
          {["online", "idle", "dnd", "offline"].map((group) => {
            const groupMembers = members.filter((m) => m.status === group);
            if (!groupMembers.length) return null;
            const groupLabel = { online: "presentes", idle: "ausentes", dnd: "ocupados", offline: "fora do ciclo" }[group];
            return (
              <div key={group} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: TEXT.faint, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>{groupLabel} — {groupMembers.length}</div>
                {groupMembers.map((m) => (
                  <div key={m.name} className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 4px", borderRadius: 6, opacity: group === "offline" ? 0.5 : 1, cursor: "pointer" }} onClick={() => openProfile(m.name === myName ? { isMe: true, name: myName, color: themeColor, status: myStatus, role: "Cronista fundador", imgSrc: myAvatarUrl } : { isMe: false, name: m.name, color: m.color, status: m.status, role: m.role, imgSrc: m.imgSrc })}>
                    <Avatar initials={m.name.slice(0, 2).toUpperCase()} color={m.name === myName ? themeColor : m.color} size={30} status={m.status} ringColor={T.bg2} imgSrc={m.name === myName ? myAvatarUrl : m.imgSrc} />
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap" }}>{m.name}</div><div style={{ fontSize: 11, color: TEXT.faint }}>{m.role}</div></div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      </div>
      )}

      {/* MODAL: CONFIGURAÇÕES DO SERVIDOR */}
      {serverSettingsOpen && (() => {
        const era = eras.find((e) => e.id === activeEra);
        const cfg = getEraSettings(activeEra);
        const owner = isOwnerOf(activeEra);
        const membersNow = membersByEra[activeEra] || [];
        const rolesNow = rolesByEra[activeEra] || [];
        const invitesNow = invitesByEra[activeEra] || [];
        const bansNow = bansByEra[activeEra] || [];
        const emojisNow = customEmojisByEra[activeEra] || [];
        const stickersNow = stickersByEra[activeEra] || [];
        const soundsNow = serverSoundsByEra[activeEra] || [];
        const auditNow = auditLogByEra[activeEra] || [];
        const tabs = [
          ["perfil", "Perfil do servidor", "user"], ["tag", "Tag do servidor", "hash"],
          ["emojis", "Emojis", "smile"], ["stickers", "Figurinhas", "image"],
          ["sons", "Painel de efeitos sonoros", "volume"], ["membros", "Membros", "users"],
          ["cargos", "Cargos", "shield"], ["convites", "Convites", "link"],
          ["acesso", "Acesso", "lock"], ["integracoes", "Integrações", "puzzle"],
          ["seguranca", "Configurações de segurança", "shield"], ["auditoria", "Registro da auditoria", "scroll"],
          ["banimentos", "Banimentos", "ban"], ["automod", "AutoMod", "shield"],
          ...(owner ? [["avancado", "Desenvolvedor", "code"]] : []),
        ];
        const sectionTitle = (title, sub) => <div style={{ marginBottom: 16 }}><div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18 }}>{title}</div>{sub && <div style={{ fontSize: 12, color: T.textFaint, marginTop: 4 }}>{sub}</div>}</div>;
        const field = (label, child) => <div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 11.5, color: T.textFaint, marginBottom: 6 }}>{label}</label>{child}</div>;
        const inputStyle = { width: "100%", boxSizing: "border-box", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 7, padding: "9px 10px", color: T.textMain, fontSize: 13, outline: "none" };
        const buttonStyle = { background: themeColor, color: T.text, border: "none", borderRadius: 7, padding: "8px 12px", fontWeight: 650, fontSize: 12, cursor: "pointer" };
        return (
          <Modal onClose={() => setServerSettingsOpen(false)} width={820} bg={T.bg2} border={T.border}>
            <div style={{ display: "flex", height: 570, minWidth: 0 }}>
              <div style={{ width: 210, flexShrink: 0, paddingRight: 14, borderRight: `1px solid ${T.border}`, overflowY: "auto" }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16, padding: "4px 8px 12px" }}>Configurações do servidor</div>
                <div style={{ fontSize: 10.5, color: T.textFaint, padding: "0 8px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{era?.label || "Servidor"}</div>
                {tabs.map(([key, label, icon]) => <div key={key} onClick={() => setServerSettingsTab(key)} className="hoverable" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 9px", borderRadius: 7, marginBottom: 2, cursor: "pointer", background: serverSettingsTab === key ? T.bg4 : "transparent", color: serverSettingsTab === key ? T.textMain : T.textDim, fontSize: 12.2, fontWeight: serverSettingsTab === key ? 650 : 400 }}><Icon name={icon} size={14} />{label}</div>)}
                <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 12, paddingTop: 12 }}>
                  <div onClick={() => setDeleteServerConfirm(true)} style={{ color: DANGER, fontSize: 12.2, padding: "8px 9px", cursor: "pointer", borderRadius: 7 }} className="hoverable">Excluir servidor</div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, overflowY: "auto", paddingLeft: 22, paddingRight: 6 }}>
                {serverSettingsTab === "perfil" && <>
                  {sectionTitle("Perfil do servidor", "Nome, descrição e identidade visual.")}
                  {field("Nome do servidor", <input value={era?.label || ""} onChange={(e) => updateEraLabel(activeEra, e.target.value)} style={inputStyle} />)}
                  {field("Descrição", <textarea value={cfg.description} onChange={(e) => updateEraSettings(activeEra, { description: e.target.value.slice(0, 300) })} rows={4} style={{ ...inputStyle, resize: "vertical", fontFamily: FONT_BODY }} placeholder="Descreva este servidor..." />)}
                  {field("Cor do banner", <input type="color" value={cfg.bannerColor} onChange={(e) => updateEraSettings(activeEra, { bannerColor: e.target.value })} style={{ width: 54, height: 34, border: 0, background: "transparent", cursor: "pointer" }} />)}
                  {field("Ícone", <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Avatar initials={(era?.label || "CC").slice(0,2).toUpperCase()} color={themeColor} size={58} imgSrc={era?.imgSrc} /><label style={{ ...buttonStyle, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}><Icon name="camera" size={14} /> Alterar<input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f=e.target.files?.[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>updateEraIcon(activeEra,ev.target.result); r.readAsDataURL(f); }} /></label></div>)}
                  {field("Características (até 15)", <><div style={{ display: "flex", gap: 6 }}><input value={newCharacteristic} onChange={(e)=>setNewCharacteristic(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&addCharacteristic()} placeholder="Ex.: comunidade" style={{ ...inputStyle, flex: 1 }} /><button onClick={addCharacteristic} style={buttonStyle}>Adicionar</button></div><div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>{cfg.characteristics.map((x,i)=><span key={i} style={{ background:T.bg4, borderRadius:14, padding:"4px 8px", fontSize:11.5 }}>{x}<span onClick={()=>removeCharacteristic(i)} style={{ marginLeft:6, cursor:"pointer", color:T.textFaint }}>×</span></span>)}</div></>)}
                </>}
                {serverSettingsTab === "tag" && <>
                  {sectionTitle("Tag do servidor", "Uma identificação curta para compartilhar a identidade do servidor.")}
                  {field("Texto da tag", <input maxLength={4} value={cfg.tagText} onChange={(e)=>updateEraSettings(activeEra,{tagText:e.target.value.slice(0,8)})} style={inputStyle} placeholder="CHRN" />)}
                  <div style={{ background:T.bg1, border:`1px solid ${T.border}`, borderRadius:9, padding:16, display:"flex", alignItems:"center", gap:12 }}><span style={{ background:cfg.bannerColor, color:T.text, borderRadius:6, padding:"5px 8px", fontWeight:700, fontSize:12 }}>{cfg.tagText || "TAG"}</span><span style={{ fontSize:12, color:T.textFaint }}>Pré-visualização da tag</span></div>
                </>}
                {serverSettingsTab === "emojis" && <>
                  {sectionTitle("Emojis", "Adicione emojis personalizados ao servidor.")}
                  <div style={{ display:"flex", gap:6, marginBottom:14 }}><input value={newEmojiName} onChange={(e)=>setNewEmojiName(e.target.value)} placeholder="Nome do emoji" style={{ ...inputStyle, flex:1 }} /><label style={{ ...buttonStyle, display:"flex", alignItems:"center", cursor:"pointer" }}>Enviar<input type="file" accept="image/png,image/gif,image/jpeg,image/webp" style={{display:"none"}} onChange={(e)=>uploadEmoji(e.target.files?.[0])}/></label></div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>{emojisNow.map(e=><div key={e.id} style={{background:T.bg1,border:`1px solid ${T.border}`,borderRadius:8,padding:8,textAlign:"center"}}><img src={e.imgSrc} alt={e.name} style={{width:42,height:42,objectFit:"contain"}}/><div style={{fontSize:10.5,marginTop:4,overflow:"hidden",textOverflow:"ellipsis"}}>{e.name}</div><span onClick={()=>deleteEmoji(e.id)} style={{fontSize:10,color:DANGER,cursor:"pointer"}}>remover</span></div>)}</div>
                </>}
                {serverSettingsTab === "stickers" && <>
                  {sectionTitle("Figurinhas", "PNG e GIF são aceitos neste protótipo.")}
                  <div style={{display:"flex",gap:6,marginBottom:8}}><input value={newStickerName} onChange={(e)=>setNewStickerName(e.target.value)} placeholder="Nome da figurinha" style={{...inputStyle,flex:1}}/><label style={{...buttonStyle,cursor:"pointer"}}>Enviar<input type="file" accept="image/png,image/gif" style={{display:"none"}} onChange={(e)=>uploadSticker(e.target.files?.[0])}/></label></div>
                  {stickerError&&<div style={{fontSize:11,color:DANGER,marginBottom:10}}>{stickerError}</div>}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{stickersNow.map(st=><div key={st.id} style={{background:T.bg1,border:`1px solid ${T.border}`,borderRadius:8,padding:8,textAlign:"center"}}><img src={st.imgSrc} alt={st.name} style={{width:54,height:54,objectFit:"contain"}}/><div style={{fontSize:10.5,marginTop:4}}>{st.name}</div><span onClick={()=>deleteSticker(st.id)} style={{fontSize:10,color:DANGER,cursor:"pointer"}}>remover</span></div>)}</div>
                </>}
                {serverSettingsTab === "sons" && <>
                  {sectionTitle("Painel de efeitos sonoros", "Cada efeito pode ter no máximo 35 segundos.")}
                  <label style={{...buttonStyle,display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer",marginBottom:8}}><Icon name="paperclip" size={14}/> Adicionar áudio<input type="file" accept="audio/*" style={{display:"none"}} onChange={(e)=>uploadServerSound(e.target.files?.[0])}/></label>
                  {soundError&&<div style={{fontSize:11,color:DANGER,marginBottom:8}}>{soundError}</div>}
                  {soundsNow.map(snd=><div key={snd.id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 0",borderBottom:`1px solid ${T.border}`}}><Icon name="volume" size={14}/><span style={{flex:1,fontSize:12}}>{snd.name}</span><span style={{fontSize:10,color:T.textFaint}}>{Math.round(snd.duration)}s</span><audio controls src={snd.src} style={{width:150,height:28}}/><span onClick={()=>deleteServerSound(snd.id)} style={{color:DANGER,cursor:"pointer",fontSize:11}}>remover</span></div>)}
                </>}
                {serverSettingsTab === "membros" && <>
                  {sectionTitle("Membros", `${membersNow.length} membros neste servidor.`)}
                  <div style={{display:"flex",gap:5,marginBottom:12}}>{[["ativos","Ativos"],["recentes","Recentes"],["sairam","Saíram"]].map(([k,l])=><button key={k} onClick={()=>setMembersTab(k)} style={{...buttonStyle,background:membersTab===k?themeColor:T.bg1,color:membersTab===k?T.text:T.textDim,border:`1px solid ${membersTab===k?themeColor:T.border}`}}>{l}</button>)}</div>
                  {(membersTab==="ativos"?membersNow:membersTab==="sairam"?getLeftMembers(activeEra):membersNow.slice(0,10)).map((m,i)=><div key={m.id||m.name||i} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 0",borderBottom:`1px solid ${T.border}`}}><Avatar initials={(m.name||"??").slice(0,2).toUpperCase()} color={m.color||themeColor} size={32} imgSrc={m.imgSrc}/><div style={{flex:1}}><div style={{fontSize:12.5,display:"flex",alignItems:"center",gap:4}}>{m.name}<RoleBadge role={m.role}/></div><div style={{fontSize:10.5,color:T.textFaint}}>{m.role||"Membro"}</div></div>{owner&&m.name!==myName&&membersTab==="ativos"&&<button onClick={()=>banMember(m.name)} style={{background:"transparent",border:`1px solid ${T.border}`,color:DANGER,borderRadius:6,padding:"5px 8px",cursor:"pointer",fontSize:10.5}}>Banir</button>}</div>)}
                </>}
                {serverSettingsTab === "cargos" && <>
                  {sectionTitle("Cargos", "Crie e organize cargos com ícones personalizados.")}
                  <div style={{display:"flex",gap:6,marginBottom:10}}><input value={newRoleName} onChange={(e)=>setNewRoleName(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&createRole()} placeholder="Nome do cargo" style={{...inputStyle,flex:1}}/><button onClick={createRole} style={buttonStyle}>Criar cargo</button></div>
                  <input value={roleSearch} onChange={(e)=>setRoleSearch(e.target.value)} placeholder="Pesquisar cargos..." style={{...inputStyle,marginBottom:8}}/>
                  {rolesNow.filter(r=>r.name.toLowerCase().includes(roleSearch.toLowerCase())).map(r=><div key={r.id} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>{r.icon?<img src={r.icon} style={{width:24,height:24,borderRadius:5,objectFit:"cover"}}/>:<span style={{width:24,height:24,borderRadius:5,background:r.color}}/>}<span style={{flex:1,fontSize:12.5}}>{r.name}</span><span style={{fontSize:10,color:T.textFaint}}>{r.count} membros</span><span onClick={()=>deleteRole(r.id)} style={{fontSize:10,color:DANGER,cursor:"pointer"}}>excluir</span></div>)}
                </>}
                {serverSettingsTab === "convites" && <>
                  {sectionTitle("Convites", "Crie convites e limite o número de utilizações.")}
                  <div style={{display:"flex",gap:6,marginBottom:12}}><select value={newInviteMaxUses} onChange={(e)=>setNewInviteMaxUses(e.target.value)} style={{...inputStyle,flex:1}}><option>Sem limite</option><option>1</option><option>5</option><option>10</option><option>25</option><option>50</option></select><button onClick={createInvite} style={buttonStyle}>Criar convite</button></div>
                  {invitesNow.map(inv=><div key={inv.code} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${T.border}`}}><Icon name="link" size={14}/><code style={{flex:1,fontSize:12}}>{inv.code}</code><span style={{fontSize:10,color:T.textFaint}}>{inv.uses}/{inv.maxUses||"∞"}</span><span onClick={()=>deleteInvite(inv.code)} style={{color:DANGER,fontSize:10,cursor:"pointer"}}>revogar</span></div>)}
                </>}
                {serverSettingsTab === "acesso" && <>
                  {sectionTitle("Acesso", "Controle como novos membros entram no servidor.")}
                  {field("Modo de entrada", <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>{[["convite","Somente convite"],["solicitacao","Solicitação"],["aberto","Aberto"]].map(([k,l])=><div key={k} onClick={()=>updateEraSettings(activeEra,{accessMode:k})} style={{padding:10,borderRadius:8,border:`1px solid ${cfg.accessMode===k?themeColor:T.border}`,background:cfg.accessMode===k?T.bg4:T.bg1,cursor:"pointer",fontSize:11.5}}>{l}</div>)}</div>)}
                  {field("Regras de entrada", <><label style={{display:"flex",alignItems:"center",gap:7,fontSize:12,cursor:"pointer"}}><input type="checkbox" checked={cfg.rulesEnabled} onChange={(e)=>updateEraSettings(activeEra,{rulesEnabled:e.target.checked})}/> Exigir aceitação das regras</label>{cfg.rulesEnabled&&<textarea value={cfg.rulesText} onChange={(e)=>updateEraSettings(activeEra,{rulesText:e.target.value})} rows={5} style={{...inputStyle,marginTop:8,resize:"vertical"}} placeholder="Regras do servidor..."/>}</>)}
                </>}
                {serverSettingsTab === "integracoes" && <>
                  {sectionTitle("Integrações", "Conexões externas do servidor.")}
                  <div style={{background:T.bg1,border:`1px solid ${T.border}`,borderRadius:9,padding:16,marginBottom:10}}><div style={{fontWeight:600,fontSize:13}}>Webhooks e aplicativos</div><div style={{fontSize:11.5,color:T.textFaint,marginTop:5}}>A interface está preparada para integrações. A conexão real depende do backend.</div></div>
                  <div style={{background:T.bg1,border:`1px solid ${T.border}`,borderRadius:9,padding:16}}><div style={{fontWeight:600,fontSize:13}}>Bots</div><div style={{fontSize:11.5,color:T.textFaint,marginTop:5}}>Gerenciamento de bots ficará disponível quando a API de aplicações estiver conectada.</div></div>
                </>}
                {serverSettingsTab === "seguranca" && <>
                  {sectionTitle("Configurações de segurança", "Proteja o servidor contra abuso e entradas suspeitas.")}
                  {field("Nível de verificação", <select value={cfg.verificationLevel} onChange={(e)=>updateEraSettings(activeEra,{verificationLevel:e.target.value})} style={inputStyle}><option value="nenhum">Nenhum</option><option value="baixo">Baixo</option><option value="medio">Médio</option><option value="alto">Alto</option></select>)}
                  {field("Filtro de conteúdo", <select value={cfg.contentFilter} onChange={(e)=>updateEraSettings(activeEra,{contentFilter:e.target.value})} style={inputStyle}><option value="todos">Todos os membros</option><option value="novos">Somente membros novos</option><option value="alto">Filtro reforçado</option></select>)}
                  <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer",marginBottom:12}}><input type="checkbox" checked={cfg.securityAlerts} onChange={(e)=>updateEraSettings(activeEra,{securityAlerts:e.target.checked})}/> Alertas de atividade e segurança</label>
                  <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer"}}><input type="checkbox" checked={cfg.showMembersInChannelList} onChange={(e)=>updateEraSettings(activeEra,{showMembersInChannelList:e.target.checked})}/> Mostrar membros na lista de canais</label>
                </>}
                {serverSettingsTab === "auditoria" && <>
                  {sectionTitle("Registro da auditoria", "As últimas ações administrativas ficam registradas localmente no protótipo.")}
                  {auditNow.length===0?<div style={{color:T.textFaint,fontSize:12}}>Nenhuma ação registrada ainda.</div>:auditNow.map(a=><div key={a.id} style={{padding:"9px 0",borderBottom:`1px solid ${T.border}`}}><div style={{fontSize:12.2}}><strong>{a.actor}</strong> {a.action}</div><div style={{fontSize:10.5,color:T.textFaint,marginTop:3}}>{a.time}</div></div>)}
                </>}
                {serverSettingsTab === "banimentos" && <>
                  {sectionTitle("Banimentos", "Membros removidos permanentemente do servidor.")}
                  <input value={banSearch} onChange={(e)=>setBanSearch(e.target.value)} placeholder="Pesquisar banimentos..." style={{...inputStyle,marginBottom:10}}/>
                  {bansNow.filter(b=>b.username.toLowerCase().includes(banSearch.toLowerCase())).map(b=><div key={b.id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 0",borderBottom:`1px solid ${T.border}`}}><Icon name="ban" size={15} color={DANGER}/><div style={{flex:1}}><div style={{fontSize:12.5}}>{b.username}</div><div style={{fontSize:10.5,color:T.textFaint}}>{b.reason} · {b.bannedAt}</div></div><button onClick={()=>unbanMember(b.id)} style={{background:T.bg1,border:`1px solid ${T.border}`,color:T.textMain,borderRadius:6,padding:"5px 8px",fontSize:10.5,cursor:"pointer"}}>Desbanir</button></div>)}
                </>}
                {serverSettingsTab === "automod" && <>
                  {sectionTitle("AutoMod", "Regras automáticas de moderação.")}
                  {[["spam","Bloquear spam e mensagens repetidas"],["links","Filtrar links suspeitos"],["mentions","Limitar menções em massa"],["words","Filtrar palavras bloqueadas"]].map(([k,l])=><label key={k} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 0",borderBottom:`1px solid ${T.border}`,fontSize:12,cursor:"pointer"}}><input type="checkbox" defaultChecked/>{l}</label>)}
                  <div style={{fontSize:10.5,color:T.textFaint,marginTop:10}}>As regras de AutoMod são simuladas nesta versão.</div>
                </>}
                {serverSettingsTab === "avancado" && owner && <>
                  {sectionTitle("Ferramentas do desenvolvedor", "Opções avançadas para manutenção do protótipo.")}
                  <div style={{background:T.bg1,border:`1px solid ${T.border}`,borderRadius:9,padding:14,marginBottom:10}}><div style={{fontWeight:650,fontSize:12.5}}>ChronoCord {APP_VERSION}</div><div style={{fontSize:11,color:T.textFaint,marginTop:4}}>Estado local: dados de configuração permanecem enquanto esta sessão estiver aberta.</div></div>
                  <button onClick={()=>{ addAudit(activeEra,"abriu as ferramentas do desenvolvedor"); }} style={buttonStyle}>Registrar teste no log</button>
                  <button onClick={()=>{ updateEraSettings(activeEra,{description:"" ,characteristics:[],tagText:"",rulesText:""}); addAudit(activeEra,"restaurou campos básicos do servidor"); }} style={{...buttonStyle,background:T.bg1,color:T.textMain,border:`1px solid ${T.border}`,marginLeft:7}}>Restaurar campos</button>
                </>}
              </div>
            </div>
            {deleteServerConfirm && <div style={{position:"absolute",inset:0,background:"#0009",display:"flex",alignItems:"center",justifyContent:"center",zIndex:20}}><div style={{width:360,background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:20,boxShadow:"0 20px 60px #0008"}}><div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Excluir servidor?</div><div style={{fontSize:12,color:T.textFaint,lineHeight:1.5,marginBottom:16}}>Esta ação remove o servidor desta sessão local. Ela não pode ser desfeita.</div><div style={{display:"flex",justifyContent:"flex-end",gap:7}}><button onClick={()=>setDeleteServerConfirm(false)} style={{...buttonStyle,background:T.bg1,color:T.textMain,border:`1px solid ${T.border}`}}>Cancelar</button><button onClick={deleteServer} style={{...buttonStyle,background:DANGER}}>Excluir</button></div></div></div>}
          </Modal>
        );
      })()}

      {/* MODAL: CONFIGURAÇÕES */}
      {settingsOpen && (
        <Modal onClose={() => setSettingsOpen(false)} width={640} bg={T.bg2} border={T.border}>
          <div style={{ display: "flex", gap: 20, minHeight: 340 }}>
            <div style={{ width: 168, flexShrink: 0, display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", maxHeight: 400 }}>
              {[
                ["conta", "Minha conta"], ["perfil", "Perfil"], ["privacidade", "Dados e privacidade"], ["permissoes", "Permissões de mensagens"],
                ["notificacoes", "Notificações"], ["voz", "Voz e vídeo"], ["camera", "Câmera"], ["transmissao", "Transmissão"],
                ["sons", "Sons"], ["soundboard", "Painel de efeitos sonoros"], ["avancado", "Avançado"], ["acessibilidade", "Acessibilidade"],
                ["sistema", "Sistema"], ["idioma", "Idioma e horário"], ["aparencia", "Aparência"],
              ].map(([key, label]) => (
                <div key={key} onClick={() => setSettingsTab(key)} className="hoverable" style={{ padding: "7px 10px", borderRadius: 6, fontSize: 12.5, cursor: "pointer", background: settingsTab === key ? T.bg4 : "transparent", color: settingsTab === key ? TEXT.main : TEXT.dim, fontWeight: settingsTab === key ? 600 : 400 }}>{label}</div>
              ))}
            </div>
            <div style={{ flex: 1, borderLeft: `1px solid ${T.border}`, paddingLeft: 20 }}>
              {settingsTab === "conta" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Minha conta</div>
                  <label style={{ fontSize: 12, color: TEXT.faint }}>Nome de exibição</label>
                  <input value={myName} onChange={(e) => setMyName(e.target.value || "Você")} onBlur={() => { if (authToken) fetch(`${SERVER_URL}/api/me`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ username: myName, nameStyle, status: customStatus }) }).catch(() => {}); }} style={{ width: "100%", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: TEXT.main, fontSize: 13.5, outline: "none", margin: "6px 0 16px" }} />
                  <label style={{ fontSize: 12, color: TEXT.faint }}>Status</label>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    {[["online", "Online"], ["idle", "Ausente"], ["dnd", "Não perturbe"], ["invisible", "Invisível"]].map(([key, label]) => (
                      <div key={key} onClick={() => setMyStatus(key)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: `1px solid ${myStatus === key ? themeColor : T.border}`, cursor: "pointer", fontSize: 12.5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS[key] }} /> {label}
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 20, paddingTop: 16 }}>
                    <div style={{ fontSize: 11.5, color: T.textFaint, marginBottom: 8 }}>Conectado como <strong style={{ color: T.textMain }}>{authUser?.username}</strong> em servidor oficial ChronoCord</div>
                    <div style={{ fontSize: 10.5, color: T.textFaint, fontFamily: FONT_MONO, marginBottom: 10 }}>ChronoCord v{APP_VERSION}</div>
                    <div onClick={() => { setSettingsOpen(false); logout(); }} style={{ display: "inline-block", color: DANGER, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Sair da conta</div>
                  </div>
                </>
              )}
              {settingsTab === "perfil" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Perfil</div>

                  <label style={{ fontSize: 12, color: TEXT.faint }}>Banner (imagem ou GIF)</label>
                  <div style={{ marginTop: 6, marginBottom: 14, height: 84, borderRadius: 10, background: myBannerUrl ? `url(${myBannerUrl}) center/cover` : `linear-gradient(135deg, ${themeColor}, ${T.bg5})`, position: "relative", overflow: "hidden" }}>
                    <label style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#00000055", opacity: 0, transition: "opacity 150ms", cursor: "pointer", color: "#fff", fontSize: 12 }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)} onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}>
                      <Icon name="camera" size={16} /> Trocar banner
                      <input type="file" accept="image/png,image/gif,image/jpeg,image/webp,video/mp4,video/webm" style={{ display: "none" }} onChange={(e) => { const f=e.target.files?.[0]; if (f?.type.startsWith("video/")) handleBannerUpload(f); else handleImageUpload(f,setMyBannerUrl); }} />
                    </label>
                    <div style={{ position: "absolute", left: 14, bottom: -22 }}>
                      <Avatar initials={myName.slice(0, 2).toUpperCase()} color={themeColor} size={56} status={myStatus} ringColor={T.bg2} imgSrc={myAvatarUrl} />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: themeColor, cursor: "pointer" }}>
                      <Icon name="camera" size={14} /> Trocar avatar (PNG ou GIF)
                      <input type="file" accept="image/png,image/gif,image/jpeg,image/webp" style={{ display: "none" }} onChange={(e) => handleImageUpload(e.target.files[0], setMyAvatarUrl)} />
                    </label>
                  </div>
                  {(myAvatarUrl || myBannerUrl) && (
                    <div onClick={() => { setMyAvatarUrl(null); setMyBannerUrl(null); }} style={{ fontSize: 11.5, color: TEXT.faint, cursor: "pointer", marginBottom: 10 }}>Remover imagens e voltar ao padrão</div>
                  )}

                  <label style={{ fontSize: 12, color: TEXT.faint }}>Sobre mim</label>
                  <textarea value={aboutMe} onChange={(e) => setAboutMe(e.target.value)} onBlur={() => { if (authToken) fetch(`${SERVER_URL}/api/me`, { method:"PATCH", headers:{"Content-Type":"application/json",Authorization:`Bearer ${authToken}`}, body:JSON.stringify({aboutMe}) }).catch(()=>{}); }} placeholder="conte algo sobre você..." rows={3} style={{ width: "100%", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: TEXT.main, fontSize: 13, outline: "none", marginTop: 6, resize: "none", fontFamily: FONT_BODY }} />
                  <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 16, paddingTop: 15 }}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Estilo do nome exibido</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 9 }}>
                      {["solid","gradient","neon","desenho","pop","gummy","prism","aurora","holographic","glitch","pixel","chrome","velvet","fire","ice","cosmic"].map(effect => <div key={effect} onClick={() => setNameStyle(n => ({ ...n, effect }))} style={{ padding: "7px 5px", borderRadius: 7, border: `1px solid ${nameStyle.effect===effect?themeColor:T.border}`, background: nameStyle.effect===effect?`${themeColor}22`:T.bg1, fontSize: 10.5, textAlign: "center", cursor: "pointer", textTransform: "capitalize" }}>{effect}</div>)}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <input type="color" value={nameStyle.color} onChange={e=>setNameStyle(n=>({...n,color:e.target.value}))} style={{width:42,height:32,border:0,background:"transparent"}}/>
                      <div style={{flex:1,fontFamily:FONT_DISPLAY,fontWeight:700,fontSize:17,color:nameStyle.color,textShadow:nameStyle.effect==="neon"?`0 0 12px ${nameStyle.color}`:"none"}}>{myName || "Seu nome"} ✨</div>
                      <button onClick={()=>setNameStyle(n=>({...n,effect:["solid","gradient","neon","pop","gummy","prism","aurora","holographic"][Math.floor(Math.random()*8)]}))} style={{background:T.bg1,color:T.textMain,border:`1px solid ${T.border}`,borderRadius:7,padding:"8px 12px",fontWeight:650,fontSize:12,cursor:"pointer"}}>Surpreenda-me</button>
                    </div>
                  </div>
                  <label style={{display:"block",fontSize:12,color:TEXT.faint,marginTop:14}}>Status personalizado</label>
                  <input value={customStatus} onChange={e=>setCustomStatus(e.target.value.slice(0,128))} placeholder="Qual emoji descreve seu dia? 🌙" style={{width:"100%",background:T.bg1,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 10px",color:TEXT.main,fontSize:13,outline:"none",marginTop:6}}/>
                  <div style={{fontSize:10.5,color:TEXT.faint,marginTop:5}}>Você pode usar Unicode, símbolos e emojis diretamente no nome e no status.</div>
                </>
              )}
              {settingsTab === "voz" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Voz e vídeo</div>
                  <label style={{ fontSize: 12, color: TEXT.faint }}>Dispositivo de entrada</label>
                  <select value={voiceIn} onChange={(e) => setVoiceIn(e.target.value)} style={{ width: "100%", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: TEXT.main, fontSize: 13, outline: "none", margin: "6px 0 14px" }}>
                    <option>Microfone padrão</option><option>Headset USB</option><option>Microfone da webcam</option>
                  </select>
                  <label style={{ fontSize: 12, color: TEXT.faint }}>Volume de entrada: {inputVol}%</label>
                  <input type="range" min={0} max={100} value={inputVol} onChange={(e) => setInputVol(+e.target.value)} style={{ width: "100%", margin: "6px 0 14px" }} />
                  <label style={{ fontSize: 12, color: TEXT.faint }}>Dispositivo de saída</label>
                  <select value={voiceOut} onChange={(e) => setVoiceOut(e.target.value)} style={{ width: "100%", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: TEXT.main, fontSize: 13, outline: "none", margin: "6px 0 14px" }}>
                    <option>Alto-falantes padrão</option><option>Fones de ouvido</option>
                  </select>
                  <label style={{ fontSize: 12, color: TEXT.faint }}>Volume de saída: {outputVol}%</label>
                  <input type="range" min={0} max={100} value={outputVol} onChange={(e) => setOutputVol(+e.target.value)} style={{ width: "100%", margin: "6px 0" }} />
                </>
              )}
              {settingsTab === "privacidade" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Dados e privacidade</div>
                  {[
                    ["analytics", "Compartilhar dados de uso para melhorar o ChronoCord"],
                    ["readReceipts", "Confirmação de leitura em mensagens diretas"],
                    ["dmFromServerMembers", "Usar dados de eras em comum para sugerir amigos"],
                  ].map(([key, label]) => (
                    <div key={key} onClick={() => setPrivacy((p) => ({ ...p, [key]: !p[key] }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
                      <span style={{ fontSize: 13, paddingRight: 12 }}>{label}</span>
                      <span style={{ width: 38, height: 20, borderRadius: 12, background: privacy[key] ? themeColor : T.bg1, position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: privacy[key] ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 150ms" }} /></span>
                    </div>
                  ))}
                  <div style={{ fontSize: 11.5, color: TEXT.faint, marginTop: 12 }}>Solicitar todos os meus dados fica disponível assim que o ChronoCord tiver um backend real.</div>
                </>
              )}

              {settingsTab === "permissoes" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Permissões de mensagens</div>
                  {[
                    ["dmFromMembers", "Permitir mensagens diretas de membros das eras que participo"],
                    ["friendRequests", "Permitir pedidos de amizade de qualquer pessoa"],
                    ["filterExplicitImages", "Filtrar imagens explícitas em mensagens diretas"],
                  ].map(([key, label]) => (
                    <div key={key} onClick={() => setPermissions((p) => ({ ...p, [key]: !p[key] }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
                      <span style={{ fontSize: 13, paddingRight: 12 }}>{label}</span>
                      <span style={{ width: 38, height: 20, borderRadius: 12, background: permissions[key] ? themeColor : T.bg1, position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: permissions[key] ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 150ms" }} /></span>
                    </div>
                  ))}
                </>
              )}

              {settingsTab === "notificacoes" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Notificações</div>
                  {[["sons", "Sons de notificação"], ["desktop", "Notificações do sistema"], ["mencoes", "Sempre notificar em menções"]].map(([key, label]) => (
                    <div key={key} onClick={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
                      <span style={{ fontSize: 13.5 }}>{label}</span>
                      <span style={{ width: 38, height: 20, borderRadius: 12, background: notifPrefs[key] ? themeColor : T.bg1, position: "relative", transition: "background 150ms" }}>
                        <span style={{ position: "absolute", top: 2, left: notifPrefs[key] ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 150ms" }} />
                      </span>
                    </div>
                  ))}
                </>
              )}
              {settingsTab === "camera" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Câmera</div>
                  <div style={{ height: 130, borderRadius: 8, background: T.bg1, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: TEXT.faint, marginBottom: 16 }}>
                    <Icon name="camera" size={26} /><span style={{ fontSize: 12 }}>pré-visualização indisponível no protótipo</span>
                  </div>
                  <label style={{ fontSize: 12, color: TEXT.faint }}>Dispositivo de vídeo</label>
                  <select value={cameraDevice} onChange={(e) => setCameraDevice(e.target.value)} style={{ width: "100%", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: TEXT.main, fontSize: 13, outline: "none", margin: "6px 0 14px" }}>
                    <option>Webcam padrão</option><option>Câmera USB externa</option><option>Câmera virtual</option>
                  </select>
                  <label style={{ fontSize: 12, color: TEXT.faint }}>Plano de fundo</label>
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    {["Nenhum", "Desfoque leve", "Desfoque forte"].map((opt) => (
                      <div key={opt} onClick={() => setCameraBg(opt)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${cameraBg === opt ? themeColor : T.border}`, fontSize: 12.5, cursor: "pointer" }}>{opt}</div>
                    ))}
                  </div>
                </>
              )}

              {settingsTab === "transmissao" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Transmissão</div>
                  <label style={{ fontSize: 12, color: TEXT.faint }}>Qualidade da transmissão de tela</label>
                  <select value={streamQuality} onChange={(e) => setStreamQuality(e.target.value)} style={{ width: "100%", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: TEXT.main, fontSize: 13, outline: "none", margin: "6px 0 14px" }}>
                    <option>720p 30fps</option><option>1080p 60fps</option><option>Fonte 4K 60fps</option>
                  </select>
                  <div onClick={() => setStreamAudio((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", cursor: "pointer" }}>
                    <span style={{ fontSize: 13.5 }}>Transmitir áudio do computador</span>
                    <span style={{ width: 38, height: 20, borderRadius: 12, background: streamAudio ? themeColor : T.bg1, position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: streamAudio ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 150ms" }} /></span>
                  </div>
                  <div style={{ fontSize: 11.5, color: TEXT.faint, marginTop: 10 }}>Compartilhar tela real depende de acesso ao sistema operacional, fora do alcance deste protótipo.</div>
                </>
              )}

              {settingsTab === "sons" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Sons</div>
                  <label style={{ fontSize: 12, color: TEXT.faint }}>Volume mestre: {sounds.masterVolume}%</label>
                  <input type="range" min={0} max={100} value={sounds.masterVolume} onChange={(e) => setSounds((s) => ({ ...s, masterVolume: +e.target.value }))} style={{ width: "100%", margin: "6px 0 14px" }} />
                  {[["messageSound", "Som ao receber mensagem"], ["callJoinSound", "Som ao entrar/sair de canal de voz"]].map(([key, label]) => (
                    <div key={key} onClick={() => setSounds((s) => ({ ...s, [key]: !s[key] }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
                      <span style={{ fontSize: 13.5 }}>{label}</span>
                      <span style={{ width: 38, height: 20, borderRadius: 12, background: sounds[key] ? themeColor : T.bg1, position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: sounds[key] ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 150ms" }} /></span>
                    </div>
                  ))}
                </>
              )}

              {settingsTab === "soundboard" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Painel de efeitos sonoros</div>
                  <label style={{ fontSize: 12, color: TEXT.faint }}>Volume do painel: {soundboardVolume}%</label>
                  <input type="range" min={0} max={100} value={soundboardVolume} onChange={(e) => setSoundboardVolume(+e.target.value)} style={{ width: "100%", margin: "6px 0 14px" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {["Aplausos", "Risada", "Tambores", "Alarme cronal", "Vitória", "Erro"].map((s) => (
                      <div key={s} onClick={() => playSound(s)} style={{ padding: "12px 8px", borderRadius: 8, border: `1px solid ${playingSound === s ? themeColor : T.border}`, background: playingSound === s ? `${themeColor}22` : T.bg1, fontSize: 12, textAlign: "center", cursor: "pointer" }}>
                        {playingSound === s ? "▶ tocando…" : s}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {settingsTab === "avancado" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Avançado</div>
                  {[["devMode", "Modo desenvolvedor"], ["hardwareAccel", "Aceleração de hardware"], ["linkPreviews", "Mostrar prévia de links automaticamente"]].map(([key, label]) => (
                    <div key={key} onClick={() => setAdvanced((a) => ({ ...a, [key]: !a[key] }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
                      <span style={{ fontSize: 13.5 }}>{label}</span>
                      <span style={{ width: 38, height: 20, borderRadius: 12, background: advanced[key] ? themeColor : T.bg1, position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: advanced[key] ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 150ms" }} /></span>
                    </div>
                  ))}
                </>
              )}

              {settingsTab === "acessibilidade" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Acessibilidade</div>
                  {[["reduceMotion", "Reduzir movimento e animações"], ["autoplayGifs", "Reproduzir GIFs automaticamente"], ["highContrast", "Alto contraste"]].map(([key, label]) => (
                    <div key={key} onClick={() => setAccessibility((a) => ({ ...a, [key]: !a[key] }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
                      <span style={{ fontSize: 13.5 }}>{label}</span>
                      <span style={{ width: 38, height: 20, borderRadius: 12, background: accessibility[key] ? themeColor : T.bg1, position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: accessibility[key] ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 150ms" }} /></span>
                    </div>
                  ))}
                  <label style={{ fontSize: 12, color: TEXT.faint, marginTop: 12, display: "block" }}>Tamanho da fonte do chat: {accessibility.chatFontSize}px</label>
                  <input type="range" min={12} max={20} value={accessibility.chatFontSize} onChange={(e) => setAccessibility((a) => ({ ...a, chatFontSize: +e.target.value }))} style={{ width: "100%", margin: "6px 0" }} />
                </>
              )}

              {settingsTab === "sistema" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Sistema</div>
                  {[["openOnStartup", "Abrir o ChronoCord ao iniciar o computador"], ["minimizeToTray", "Minimizar para a bandeja do sistema"], ["startMinimized", "Iniciar minimizado"]].map(([key, label]) => (
                    <div key={key} onClick={() => setSystemPrefs((s) => ({ ...s, [key]: !s[key] }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
                      <span style={{ fontSize: 13.5 }}>{label}</span>
                      <span style={{ width: 38, height: 20, borderRadius: 12, background: systemPrefs[key] ? themeColor : T.bg1, position: "relative", flexShrink: 0 }}><span style={{ position: "absolute", top: 2, left: systemPrefs[key] ? 20 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 150ms" }} /></span>
                    </div>
                  ))}
                  {!isElectron && <div style={{ fontSize: 11.5, color: TEXT.faint, marginTop: 12 }}>Essas opções têm efeito quando o ChronoCord roda como aplicativo instalado no Windows.</div>}
                </>
              )}

              {settingsTab === "idioma" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Idioma e horário</div>
                  <label style={{ fontSize: 12, color: TEXT.faint }}>Idioma</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: "100%", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: TEXT.main, fontSize: 13, outline: "none", margin: "6px 0 14px" }}>
                    <option>Português (Brasil)</option><option>English (US)</option><option>Español</option><option>日本語</option>
                  </select>
                  <label style={{ fontSize: 12, color: TEXT.faint }}>Formato de horário</label>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    {["24 horas", "12 horas (AM/PM)"].map((opt) => (
                      <div key={opt} onClick={() => setTimeFormat(opt)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${timeFormat === opt ? themeColor : T.border}`, fontSize: 12.5, cursor: "pointer" }}>{opt}</div>
                    ))}
                  </div>
                </>
              )}

              {settingsTab === "aparencia" && (
                <>
                  <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Aparência</div>

                  <label style={{ fontSize: 12, color: TEXT.faint }}>Cor do tema</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 10px" }}>
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => { setThemeColor(e.target.value); setHexDraft(e.target.value); setHexError(false); }}
                      style={{ width: 40, height: 40, border: `1px solid ${T.border}`, borderRadius: 8, background: "none", cursor: "pointer", padding: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          value={hexDraft}
                          onChange={(e) => { setHexDraft(e.target.value); setHexError(false); }}
                          onKeyDown={(e) => e.key === "Enter" && applyHexDraft()}
                          onBlur={applyHexDraft}
                          placeholder="#E8A33D"
                          style={{ flex: 1, background: T.bg1, border: `1px solid ${hexError ? DANGER : T.border}`, borderRadius: 6, padding: "8px 10px", color: TEXT.main, fontSize: 13, fontFamily: FONT_MONO, outline: "none" }}
                        />
                        <span onClick={applyHexDraft} style={{ background: themeColor, color: T.text, fontWeight: 600, fontSize: 12.5, padding: "8px 14px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}>Aplicar</span>
                      </div>
                      {hexError && <div style={{ fontSize: 11, color: DANGER, marginTop: 4 }}>Código inválido — use o formato #RRGGBB</div>}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {THEME_PRESETS.map((hex) => (
                      <div key={hex} onClick={() => { setThemeColor(hex); setHexDraft(hex); setHexError(false); }} title={hex} style={{ width: 30, height: 30, borderRadius: "50%", background: hex, cursor: "pointer", border: themeColor.toLowerCase() === hex.toLowerCase() ? `3px solid ${TEXT.main}` : "3px solid transparent" }} />
                    ))}
                  </div>

                  <label style={{ fontSize: 12, color: TEXT.faint }}>Intensidade do tingimento nos painéis: {tintStrength}%</label>
                  <input type="range" min={0} max={25} value={tintStrength} onChange={(e) => setTintStrength(+e.target.value)} style={{ width: "100%", margin: "6px 0 16px" }} />

                  <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: themeColor, display: "flex", alignItems: "center", justifyContent: "center", color: T.text, fontWeight: 700, fontFamily: FONT_DISPLAY, fontSize: 13 }}>Aa</div>
                    <div style={{ fontSize: 12, color: TEXT.dim, lineHeight: 1.5 }}>
                      Pré-visualização: texto em <strong style={{ color: T.text }}>{T.text === "#000000" ? "preto" : "branco"}</strong> sobre a cor escolhida, aplicado automaticamente conforme o brilho.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <span onClick={() => setSettingsOpen(false)} style={{ background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "8px 18px", borderRadius: 7, cursor: "pointer" }}>Concluir</span>
          </div>
        </Modal>
      )}

      {/* MODAL: CONVIDAR */}
      {inviteOpen && (
        <Modal onClose={() => setInviteOpen(false)} bg={T.bg2} border={T.border}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Convidar para {eraNames[activeEra]}</div>
          <div style={{ fontSize: 12.5, color: TEXT.dim, marginBottom: 14 }}>Envie este link para convidar alguém a entrar nessa era.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, fontFamily: FONT_MONO, color: TEXT.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>chronocord.gg/{activeEra}-{eraNames[activeEra]?.toLowerCase().replace(/\s+/g, "-")}</div>
            <span onClick={copyInvite} style={{ background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "9px 16px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}>{copyState}</span>
          </div>
        </Modal>
      )}

      {/* MODAL: CRIAR CANAL */}
      {createChannelOpen && (
        <Modal onClose={() => setCreateChannelOpen(false)} bg={T.bg2} border={T.border}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Criar canal</div>
          <label style={{ fontSize: 12, color: TEXT.faint }}>Tipo de canal</label>
          <div style={{ display: "flex", gap: 8, margin: "6px 0 14px" }}>
            <div onClick={() => setNewChanType("text")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${newChanType === "text" ? themeColor : T.border}`, cursor: "pointer", fontSize: 13, textAlign: "center" }}># Texto</div>
            <div onClick={() => setNewChanType("voice")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${newChanType === "voice" ? themeColor : T.border}`, cursor: "pointer", fontSize: 13, textAlign: "center" }}>◈ Voz</div>
          </div>
          <label style={{ fontSize: 12, color: TEXT.faint }}>Nome do canal</label>
          <input value={newChanName} onChange={(e) => setNewChanName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createChannel()} placeholder="novo-canal" style={{ width: "100%", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: TEXT.main, fontSize: 13.5, outline: "none", margin: "6px 0 16px" }} autoFocus />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <span onClick={() => setCreateChannelOpen(false)} style={{ color: TEXT.dim, fontSize: 13, padding: "8px 14px", cursor: "pointer" }}>Cancelar</span>
            <span onClick={createChannel} style={{ background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "8px 18px", borderRadius: 7, cursor: "pointer" }}>Criar canal</span>
          </div>
        </Modal>
      )}

      {/* MODAL: ADICIONAR AMIGO */}
      {addFriendOpen && (
        <Modal onClose={() => setAddFriendOpen(false)} bg={T.bg2} border={T.border}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Adicionar amigo</div>
          <div style={{ fontSize: 12.5, color: TEXT.dim, marginBottom: 14 }}>Digite o nome de um cronista para se conectar.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={addFriendName} onChange={(e) => setAddFriendName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFriend()} placeholder="nome#0000" style={{ flex: 1, background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", color: TEXT.main, fontSize: 13.5, outline: "none" }} autoFocus />
            <span onClick={addFriend} style={{ background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "9px 16px", borderRadius: 6, cursor: "pointer" }}>Enviar</span>
          </div>
          {addFriendMsg && <div style={{ fontSize: 12.5, color: STATUS.online, marginTop: 10 }}>{addFriendMsg}</div>}
        </Modal>
      )}

      {/* MODAL: PERFIL */}
      {profileModal && (
        <Modal onClose={() => setProfileModal(null)} width={340} bg={T.bg2} border={T.border}>
          <div style={{ margin: -20, marginBottom: 0 }}>
            <div style={{ borderRadius: "12px 12px 0 0", overflow: "hidden" }}>
              <BannerMedia banner={profileModal.isMe ? myBanner : null} fallbackColor={profileModal.color} height={90} />
            </div>
            <div style={{ padding: "0 20px 20px" }}>
              <div style={{ marginTop: -34, marginBottom: 10 }}>
                <div style={{ display: "inline-block", border: `4px solid ${T.bg2}`, borderRadius: "50%" }}>
                  <Avatar initials={profileModal.name.slice(0, 2).toUpperCase()} color={profileModal.color} size={72} status={profileModal.status} ringColor={T.bg2} imgSrc={profileModal.isMe ? myAvatarUrl : profileModal.imgSrc} />
                </div>
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18 }}>{profileModal.name}</div>
              <div style={{ fontSize: 12.5, color: TEXT.faint, marginBottom: 10 }}>{profileModal.role}</div>
              <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: TEXT.faint, textTransform: "uppercase", marginBottom: 6 }}>Sobre {profileModal.isMe ? "mim" : ""}</div>
                <div style={{ fontSize: 13, color: TEXT.dim, lineHeight: 1.5 }}>{profileModal.isMe ? (aboutMe || "Você ainda não escreveu nada sobre si.") : "Cronista ativo nesta timeline."}</div>
              </div>
              {profileModal.isMe ? (
                <div onClick={() => { setProfileModal(null); setSettingsOpen(true); setSettingsTab("perfil"); }} style={{ marginTop: 14, textAlign: "center", background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "9px 0", borderRadius: 7, cursor: "pointer" }}>Editar perfil</div>
              ) : (
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <div onClick={() => setProfileModal(null)} style={{ flex: 1, textAlign: "center", background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "9px 0", borderRadius: 7, cursor: "pointer" }}>Enviar mensagem</div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: CRIAR / ENTRAR EM ERA */}
      {addEraOpen && (
        <Modal onClose={() => setAddEraOpen(false)} width={380} bg={T.bg2} border={T.border}>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <div onClick={() => setAddEraTab("create")} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8, border: `1px solid ${addEraTab === "create" ? themeColor : T.border}`, color: addEraTab === "create" ? TEXT.main : TEXT.dim, fontSize: 13, cursor: "pointer", fontWeight: addEraTab === "create" ? 600 : 400 }}>Criar era</div>
            <div onClick={() => setAddEraTab("join")} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8, border: `1px solid ${addEraTab === "join" ? themeColor : T.border}`, color: addEraTab === "join" ? TEXT.main : TEXT.dim, fontSize: 13, cursor: "pointer", fontWeight: addEraTab === "join" ? 600 : 400 }}>Entrar em uma era</div>
          </div>

          {addEraTab === "create" ? (
            <>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Sua era, seu jeito</div>
              <div style={{ fontSize: 12.5, color: TEXT.dim, marginBottom: 16 }}>Dê um nome e, se quiser, um ícone. Você entra como fundador(a).</div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <label style={{ position: "relative", width: 76, height: 76, borderRadius: "50%", border: `2px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", background: newEraIcon ? `url(${newEraIcon}) center/cover` : "transparent" }}>
                  {!newEraIcon && <Icon name="camera" size={22} color={TEXT.faint} />}
                  <input type="file" accept="image/png,image/gif,image/jpeg,image/webp" style={{ display: "none" }} onChange={(e) => handleImageUpload(e.target.files[0], setNewEraIcon)} />
                </label>
              </div>
              <label style={{ fontSize: 12, color: TEXT.faint }}>Nome da era</label>
              <input value={newEraName} onChange={(e) => setNewEraName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createEra()} placeholder="Nome da sua comunidade" style={{ width: "100%", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", color: TEXT.main, fontSize: 13.5, outline: "none", margin: "6px 0 16px" }} autoFocus />
              <div onClick={createEra} style={{ textAlign: "center", background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "9px 0", borderRadius: 7, cursor: "pointer" }}>Criar era</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Entrar com um convite</div>
              <div style={{ fontSize: 12.5, color: TEXT.dim, marginBottom: 12 }}>Cole o código de convite de uma era.</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={joinCode} onChange={(e) => { setJoinCode(e.target.value); setJoinError(""); }} onKeyDown={(e) => e.key === "Enter" && joinEraByCode()} placeholder="ex.: vento-solar" style={{ flex: 1, background: T.bg1, border: `1px solid ${joinError ? DANGER : T.border}`, borderRadius: 6, padding: "9px 12px", color: TEXT.main, fontSize: 13.5, outline: "none" }} autoFocus />
                <div onClick={joinEraByCode} style={{ background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "9px 16px", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center" }}>Entrar</div>
              </div>
              {joinError && <div style={{ fontSize: 12, color: DANGER, marginBottom: 10 }}>{joinError}</div>}

              <div style={{ fontSize: 11, fontWeight: 600, color: TEXT.faint, textTransform: "uppercase", margin: "14px 0 8px", display: "flex", alignItems: "center", gap: 5 }}><Icon name="compass" size={13} /> Eras públicas para experimentar</div>
              {PUBLIC_ERAS.filter((p) => !joinedPublicCodes.includes(p.code)).map((p) => (
                <div key={p.code} onClick={() => setJoinCode(p.code)} className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 8, cursor: "pointer", border: `1px solid ${T.border}`, marginBottom: 6 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", color: contrastText(p.color), fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 12 }}>{p.icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: TEXT.faint }}>código: {p.code}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </Modal>
      )}

      {/* MODAL: JUKEBOX */}
      {jukeboxOpen && (
        <Modal onClose={() => setJukeboxOpen(false)} width={380} bg={T.bg2} border={T.border}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Icon name="music" size={18} color={themeColor} />
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16 }}>Jukebox</div>
          </div>
          <div style={{ fontSize: 12, color: T.textFaint, marginBottom: 14 }}>Toca pra todo mundo no canal de voz {voiceState.channelName || ""}.</div>

          {nowPlaying ? (
            <div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Icon name={nowPlaying.type === "video" ? "video" : "music"} size={14} color={themeColor} />
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{nowPlaying.title}</div>
              </div>
              {nowPlaying.type === "video" && showVideoArea && (
                <div style={{ width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: 8, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", color: T.textFaint, overflow: "hidden" }}>
                  {nowPlaying.fileSrc ? <video src={nowPlaying.fileSrc} controls={false} autoPlay muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="video" size={28} />}
                </div>
              )}
              <div style={{ height: 4, borderRadius: 4, background: T.bg2, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ height: "100%", width: `${Math.min(100, (elapsed / nowPlaying.duration) * 100)}%`, background: themeColor, transition: "width 1s linear" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: T.textFaint, fontFamily: FONT_MONO, marginBottom: 10 }}>
                <span>{fmtDuration(elapsed)}</span><span>{fmtDuration(nowPlaying.duration)}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span onClick={() => setIsPlaying((p) => !p)} style={{ flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 7, background: T.bg2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={isPlaying ? "pause" : "play"} size={14} /></span>
                <span onClick={advanceQueue} style={{ flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 7, background: T.bg2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="skip" size={14} /></span>
                {nowPlaying.type === "video" && (
                  <span onClick={() => setShowVideoArea((v) => !v)} title="Mostrar vídeo" style={{ flex: 1, textAlign: "center", padding: "7px 0", borderRadius: 7, background: showVideoArea ? `${themeColor}33` : T.bg2, color: showVideoArea ? themeColor : "inherit", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="video" size={14} /></span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: T.textFaint, marginBottom: 14, textAlign: "center", padding: "16px 0" }}>Nada tocando agora. Adicione algo abaixo.</div>
          )}

          {queue.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textFaint, textTransform: "uppercase", marginBottom: 6 }}>Fila — {queue.length}</div>
              {queue.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", fontSize: 12.5 }}>
                  <Icon name={t.type === "video" ? "video" : "music"} size={12} color={T.textFaint} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                  <span onClick={() => removeFromQueue(t.id)} style={{ cursor: "pointer", color: T.textFaint, display: "flex" }}><Icon name="x" size={12} /></span>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div onClick={() => setNewTrackType("music")} style={{ flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 7, border: `1px solid ${newTrackType === "music" ? themeColor : T.border}`, cursor: "pointer", fontSize: 12 }}>🎵 Música</div>
              <div onClick={() => setNewTrackType("video")} style={{ flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 7, border: `1px solid ${newTrackType === "video" ? themeColor : T.border}`, cursor: "pointer", fontSize: 12 }}>🎬 Vídeo</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={newTrackTitle} onChange={(e) => setNewTrackTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addToQueue()} placeholder={newTrackType === "video" ? "título ou link do vídeo" : "título ou link da música"} style={{ flex: 1, background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: T.textMain, fontSize: 12.5, outline: "none" }} />
              <label style={{ width: 36, background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.textFaint }} title={newTrackType === "video" ? "Enviar arquivo MP4" : "Enviar arquivo MP3"}>
                <Icon name="paperclip" size={15} />
                <input type="file" accept={newTrackType === "video" ? "video/mp4" : "audio/mpeg"} style={{ display: "none" }} onChange={(e) => { const f = e.target.files[0]; if (f) { setNewTrackTitle(f.name); } }} />
              </label>
              <span onClick={addToQueue} style={{ background: themeColor, color: T.text, fontWeight: 600, fontSize: 12.5, padding: "8px 14px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}>Adicionar</span>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: WATCH2CHRONOS */}
      {watch2Open && (
        <Modal onClose={() => setWatch2Open(false)} width={520} bg={T.bg2} border={T.border}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Icon name="video" size={18} color={themeColor} />
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16 }}>Watch2Chronos</div>
          </div>
          <div style={{ fontSize: 12, color: T.textFaint, marginBottom: 14 }}>Assista vídeos do YouTube (incluindo lives) junto com quem estiver no canal de voz.</div>

          <div style={{ width: "100%", aspectRatio: "16/9", background: "#000", borderRadius: 10, overflow: "hidden", position: "relative", marginBottom: 12 }}>
            {watch2Current ? (
              <iframe ref={watch2IframeRef} src={watch2Current.embedUrl} title={watch2Current.title} allow="autoplay; encrypted-media" style={{ width: "100%", height: "100%", border: "none" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: T.textFaint, flexDirection: "column", gap: 8 }}>
                <Icon name="video" size={30} /><span style={{ fontSize: 12 }}>Cole um link do YouTube abaixo pra começar</span>
              </div>
            )}
            {watch2Current && <div style={{ position: "absolute", inset: 0, background: "#000", opacity: (100 - watch2Brightness) / 100, pointerEvents: "none" }} />}
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <input value={watch2UrlInput} onChange={(e) => setWatch2UrlInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && w2AddToQueue()} placeholder="Link do YouTube (vídeo ou live)" style={{ flex: 1, background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px", color: T.textMain, fontSize: 12.5, outline: "none" }} />
            <span onClick={w2AddToQueue} style={{ background: themeColor, color: T.text, fontWeight: 600, fontSize: 12.5, padding: "8px 14px", borderRadius: 6, cursor: "pointer" }}>{watch2Current ? "Adicionar à fila" : "Assistir"}</span>
          </div>

          {watch2Current && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <span onClick={() => w2Seek(-5)} style={{ padding: "7px 10px", borderRadius: 7, background: T.bg1, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><Icon name="rewind" size={13} /> 5s</span>
              <span onClick={w2TogglePlay} style={{ padding: "7px 14px", borderRadius: 7, background: T.bg1, cursor: "pointer", display: "flex", alignItems: "center" }}><Icon name={watch2Playing ? "pause" : "play"} size={13} /></span>
              <span onClick={() => w2Seek(5)} style={{ padding: "7px 10px", borderRadius: 7, background: T.bg1, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>5s <Icon name="forward" size={13} /></span>
              <span onClick={w2Advance} style={{ padding: "7px 10px", borderRadius: 7, background: T.bg1, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><Icon name="skip" size={13} /> próximo</span>
              <span onClick={w2Stop} style={{ padding: "7px 10px", borderRadius: 7, background: T.bg1, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: DANGER }}><Icon name="stop" size={12} /> parar</span>
            </div>
          )}

          <label style={{ fontSize: 12, color: T.textFaint }}>Volume: {watch2Volume}%</label>
          <input type="range" min={0} max={100} value={watch2Volume} onChange={(e) => setWatch2Volume(+e.target.value)} style={{ width: "100%", margin: "6px 0 12px" }} />
          <label style={{ fontSize: 12, color: T.textFaint, display: "flex", alignItems: "center", gap: 5 }}><Icon name="sun" size={13} /> Brilho: {watch2Brightness}%</label>
          <input type="range" min={20} max={100} value={watch2Brightness} onChange={(e) => setWatch2Brightness(+e.target.value)} style={{ width: "100%", margin: "6px 0 12px" }} />

          {watch2Queue.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textFaint, textTransform: "uppercase", marginBottom: 6 }}>Fila — {watch2Queue.length}</div>
              {watch2Queue.map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 2px", fontSize: 12 }}>
                  <Icon name="video" size={12} color={T.textFaint} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                  <span onClick={() => setWatch2Queue((q) => q.filter((x) => x.id !== t.id))} style={{ cursor: "pointer", color: T.textFaint, display: "flex" }}><Icon name="x" size={12} /></span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
    </div>
  );
}
