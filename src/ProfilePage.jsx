import React, { useEffect, useMemo, useState } from "react";

const PROFILE_STORAGE_KEY = "cc_profile_customization_v1";

const defaultCustomization = {
  badge: "none",
  decoration: "none",
  bannerColor: "#090909",
  effect: "none",
  frame: "none",
  displayNameStyle: "solid",
  displayNameColor: "#FFFFFF",
};

const decorations = [
  { id: "none", label: "Nenhuma", glyph: "○" },
  { id: "orbit", label: "Órbita", glyph: "◉" },
  { id: "spark", label: "Brilho", glyph: "✦" },
  { id: "halo", label: "Halo", glyph: "◌" },
];

const effects = [
  { id: "none", label: "Nenhum", tone: "#6A6390" },
  { id: "glow", label: "Glow", tone: "#9B4DFF" },
  { id: "holo", label: "Holográfico", tone: "#5B8CFF" },
  { id: "pulse", label: "Pulsar", tone: "#3FD9BE" },
];

const frames = [
  { id: "none", label: "Nenhuma", glyph: "◯" },
  { id: "soft", label: "Soft", glyph: "◉" },
  { id: "square", label: "Quadrada", glyph: "▣" },
  { id: "double", label: "Dupla", glyph: "◎" },
];

const names = [
  { id: "solid", label: "Sólido" },
  { id: "gradient", label: "Gradiente" },
  { id: "glow", label: "Brilho" },
  { id: "mono", label: "Monoespaçado" },
];

function loadCustomization() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "null");
    return { ...defaultCustomization, ...(saved || {}) };
  } catch {
    return { ...defaultCustomization };
  }
}

function Icon({ name, size = 18, color = "currentColor" }) {
  const p = { fill: "none", stroke: color, strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    x: <><line x1="4.5" y1="4.5" x2="15.5" y2="15.5" {...p} /><line x1="15.5" y1="4.5" x2="4.5" y2="15.5" {...p} /></>,
    settings: <><circle cx="10" cy="10" r="2.6" {...p} />{[0,60,120,180,240,300].map((deg)=><line key={deg} x1="10" y1="3.2" x2="10" y2="5.4" transform={`rotate(${deg} 10 10)`} {...p} />)}</>,
    edit: <path d="M13.4 3.6a1.7 1.7 0 0 1 2.4 2.4L6.5 15.3l-3.2.8.8-3.2 9.3-9.3Z" {...p} />,
    plus: <><line x1="10" y1="4" x2="10" y2="16" {...p}/><line x1="4" y1="10" x2="16" y2="10" {...p}/></>,
    arrow: <path d="M7 4.5 12.5 10 7 15.5" {...p} />,
  };
  return <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">{paths[name]}</svg>;
}

function AvatarPreview({ profile, custom, T, themeColor, size = 92 }) {
  const img = profile?.imgSrc;
  const initials = String(profile?.name || "CC").slice(0, 2).toUpperCase();
  const frame = frames.find((item) => item.id === custom.frame) || frames[0];
  const decoration = decorations.find((item) => item.id === custom.decoration) || decorations[0];
  const borderColor = custom.effect === "glow" ? themeColor : custom.effect === "holo" ? "#6A8CFF" : T.border;
  const radius = custom.frame === "square" ? 18 : "50%";
  return (
    <div style={{ position: "relative", width: size + 28, height: size + 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {custom.decoration !== "none" && (
        <div style={{ position: "absolute", inset: 1, borderRadius: "50%", border: `2px ${custom.decoration === "orbit" ? "solid" : "dashed"} ${themeColor}66`, transform: custom.decoration === "orbit" ? "rotate(-16deg) scaleX(1.08)" : "none", boxShadow: custom.decoration === "halo" ? `0 0 22px ${themeColor}55` : "none" }} />
      )}
      <div style={{ position: "relative", width: size, height: size, borderRadius: radius, padding: custom.frame === "double" ? 5 : 3, background: `linear-gradient(135deg, ${borderColor}, ${T.bg5})`, boxShadow: custom.effect === "glow" ? `0 0 28px ${themeColor}66` : "0 9px 24px #00000055" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: custom.frame === "square" ? 14 : "50%", overflow: "hidden", background: profile?.color || themeColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: size * 0.28 }}>
          {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
        </div>
      </div>
      {custom.decoration === "spark" && <div style={{ position: "absolute", top: 3, right: 8, color: themeColor, fontSize: 20 }}>✦</div>}
      {custom.decoration !== "none" && <div style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", background: themeColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, boxShadow: "0 5px 12px #00000055" }}>{decoration.glyph}</div>}
      <div style={{ display: "none" }}>{frame.label}</div>
    </div>
  );
}

function OptionCard({ selected, onClick, title, subtitle, T, children }) {
  return (
    <button onClick={onClick} style={{ appearance: "none", border: `1px solid ${selected ? T.color : T.border}`, background: selected ? `${T.color}18` : T.bg1, color: T.textMain, borderRadius: 10, padding: 10, cursor: "pointer", textAlign: "left", minWidth: 0 }}>
      <div style={{ height: 56, borderRadius: 8, background: T.bg3, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>{children}</div>
      <div style={{ fontSize: 12, fontWeight: 700 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 10.5, color: T.textFaint, marginTop: 2 }}>{subtitle}</div>}
    </button>
  );
}

export default function ProfilePage({ profile, isMe, T, themeColor, onClose, onEditProfile }) {
  const [tab, setTab] = useState("mural");
  const [editOpen, setEditOpen] = useState(false);
  const [custom, setCustom] = useState(loadCustomization);
  const [draftName, setDraftName] = useState(profile?.name || "Chronista");
  const [draftAbout, setDraftAbout] = useState(profile?.about || "");
  const [posts, setPosts] = useState([]);
  const [postDraft, setPostDraft] = useState("");
  const [favoriteGames, setFavoriteGames] = useState([]);
  const [wantGames, setWantGames] = useState([]);
  const [gameInput, setGameInput] = useState("");
  const [gameTarget, setGameTarget] = useState("favorite");

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("cc_profile_page_v1") || "null");
      if (raw?.posts) setPosts(raw.posts);
      if (raw?.favoriteGames) setFavoriteGames(raw.favoriteGames);
      if (raw?.wantGames) setWantGames(raw.wantGames);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(custom));
      localStorage.setItem("cc_profile_page_v1", JSON.stringify({ posts, favoriteGames, wantGames }));
    } catch {}
  }, [custom, posts, favoriteGames, wantGames]);

  const displayStyle = useMemo(() => {
    if (custom.displayNameStyle === "gradient") return { background: `linear-gradient(90deg, ${custom.displayNameColor}, ${themeColor})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" };
    if (custom.displayNameStyle === "glow") return { color: custom.displayNameColor, textShadow: `0 0 14px ${custom.displayNameColor}88` };
    if (custom.displayNameStyle === "mono") return { color: custom.displayNameColor, fontFamily: "'JetBrains Mono', monospace" };
    return { color: custom.displayNameColor };
  }, [custom.displayNameStyle, custom.displayNameColor, themeColor]);

  function savePost() {
    const text = postDraft.trim();
    if (!text || !isMe) return;
    setPosts((prev) => [{ id: Date.now(), text, time: new Date().toLocaleString("pt-BR") }, ...prev]);
    setPostDraft("");
  }

  function addGame() {
    const value = gameInput.trim();
    if (!value || !isMe) return;
    if (gameTarget === "favorite") setFavoriteGames((prev) => [...prev.slice(0, 19), value]);
    else setWantGames((prev) => [...prev.slice(0, 19), value]);
    setGameInput("");
  }

  function removeGame(type, index) {
    if (!isMe) return;
    if (type === "favorite") setFavoriteGames((prev) => prev.filter((_, i) => i !== index));
    else setWantGames((prev) => prev.filter((_, i) => i !== index));
  }

  function patchCustom(key, value) {
    if (!isMe) return;
    setCustom((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 75, background: T.bg0, color: T.textMain, display: "flex", overflow: "hidden" }}>
      <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
        <div style={{ minHeight: 260, background: `linear-gradient(135deg, ${custom.bannerColor}, ${T.bg3})`, borderBottom: `1px solid ${T.border}`, position: "relative" }}>
          <button onClick={onClose} aria-label="Fechar perfil" style={{ position: "absolute", top: 16, right: 16, width: 38, height: 38, borderRadius: "50%", border: `1px solid ${T.border}`, background: "#00000066", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="x" size={17} /></button>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: -76, padding: "0 34px", display: "flex", alignItems: "flex-end", gap: 18 }}>
            <AvatarPreview profile={profile} custom={custom} T={T} themeColor={themeColor} size={112} />
            <div style={{ paddingBottom: 18, minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 800, ...displayStyle, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{draftName}</div>
              <div style={{ fontSize: 12.5, color: T.textDim }}>{profile?.role || "Cronista"}{profile?.status ? ` · ${profile.status}` : ""}</div>
            </div>
            {isMe && <div style={{ marginLeft: "auto", paddingBottom: 18, display: "flex", gap: 8 }}><button onClick={() => setEditOpen((v) => !v)} style={{ border: `1px solid ${T.border}`, background: T.bg2, color: T.textMain, borderRadius: 8, padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}><Icon name="edit" size={14} /> Personalizar</button><button onClick={onEditProfile} style={{ border: "none", background: themeColor, color: T.text, borderRadius: 8, padding: "9px 14px", cursor: "pointer" }}>Editar perfil</button></div>}
          </div>
        </div>

        <div style={{ padding: "92px 34px 40px", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
            {[["mural", "Mural"], ["atividade", "Atividade"], ["desejos", "Lista de desejos"]].map(([id, label]) => <button key={id} onClick={() => setTab(id)} style={{ border: 0, background: "none", color: tab === id ? T.textMain : T.textDim, padding: "11px 1px 10px", marginRight: 20, borderBottom: `2px solid ${tab === id ? themeColor : "transparent"}`, cursor: "pointer", fontWeight: tab === id ? 700 : 500 }}>{label}</button>)}
          </div>

          {editOpen && isMe && (
            <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}><div><div style={{ fontWeight: 800, fontSize: 16 }}>Personalizar perfil</div><div style={{ color: T.textFaint, fontSize: 11.5, marginTop: 3 }}>As opções abaixo são inspiradas diretamente na tela de personalização enviada.</div></div><button onClick={() => setEditOpen(false)} style={{ border: 0, background: "none", color: T.textDim, cursor: "pointer" }}><Icon name="x" size={16} /></button></div>

              <div style={{ display: "grid", gap: 18 }}>
                <section>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Placa de identificação</div>
                  <div style={{ display: "flex", gap: 10, background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 10, padding: 10, alignItems: "center" }}>
                    <AvatarPreview profile={profile} custom={custom} T={T} themeColor={themeColor} size={54} />
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ ...displayStyle, fontWeight: 800 }}>{draftName}</div><div style={{ color: T.textFaint, fontSize: 11 }}>Sua identificação aparece em cartões e perfis.</div></div>
                    <button onClick={() => setDraftName((v) => v || "Chronista")} style={{ width: 34, height: 34, border: 0, borderRadius: "50%", background: themeColor, color: T.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name="edit" size={15} /></button>
                  </div>
                </section>

                <section>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Avatar e decorações</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
                    {decorations.map((item) => <OptionCard key={item.id} selected={custom.decoration === item.id} onClick={() => patchCustom("decoration", item.id)} title={item.label} T={T}><div style={{ width: 34, height: 34, borderRadius: "50%", border: `2px dashed ${item.id === "none" ? T.border : themeColor}`, display: "flex", alignItems: "center", justifyContent: "center", color: item.id === "none" ? T.textFaint : themeColor }}>{item.glyph}</div></OptionCard>)}
                  </div>
                </section>

                <section>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Cor da faixa</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="color" value={custom.bannerColor} disabled={!isMe} onChange={(e) => patchCustom("bannerColor", e.target.value)} style={{ width: 54, height: 36, padding: 0, border: 0, background: "none", cursor: "pointer" }} />
                    <input value={custom.bannerColor} disabled={!isMe} onChange={(e) => patchCustom("bannerColor", e.target.value)} style={{ flex: 1, border: `1px solid ${T.border}`, background: T.bg1, borderRadius: 8, color: T.textMain, padding: "9px 11px", fontFamily: "'JetBrains Mono', monospace", outline: "none" }} />
                  </div>
                </section>

                <section>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Efeitos de perfil e molduras</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginBottom: 10 }}>
                    {effects.map((item) => <OptionCard key={item.id} selected={custom.effect === item.id} onClick={() => patchCustom("effect", item.id)} title={item.label} T={T}><div style={{ width: 38, height: 38, borderRadius: item.id === "none" ? 8 : "50%", background: item.tone, boxShadow: item.id === "glow" ? `0 0 20px ${item.tone}77` : item.id === "pulse" ? `0 0 0 6px ${item.tone}22` : "none" }} /></OptionCard>)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
                    {frames.map((item) => <OptionCard key={item.id} selected={custom.frame === item.id} onClick={() => patchCustom("frame", item.id)} title={item.label} T={T}><div style={{ width: 35, height: 35, borderRadius: item.id === "square" ? 9 : "50%", border: `3px ${item.id === "double" ? "double" : "solid"} ${themeColor}`, display: "flex", alignItems: "center", justifyContent: "center", color: themeColor, fontSize: 13 }}>{item.glyph}</div></OptionCard>)}
                  </div>
                </section>

                <section>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Estilo do nome exibido</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
                    {names.map((item) => <OptionCard key={item.id} selected={custom.displayNameStyle === item.id} onClick={() => patchCustom("displayNameStyle", item.id)} title={item.label} T={T}><div style={{ ...displayStyle, fontSize: 16, fontWeight: 800 }}>{draftName || "chronista"}<span style={{ marginLeft: 6, opacity: 0.5 }}>＋</span></div></OptionCard>)}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}><input type="color" value={custom.displayNameColor} disabled={!isMe} onChange={(e) => patchCustom("displayNameColor", e.target.value)} style={{ width: 46, height: 34, padding: 0, border: 0, background: "none" }} /><input value={draftName} disabled={!isMe} onChange={(e) => setDraftName(e.target.value)} placeholder="Nome exibido" style={{ flex: 1, border: `1px solid ${T.border}`, background: T.bg1, color: T.textMain, borderRadius: 8, padding: "9px 11px", outline: "none" }} /></div>
                </section>

                <section>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Sobre mim</div>
                  <textarea value={draftAbout} disabled={!isMe} onChange={(e) => setDraftAbout(e.target.value)} placeholder="Escreva algo sobre você…" style={{ width: "100%", minHeight: 72, resize: "vertical", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 8, padding: 10, color: T.textMain, outline: "none" }} />
                </section>
              </div>
            </div>
          )}

          {tab === "mural" && <>
            {isMe && <div style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}><textarea value={postDraft} onChange={(e)=>setPostDraft(e.target.value)} placeholder="No que você está pensando?" style={{ width: "100%", minHeight: 68, resize: "vertical", background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 8, padding: 10, color: T.textMain, outline: "none" }} /><div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><button onClick={savePost} style={{ border: 0, background: themeColor, color: T.text, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700 }}>Publicar</button></div></div>}
            {posts.map((post)=><div key={post.id} style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><strong style={displayStyle}>{draftName}</strong><span style={{ color: T.textFaint, fontSize: 10.5 }}>{post.time}</span></div><div style={{ lineHeight: 1.5, color: T.textDim }}>{post.text}</div></div>)}
            {!posts.length && <div style={{ color: T.textFaint, padding: 16, border: `1px dashed ${T.border}`, borderRadius: 12 }}>Este mural ainda está vazio.</div>}
          </>}

          {tab === "atividade" && <div style={{ display: "grid", gap: 12 }}><div style={{ padding: 16, background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 12 }}><div style={{ fontWeight: 700, marginBottom: 4 }}>Atividade recente</div><div style={{ color: T.textFaint, fontSize: 12.5 }}>As próximas atividades do usuário aparecerão aqui.</div></div></div>}

          {tab === "desejos" && <div style={{ display: "grid", gap: 14 }}>
            {[['favorite','Jogos que eu gosto',favoriteGames],['want','Quero jogar',wantGames]].map(([type,title,list])=><div key={type} style={{ background:T.bg2,border:`1px solid ${T.border}`,borderRadius:12,padding:14 }}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><div><div style={{fontWeight:700}}>{title}</div><div style={{fontSize:11,color:T.textFaint}}>Adicionar até 20 jogos</div></div>{isMe&&<button onClick={()=>{setGameTarget(type==='favorite'?'favorite':'want');setTab('desejos');setGameInput(gameInput);}} style={{border:`1px solid ${T.border}`,background:T.bg1,color:T.textMain,borderRadius:8,width:34,height:34,cursor:'pointer'}}><Icon name="plus" size={15}/></button>}</div><div style={{display:'flex',flexWrap:'wrap',gap:8}}>{list.map((game,i)=><button key={`${game}-${i}`} onClick={()=>removeGame(type==='favorite'?'favorite':'want',i)} disabled={!isMe} style={{border:`1px solid ${T.border}`,background:T.bg3,color:T.textMain,borderRadius:8,padding:'8px 10px',cursor:isMe?'pointer':'default'}}>{game}</button>)}</div>{isMe&&<div style={{display:'flex',gap:8,marginTop:10}}><input value={gameTarget===(type==='favorite'?'favorite':'want')?gameInput:''} onChange={e=>{setGameTarget(type==='favorite'?'favorite':'want');setGameInput(e.target.value)}} onKeyDown={e=>e.key==='Enter'&&addGame()} placeholder="Nome do jogo" style={{flex:1,border:`1px solid ${T.border}`,background:T.bg1,color:T.textMain,borderRadius:8,padding:'8px 10px',outline:'none'}}/><button onClick={addGame} style={{border:0,background:themeColor,color:T.text,borderRadius:8,padding:'8px 13px',cursor:'pointer'}}>Adicionar</button></div>}</div>)}
          </div>}
        </div>
      </div>
    </div>
  );
}
