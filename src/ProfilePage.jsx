import React, { useEffect, useMemo, useState } from "react";

function profileKey(profile) {
  return String(profile?.id || profile?.userId || profile?.name || "me").replace(/[^a-zA-Z0-9_-]/g, "_");
}

function defaultProfileData(profile) {
  return {
    intro: profile?.about || "",
    posts: [],
    activity: [],
    favoriteGames: [],
    wantGames: [],
    widgets: ["favoriteGames", "wantGames"],
  };
}

export default function ProfilePage({ profile, isMe, T, themeColor, onClose, onEditProfile }) {
  const storageKey = `cc_profile_page_v1_${profileKey(profile)}`;
  const [tab, setTab] = useState("mural");
  const [data, setData] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? { ...defaultProfileData(profile), ...JSON.parse(raw) } : defaultProfileData(profile);
    } catch {
      return defaultProfileData(profile);
    }
  });
  const [postDraft, setPostDraft] = useState("");
  const [gameDraft, setGameDraft] = useState("");
  const [wantDraft, setWantDraft] = useState("");
  const [widgetPicker, setWidgetPicker] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch {}
  }, [storageKey, data]);

  const name = profile?.name || "Usuário";
  const avatar = profile?.imgSrc || null;
  const role = profile?.role || "Cronista";
  const status = profile?.status || "offline";
  const accent = themeColor || T.color;
  const cover = profile?.banner || null;

  const activeWidgets = useMemo(() => data.widgets || [], [data.widgets]);

  function addPost() {
    const text = postDraft.trim();
    if (!isMe || !text) return;
    setData((old) => ({
      ...old,
      posts: [{ id: Date.now(), text, createdAt: new Date().toISOString() }, ...(old.posts || [])],
    }));
    setPostDraft("");
  }

  function addGame(type) {
    const value = (type === "favorite" ? gameDraft : wantDraft).trim();
    if (!isMe || !value) return;
    setData((old) => ({
      ...old,
      [type === "favorite" ? "favoriteGames" : "wantGames"]: [
        ...(old[type === "favorite" ? "favoriteGames" : "wantGames"] || []),
        { id: Date.now(), title: value },
      ],
    }));
    type === "favorite" ? setGameDraft("") : setWantDraft("");
  }

  function removeGame(type, id) {
    if (!isMe) return;
    const field = type === "favorite" ? "favoriteGames" : "wantGames";
    setData((old) => ({ ...old, [field]: (old[field] || []).filter((x) => x.id !== id) }));
  }

  function toggleWidget(widget) {
    setData((old) => {
      const current = old.widgets || [];
      return { ...old, widgets: current.includes(widget) ? current.filter((x) => x !== widget) : [...current, widget] };
    });
    setWidgetPicker(false);
  }

  const card = {
    background: T.bg2,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    boxShadow: "0 14px 35px rgba(0,0,0,.18)",
  };

  return (
    <div className="cc-profile-page" style={{ position: "absolute", inset: 0, zIndex: 120, background: T.bg0, color: T.textMain, overflowY: "auto" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 4, height: 54, display: "flex", alignItems: "center", gap: 12, padding: "0 18px", background: `${T.bg0}ee`, backdropFilter: "blur(14px)", borderBottom: `1px solid ${T.border}` }}>
        <button onClick={onClose} style={{ border: `1px solid ${T.border}`, background: T.bg1, color: T.textMain, borderRadius: 8, padding: "7px 11px", cursor: "pointer" }}>Voltar</button>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>Perfil</div>
        <div style={{ flex: 1 }} />
        {isMe && <button onClick={onEditProfile} style={{ border: 0, background: accent, color: T.text, borderRadius: 8, padding: "8px 12px", fontWeight: 650, cursor: "pointer" }}>Editar perfil</button>}
      </div>

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "18px 18px 40px" }}>
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ height: 200, background: cover ? `url(${cover}) center/cover` : `linear-gradient(120deg, ${accent}55, ${T.bg5}, ${T.bg1})`, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.45), transparent 55%)" }} />
          </div>
          <div style={{ padding: "0 26px 18px", marginTop: -48, position: "relative" }}>
            <div style={{ width: 92, height: 92, borderRadius: "50%", overflow: "hidden", border: `5px solid ${T.bg2}`, background: profile?.color || accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {avatar ? <img src={avatar} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 28, fontWeight: 800, color: T.text }}>{name.slice(0,2).toUpperCase()}</span>}
            </div>
            <div style={{ marginTop: 9, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 800 }}>{name}</div>
                <div style={{ color: T.textFaint, marginTop: 2 }}>{role}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, color: T.textDim, fontSize: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: ({ online: "#3FD9BE", idle: "#E8A33D", dnd: "#E2574C", offline: "#6A6390" }[status] || "#6A6390") }} />
                  <span>{status === "online" ? "online" : status === "idle" ? "ausente" : status === "dnd" ? "não perturbe" : "offline"}</span>
                </div>
              </div>
              {!isMe && <button style={{ border: `1px solid ${T.border}`, background: T.bg1, color: T.textMain, borderRadius: 8, padding: "8px 13px", cursor: "pointer" }}>Mensagem</button>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 3, padding: "0 18px", borderTop: `1px solid ${T.border}` }}>
            {[['mural','Mural'],['atividade','Atividade'],['desejos','Lista de desejos']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} style={{ border: 0, borderBottom: `2px solid ${tab === id ? accent : "transparent"}`, background: "transparent", color: tab === id ? T.textMain : T.textDim, padding: "14px 14px 12px", cursor: "pointer", fontWeight: 650 }}>{label}</button>
            ))}
          </div>
        </div>

        {tab === "mural" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(260px,.65fr)", gap: 14, marginTop: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {isMe && <div style={{ ...card, padding: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 9 }}>No que você está pensando?</div>
                <textarea value={postDraft} onChange={(e) => setPostDraft(e.target.value)} placeholder="Compartilhe algo com seus amigos..." style={{ width: "100%", minHeight: 88, resize: "vertical", boxSizing: "border-box", background: T.bg1, border: `1px solid ${T.border}`, color: T.textMain, borderRadius: 9, padding: 10, outline: "none" }} />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 9 }}><button onClick={addPost} style={{ border: 0, background: accent, color: T.text, borderRadius: 8, padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}>Publicar</button></div>
              </div>}
              {(data.posts || []).map((post) => (
                <div key={post.id} style={{ ...card, padding: 16 }}>
                  <div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 10 }}><div style={{ width: 34, height: 34, borderRadius: "50%", background: profile?.color || accent, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: T.text, fontWeight: 750 }}>{avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : name.slice(0,2).toUpperCase()}</div><div><div style={{ fontWeight: 700 }}>{name}</div><div style={{ fontSize: 11, color: T.textFaint }}>{new Date(post.createdAt).toLocaleString("pt-BR")}</div></div></div>
                  <div style={{ color: T.textDim, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{post.text}</div>
                </div>
              ))}
              {!data.posts?.length && <div style={{ ...card, padding: 24, color: T.textFaint, textAlign: "center" }}>Este mural ainda está vazio.</div>}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ ...card, padding: 16 }}>
                <div style={{ fontWeight: 750, marginBottom: 7 }}>Sobre mim</div>
                <div style={{ color: T.textDim, lineHeight: 1.55 }}>{data.intro || "Nada informado ainda."}</div>
              </div>

              <div style={{ ...card, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ fontWeight: 750, flex: 1 }}>Seus Widgets</div>
                  {isMe && <button onClick={() => setWidgetPicker((v) => !v)} style={{ border: `1px solid ${T.border}`, background: T.bg1, color: T.textMain, borderRadius: 7, padding: "7px 10px", cursor: "pointer" }}>＋ Adicionar widget</button>}
                </div>
                {widgetPicker && isMe && <div style={{ marginBottom: 12, padding: 10, background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 8 }}>{[["favoriteGames","Jogos que eu gosto"],["wantGames","Quero jogar"]].map(([id,label]) => <button key={id} onClick={() => toggleWidget(id)} style={{ marginRight: 7, marginBottom: 7, border: `1px solid ${T.border}`, background: activeWidgets.includes(id) ? `${accent}22` : "transparent", color: T.textMain, borderRadius: 7, padding: "7px 10px", cursor: "pointer" }}>{activeWidgets.includes(id) ? "✓ " : ""}{label}</button>)}</div>}

                {activeWidgets.includes("favoriteGames") && <div style={{ marginBottom: 14, padding: 12, background: T.bg1, borderRadius: 9 }}>
                  <div style={{ fontWeight: 700 }}>Jogos que eu gosto</div><div style={{ color: T.textFaint, fontSize: 11, marginBottom: 10 }}>Adicione até 20 jogos</div>
                  {isMe && <div style={{ display: "flex", gap: 7, marginBottom: 9 }}><input value={gameDraft} onChange={(e)=>setGameDraft(e.target.value)} onKeyDown={(e)=>e.key === "Enter" && addGame("favorite")} placeholder="Nome do jogo" style={{ flex:1, minWidth:0, background:T.bg2, border:`1px solid ${T.border}`, color:T.textMain, borderRadius:7, padding:"8px 10px", outline:"none" }}/><button onClick={()=>addGame("favorite")} style={{ border:0, background:accent, color:T.text, borderRadius:7, padding:"0 10px", cursor:"pointer" }}>＋</button></div>}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 8 }}>{(data.favoriteGames || []).map((g) => <div key={g.id} title={g.title} style={{ minWidth:0, padding:10, minHeight:44, borderRadius:8, background:T.bg2, border:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", textAlign:"center", fontSize:11.5, position:"relative" }}>{g.title}{isMe && <button onClick={()=>removeGame("favorite",g.id)} style={{ position:"absolute", top:3, right:3, border:0, background:"transparent", color:T.textFaint, cursor:"pointer" }}>×</button>}</div>)}</div>
                </div>}

                {activeWidgets.includes("wantGames") && <div style={{ padding: 12, background: T.bg1, borderRadius: 9 }}>
                  <div style={{ fontWeight: 700 }}>Quero jogar</div><div style={{ color: T.textFaint, fontSize: 11, marginBottom: 10 }}>Adicione até 20 jogos</div>
                  {isMe && <div style={{ display: "flex", gap: 7, marginBottom: 9 }}><input value={wantDraft} onChange={(e)=>setWantDraft(e.target.value)} onKeyDown={(e)=>e.key === "Enter" && addGame("want")} placeholder="Nome do jogo" style={{ flex:1, minWidth:0, background:T.bg2, border:`1px solid ${T.border}`, color:T.textMain, borderRadius:7, padding:"8px 10px", outline:"none" }}/><button onClick={()=>addGame("want")} style={{ border:0, background:accent, color:T.text, borderRadius:7, padding:"0 10px", cursor:"pointer" }}>＋</button></div>}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>{(data.wantGames || []).map((g) => <div key={g.id} title={g.title} style={{ minWidth:0, padding:10, minHeight:44, borderRadius:8, background:T.bg2, border:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", textAlign:"center", fontSize:11.5, position:"relative" }}>{g.title}{isMe && <button onClick={()=>removeGame("want",g.id)} style={{ position:"absolute", top:3, right:3, border:0, background:"transparent", color:T.textFaint, cursor:"pointer" }}>×</button>}</div>)}</div>
                </div>}
              </div>
            </div>
          </div>
        )}

        {tab === "atividade" && <div style={{ ...card, padding: 18, marginTop: 14 }}><div style={{ fontWeight: 750, marginBottom: 12 }}>Atividade</div>{(data.activity || []).length ? data.activity.map((a) => <div key={a.id} style={{ padding: "11px 0", borderBottom: `1px solid ${T.border}`, color:T.textDim }}>{a.text}</div>) : <div style={{ color:T.textFaint, textAlign:"center", padding:"22px 0" }}>Nenhuma atividade compartilhada ainda.</div>}</div>}

        {tab === "desejos" && <div style={{ ...card, padding: 18, marginTop: 14 }}><div style={{ fontWeight: 750, marginBottom: 12 }}>Lista de desejos</div>{isMe && <div style={{ display:"flex", gap:7, marginBottom:12 }}><input value={wantDraft} onChange={(e)=>setWantDraft(e.target.value)} onKeyDown={(e)=>e.key === "Enter" && addGame("want")} placeholder="Adicionar jogo..." style={{flex:1, background:T.bg1, border:`1px solid ${T.border}`, color:T.textMain, borderRadius:8, padding:"9px 10px", outline:"none"}}/><button onClick={()=>addGame("want")} style={{border:0, background:accent, color:T.text, borderRadius:8, padding:"0 13px", cursor:"pointer"}}>Adicionar</button></div>}{(data.wantGames || []).map((g)=><div key={g.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}><div style={{width:8,height:8,borderRadius:"50%",background:accent}}/><span style={{flex:1}}>{g.title}</span>{isMe && <button onClick={()=>removeGame("want",g.id)} style={{border:0,background:"transparent",color:T.textFaint,cursor:"pointer"}}>Remover</button>}</div>)}{!data.wantGames?.length && <div style={{color:T.textFaint,textAlign:"center",padding:"20px 0"}}>Sua lista de desejos está vazia.</div>}</div>}
      </div>
    </div>
  );
}
