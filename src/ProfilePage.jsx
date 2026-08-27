import React, { useEffect, useMemo, useState } from "react";
import './profile/profilePage.css';

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

function activityText(activity) {
  if (typeof activity === 'string') return activity;
  return activity?.text || activity?.title || activity?.name || activity?.label || '';
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
  const avatar = profile?.imgSrc || profile?.avatar || null;
  const role = profile?.role || "Cronista";
  const status = profile?.status || "offline";
  const accent = themeColor || T.color || '#9b4dff';
  const cover = typeof profile?.banner === 'string' ? profile.banner : profile?.banner?.src || null;
  const activeWidgets = useMemo(() => data.widgets || [], [data.widgets]);

  const cardStyle = { background: T.bg2, border: `1px solid ${T.border}` };
  const inputStyle = { background: T.bg1, border: `1px solid ${T.border}`, color: T.textMain };
  const secondaryButtonStyle = { background: T.bg1, color: T.textMain, borderColor: T.border };
  const statusColor = ({ online: "#3FD9BE", idle: "#E8A33D", dnd: "#E2574C", offline: "#6A6390" }[status] || "#6A6390");
  const statusLabel = status === "online" ? "online" : status === "idle" ? "ausente" : status === "dnd" ? "não perturbe" : "offline";

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
    const field = type === "favorite" ? "favoriteGames" : "wantGames";
    setData((old) => {
      const current = old[field] || [];
      if (current.length >= 20) return old;
      return { ...old, [field]: [...current, { id: Date.now(), title: value }] };
    });
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

  function GameWidget({ type, title, subtitle, items, draft, setDraft }) {
    return <div className="cc-profile-page-widget" style={{ background: T.bg1 }}>
      <div className="cc-profile-page-panel-title">{title}</div>
      <div className="cc-profile-page-widget-sub">{subtitle}</div>
      {isMe && <div className="cc-profile-page-inline-form">
        <input className="cc-profile-page-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGame(type)} placeholder="Nome do jogo" style={{ ...inputStyle, background: T.bg2 }} />
        <button type="button" className="cc-profile-page-button is-primary" onClick={() => addGame(type)} style={{ background: accent }}>＋</button>
      </div>}
      {items.length ? <div className="cc-profile-page-game-grid">
        {items.map((game) => <div className="cc-profile-page-game" key={game.id} title={game.title} style={{ background: T.bg2, border: `1px solid ${T.border}` }}>
          {game.title}
          {isMe && <button type="button" className="cc-profile-page-game-remove" onClick={() => removeGame(type, game.id)} style={{ color: T.textFaint }} aria-label={`Remover ${game.title}`}>×</button>}
        </div>)}
      </div> : <div className="cc-profile-page-empty" style={{ color: T.textFaint }}>Nenhum jogo adicionado.</div>}
    </div>;
  }

  return (
    <div className="cc-profile-page" style={{ '--cc-profile-accent': accent, position: "absolute", inset: 0, zIndex: 120, background: T.bg0, color: T.textMain, overflowY: "auto" }}>
      <header className="cc-profile-page-header" style={{ background: `${T.bg0}ee`, borderColor: T.border }}>
        <button type="button" className="cc-profile-page-button" onClick={onClose} style={secondaryButtonStyle}>← Voltar</button>
        <div className="cc-profile-page-header-title">Perfil</div>
        <div className="cc-profile-page-header-spacer" />
        {isMe && <button type="button" className="cc-profile-page-button is-primary" onClick={onEditProfile} style={{ background: accent, color: T.text }}>Editar perfil</button>}
      </header>

      <main className="cc-profile-page-content">
        <section className="cc-profile-page-card" style={cardStyle}>
          <div className="cc-profile-page-hero" style={{ backgroundImage: cover ? `url(${cover})` : `linear-gradient(125deg, ${accent}88, ${T.bg5}, ${T.bg1})` }} />
          <div className="cc-profile-page-identity">
            <div className="cc-profile-page-avatar" style={{ background: profile?.color || accent, color: T.bg2, borderColor: T.bg2 }}>
              {avatar ? <img src={avatar} alt={name} /> : <span style={{ color: T.text }}>{name.slice(0,2).toUpperCase()}</span>}
            </div>
            <div className="cc-profile-page-heading">
              <div className="cc-profile-page-heading-main">
                <div className="cc-profile-page-name">{name}</div>
                <div className="cc-profile-page-role" style={{ color: T.textFaint }}>{role}</div>
                <div className="cc-profile-page-presence" style={{ color: T.textDim }}>
                  <span className="cc-profile-page-presence-dot" style={{ background: statusColor }} />
                  <span>{statusLabel}</span>
                </div>
              </div>
              {!isMe && <button type="button" className="cc-profile-page-button" style={secondaryButtonStyle}>Mensagem</button>}
            </div>
          </div>

          <nav className="cc-profile-page-tabs" aria-label="Seções do perfil" style={{ borderColor: T.border }}>
            {[["mural","Mural"],["atividade","Atividade"],["desejos","Lista de desejos"]].map(([id, label]) => (
              <button type="button" key={id} onClick={() => setTab(id)} className={`cc-profile-page-tab ${tab === id ? 'is-active' : ''}`} style={{ color: tab === id ? T.textMain : T.textDim }}>{label}</button>
            ))}
          </nav>
        </section>

        {tab === "mural" && <div className="cc-profile-page-grid">
          <div className="cc-profile-page-stack">
            {isMe && <section className="cc-profile-page-panel cc-profile-page-card" style={cardStyle}>
              <div className="cc-profile-page-panel-title">No que você está pensando?</div>
              <textarea className="cc-profile-page-textarea" value={postDraft} onChange={(e) => setPostDraft(e.target.value)} placeholder="Compartilhe algo com seus amigos..." style={inputStyle} />
              <div className="cc-profile-page-actions"><button type="button" className="cc-profile-page-button is-primary" onClick={addPost} style={{ background: accent, color: T.text }}>Publicar</button></div>
            </section>}

            {(data.posts || []).map((post) => <article className="cc-profile-page-panel cc-profile-page-card" key={post.id} style={cardStyle}>
              <div className="cc-profile-page-post-head">
                <div className="cc-profile-page-mini-avatar" style={{ background: profile?.color || accent, color: T.text }}>
                  {avatar ? <img src={avatar} alt="" /> : name.slice(0,2).toUpperCase()}
                </div>
                <div><strong>{name}</strong><div className="cc-profile-page-post-time" style={{ color: T.textFaint }}>{new Date(post.createdAt).toLocaleString("pt-BR")}</div></div>
              </div>
              <div className="cc-profile-page-post-copy" style={{ color: T.textDim }}>{post.text}</div>
            </article>)}
            {!data.posts?.length && <div className="cc-profile-page-panel cc-profile-page-card cc-profile-page-empty" style={{ ...cardStyle, color: T.textFaint }}>Este mural ainda está vazio.</div>}
          </div>

          <aside className="cc-profile-page-stack">
            <section className="cc-profile-page-panel cc-profile-page-card" style={cardStyle}>
              <div className="cc-profile-page-panel-title">Sobre mim</div>
              <div style={{ color: T.textDim, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{data.intro || "Nada informado ainda."}</div>
            </section>

            <section className="cc-profile-page-panel cc-profile-page-card" style={cardStyle}>
              <div className="cc-profile-page-widget-head"><strong>Seus Widgets</strong>{isMe && <button type="button" className="cc-profile-page-button" onClick={() => setWidgetPicker((value) => !value)} style={secondaryButtonStyle}>＋ Adicionar widget</button>}</div>
              {widgetPicker && isMe && <div className="cc-profile-page-widget-picker" style={{ background: T.bg1, border: `1px solid ${T.border}` }}>
                {[["favoriteGames","Jogos que eu gosto"],["wantGames","Quero jogar"]].map(([id,label]) => <button type="button" key={id} onClick={() => toggleWidget(id)} className="cc-profile-page-chip-button" style={{ color: T.textMain, borderColor: T.border, background: activeWidgets.includes(id) ? `${accent}22` : "transparent" }}>{activeWidgets.includes(id) ? "✓ " : ""}{label}</button>)}
              </div>}
              {activeWidgets.includes("favoriteGames") && <GameWidget type="favorite" title="Jogos que eu gosto" subtitle="Adicione até 20 jogos" items={data.favoriteGames || []} draft={gameDraft} setDraft={setGameDraft} />}
              {activeWidgets.includes("wantGames") && <GameWidget type="want" title="Quero jogar" subtitle="Adicione até 20 jogos" items={data.wantGames || []} draft={wantDraft} setDraft={setWantDraft} />}
            </section>
          </aside>
        </div>}

        {tab === "atividade" && <section className="cc-profile-page-panel cc-profile-page-card cc-profile-page-page-panel" style={cardStyle}>
          <div className="cc-profile-page-panel-title">Atividade</div>
          {(data.activity || []).length ? (data.activity || []).map((activity, index) => <div className="cc-profile-page-activity-row" key={activity?.id || `${activityText(activity)}-${index}`} style={{ color: T.textDim, borderColor: T.border }}>{activityText(activity)}</div>) : <div className="cc-profile-page-empty" style={{ color: T.textFaint }}>Nenhuma atividade compartilhada ainda.</div>}
        </section>}

        {tab === "desejos" && <section className="cc-profile-page-panel cc-profile-page-card cc-profile-page-page-panel" style={cardStyle}>
          <div className="cc-profile-page-panel-title">Lista de desejos</div>
          {isMe && <div className="cc-profile-page-inline-form">
            <input className="cc-profile-page-input" value={wantDraft} onChange={(e) => setWantDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGame("want")} placeholder="Adicionar jogo..." style={inputStyle} />
            <button type="button" className="cc-profile-page-button is-primary" onClick={() => addGame("want")} style={{ background: accent, color: T.text }}>Adicionar</button>
          </div>}
          {(data.wantGames || []).map((game) => <div className="cc-profile-page-wish-row" key={game.id} style={{ borderColor: T.border }}>
            <span className="cc-profile-page-wish-dot" />
            <span className="cc-profile-page-wish-title">{game.title}</span>
            {isMe && <button type="button" className="cc-profile-page-button" onClick={() => removeGame("want", game.id)} style={secondaryButtonStyle}>Remover</button>}
          </div>)}
          {!data.wantGames?.length && <div className="cc-profile-page-empty" style={{ color: T.textFaint }}>Sua lista de desejos está vazia.</div>}
        </section>}
      </main>
    </div>
  );
}
