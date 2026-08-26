import React, { useMemo, useState } from "react";

const navSections = [
  { id: "conta", label: "Conta", icon: "●" },
  { id: "privacidade", label: "Dados e privacidade", icon: "◈" },
  { id: "mensagens", label: "Permissões de mensagens", icon: "◌" },
  { id: "notificacoes", label: "Notificações", icon: "●" },
  { id: "billing", label: "Cobrança", header: true },
  { id: "nito", label: "Nito", icon: "◇", nested: true },
  { id: "boost", label: "Impulso de servidor", icon: "⬡", nested: true },
  { id: "assinaturas", label: "Assinaturas", icon: "◌", nested: true },
  { id: "presentes", label: "Inventário de presentes", icon: "□", nested: true },
  { id: "cobranca", label: "Cobrança", icon: "▤", nested: true },
  { id: "experience", label: "Experiência", header: true },
  { id: "voz", label: "Voz e vídeo", icon: "♬", nested: true },
  { id: "aparencia", label: "Aparência", icon: "✿", nested: true },
  { id: "acessibilidade", label: "Acessibilidade", icon: "◉", nested: true },
  { id: "sistema", label: "Sistema", icon: "▦", nested: true },
];

function Row({ label, value, action, muted, onClick }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "18px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, color: muted ? "#9c9ca7" : "#f3f3f7" }}>{label}</div>
        {value && <div style={{ marginTop: 5, fontSize: 13, color: "#a7a7b2", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>}
      </div>
      {action && <button onClick={onClick} style={{ flexShrink: 0, border: "1px solid rgba(255,255,255,0.06)", background: "#41424a", color: "#fff", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontSize: 13 }}>{action}</button>}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} aria-pressed={value} style={{ width: 42, height: 24, border: "0", borderRadius: 999, padding: 3, background: value ? "#7c5cff" : "#555761", cursor: "pointer", display: "flex", justifyContent: value ? "flex-end" : "flex-start", alignItems: "center" }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block" }} />
    </button>
  );
}

function SettingsPage({
  T,
  themeColor,
  themeMode,
  setThemeMode,
  setThemeColor,
  setHexDraft,
  authUser,
  myAvatarUrl,
  formUsername,
  privacy,
  setPrivacy,
  permissions,
  setPermissions,
  sounds,
  setSounds,
  cameraDevice,
  setCameraDevice,
  streamQuality,
  setStreamQuality,
  streamAudio,
  setStreamAudio,
  accessibility,
  setAccessibility,
  systemPrefs,
  setSystemPrefs,
  language,
  setLanguage,
  timeFormat,
  setTimeFormat,
  customStatus,
  setCustomStatus,
  aboutMe,
  setAboutMe,
  onClose,
  onEditProfile,
}) {
  const [active, setActive] = useState("conta");
  const [search, setSearch] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  const user = authUser || {};
  const username = formUsername || user.username || "Chronista";
  const email = user.email || "seu e-mail não cadastrado";
  const avatar = myAvatarUrl || user.avatar;
  const nav = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return navSections;
    return navSections.filter((item) => item.label.toLowerCase().includes(q));
  }, [search]);

  const activeTitle = navSections.find((item) => item.id === active)?.label || "Conta";
  const go = (id) => setActive(id);

  const renderContent = () => {
    if (active === "conta") return (
      <>
        <h1 style={{ fontSize: 24, fontWeight: 500, margin: "10px 0 30px" }}>Informações da conta</h1>
        <Row label="Nome de usuário" value={username} action="Editar" onClick={onEditProfile} />
        <Row label="E-mail" value={showEmail ? email : "••••••••@gmail.com"} action={showEmail ? "Ocultar" : "Mostrar"} onClick={() => setShowEmail(v => !v)} />
        <Row label="Telefone" value="Não cadastrado" action="Editar" />
        <Row label="Grupo etário" value="Não confirmado" action="Confirmar" />
        <div style={{ height: 34 }} />
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 8px" }}>Senha e segurança</h2>
        <Row label="Senha" action="Editar" />
        <Row label="Autenticação Multifatorial" value="Proteja sua conta com uma camada extra" action="Definir" />
        <Row label="Dispositivos conectados" value="Este aplicativo" action="Gerenciar" />
        <div style={{ height: 34 }} />
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 8px" }}>Status da Conta</h2>
        <div style={{ background: "#303139", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}><div style={{ width: 30, height: 30, borderRadius: "50%", background: "#3fbf7f", color: "#fff", display: "grid", placeItems: "center" }}>✓</div><div><div style={{ fontWeight: 600 }}>Sua conta está toda em ordem</div><div style={{ fontSize: 12.5, color: "#aaaab5", marginTop: 4 }}>Não há avisos importantes no momento.</div></div></div>
        </div>
      </>
    );

    if (active === "privacidade") return <Section title="Dados e privacidade"><Row label="Dados de diagnóstico e telemetria" value="Ajude a melhorar o ChronoCord" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!privacy.analytics} onChange={(v) => setPrivacy({ ...privacy, analytics: v })} /></div><Row label="Confirmação de leitura" value="Permitir recibos de leitura" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!privacy.readReceipts} onChange={(v) => setPrivacy({ ...privacy, readReceipts: v })} /></div></Section>;
    if (active === "mensagens") return <Section title="Permissões de mensagens"><Row label="Mensagens de membros dos servidores" value="Permitir DMs por padrão" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!permissions.dmFromMembers} onChange={(v) => setPermissions({ ...permissions, dmFromMembers: v })} /></div><Row label="Solicitações de amizade" value="Quem pode enviar convites" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!permissions.friendRequests} onChange={(v) => setPermissions({ ...permissions, friendRequests: v })} /></div></Section>;
    if (active === "notificacoes") return <Section title="Notificações"><Row label="Som principal" value="Volume geral" action={`${sounds.masterVolume ?? 80}%`} /><input type="range" min="0" max="100" value={sounds.masterVolume ?? 80} onChange={(e) => setSounds({ ...sounds, masterVolume: Number(e.target.value) })} style={{ width: "100%", accentColor: themeColor }} /><Row label="Som de mensagem" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!sounds.messageSound} onChange={(v) => setSounds({ ...sounds, messageSound: v })} /></div><Row label="Som ao entrar em chamada" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!sounds.callJoinSound} onChange={(v) => setSounds({ ...sounds, callJoinSound: v })} /></div></Section>;
    if (active === "voz") return <Section title="Voz e vídeo"><SelectRow label="Câmera" value={cameraDevice} options={["Webcam padrão", "Câmera integrada", "USB Camera"]} onChange={setCameraDevice} /><SelectRow label="Qualidade da transmissão" value={streamQuality} options={["720p 30fps", "1080p 30fps", "1080p 60fps"]} onChange={setStreamQuality} /><Row label="Áudio da transmissão" value="Compartilhar áudio ao transmitir tela" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={streamAudio} onChange={setStreamAudio} /></div></Section>;
    if (active === "aparencia") return <Section title="Aparência"><div style={{ fontSize: 13, color: "#aaaab5", marginBottom: 14 }}>Escolha a aparência principal do ChronoCord.</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>{[["original","Original","#9B4DFF"],["preto","Preto","#0A0A0A"],["branco","Branco","#F7F5FF"]].map(([id,label,color])=><button key={id} onClick={() => { setThemeMode(id); const next=id === "branco" ? "#6D46FF" : "#9B4DFF"; setThemeColor(next); setHexDraft(next); }} style={{ textAlign: "left", background: "#303139", border: `1px solid ${themeMode === id ? themeColor : "#444650"}`, borderRadius: 10, padding: 12, color: "#fff", cursor: "pointer" }}><div style={{ height: 72, borderRadius: 8, background: color, marginBottom: 8 }} /><div style={{ fontWeight: 600 }}>{label}</div></button>)}</div></Section>;
    if (active === "acessibilidade") return <Section title="Acessibilidade"><Row label="Reduzir movimento" value="Diminui animações e transições" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!accessibility.reduceMotion} onChange={(v) => setAccessibility({ ...accessibility, reduceMotion: v })} /></div><Row label="Reproduzir GIFs automaticamente" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!accessibility.autoplayGifs} onChange={(v) => setAccessibility({ ...accessibility, autoplayGifs: v })} /></div></Section>;
    if (active === "sistema") return <Section title="Sistema"><SelectRow label="Idioma" value={language} options={["Português (Brasil)", "English", "Español"]} onChange={setLanguage} /><SelectRow label="Formato de horário" value={timeFormat} options={["24 horas", "12 horas"]} onChange={setTimeFormat} /><Row label="Abrir com o sistema" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!systemPrefs.openOnStartup} onChange={(v) => setSystemPrefs({ ...systemPrefs, openOnStartup: v })} /></div><Row label="Minimizar para a bandeja" /><div style={{ marginTop: -10, display: "flex", justifyContent: "flex-end" }}><Toggle value={!!systemPrefs.minimizeToTray} onChange={(v) => setSystemPrefs({ ...systemPrefs, minimizeToTray: v })} /></div></Section>;
    if (["nito","boost","assinaturas","presentes","cobranca"].includes(active)) return <Section title={activeTitle}><div style={{ background: "#303139", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 18, color: "#aaaab5" }}>Esta área está preparada para recursos futuros do ChronoCord.</div></Section>;
    return <Section title={activeTitle}><div style={{ color: "#aaaab5" }}>Configuração disponível em breve.</div></Section>;
  };

  return (
    <div className="cc-settings-overlay" onKeyDown={(e) => e.key === "Escape" && onClose()} tabIndex={-1} style={{ position: "absolute", inset: 0, zIndex: 120, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "stretch", justifyContent: "center", padding: 18 }}>
      <div style={{ width: "min(1400px, 100%)", height: "100%", background: "#303139", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden", display: "flex", boxShadow: "0 30px 80px rgba(0,0,0,.65)" }}>
        <aside style={{ width: 255, flexShrink: 0, background: "#2b2c33", padding: "20px 14px 16px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 16px" }}>
            {avatar ? <img src={avatar} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 42, height: 42, borderRadius: "50%", background: themeColor, display: "grid", placeItems: "center", fontWeight: 700, color: T.text }}>{username.slice(0,2).toUpperCase()}</div>}
            <div style={{ minWidth: 0 }}><div style={{ color: "#fff", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" }}>{username}</div><button onClick={onEditProfile} style={{ border: 0, background: "none", padding: 0, color: "#9fa0ab", cursor: "pointer", fontSize: 12 }}>Editar perfil ✎</button></div>
          </div>
          <div style={{ padding: "0 3px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 8, background: "#24252b", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 9, padding: "9px 10px" }}><span style={{ color: "#b9bbc4" }}>⌕</span><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar" style={{ flex: 1, border: 0, outline: "none", background: "transparent", color: "#fff", fontSize: 13 }} /></div></div>
          <div style={{ overflowY: "auto", paddingRight: 3 }}>
            {nav.map((item, i) => item.header ? <div key={item.id} style={{ margin: "18px 9px 6px", color: "#9fa0ab", fontSize: 11, textTransform: "none" }}>{item.label}</div> : <button key={item.id} onClick={()=>go(item.id)} style={{ width: "100%", border: 0, background: active===item.id ? "#45464f" : "transparent", color: active===item.id ? "#fff" : "#bbbcc5", borderRadius: 7, padding: item.nested ? "8px 10px 8px 20px" : "9px 10px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}><span style={{ width: 16, textAlign: "center", opacity: .8 }}>{item.icon}</span>{item.label}</button>)}
          </div>
        </aside>
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#36373f" }}>
          <header style={{ height: 64, flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px" }}>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{activeTitle}</div>
            <button onClick={onClose} title="Fechar" style={{ width: 36, height: 36, borderRadius: "50%", border: 0, background: "transparent", color: "#b6b7c0", fontSize: 26, cursor: "pointer" }}>×</button>
          </header>
          <div style={{ flex: 1, overflowY: "auto", padding: "34px clamp(28px, 7vw, 110px) 80px" }}>
            <div style={{ maxWidth: 780, margin: "0 auto" }}>{renderContent()}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return <><h1 style={{ fontSize: 24, fontWeight: 500, margin: "10px 0 26px", color: "#fff" }}>{title}</h1>{children}</>;
}

function SelectRow({ label, value, options, onChange }) {
  return <div style={{ padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center" }}><div><div style={{ color: "#f2f2f6", fontSize: 14 }}>{label}</div><div style={{ color: "#9fa0ab", fontSize: 12.5, marginTop: 4 }}>Selecione uma opção</div></div><select value={value} onChange={(e)=>onChange(e.target.value)} style={{ background: "#24252b", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 12px", minWidth: 190 }}>{options.map(x=><option key={x}>{x}</option>)}</select></div>;
}

export default SettingsPage;
