import React, { useMemo, useState } from "react";

function statusLabel(status) {
  if (status === "online") return "Disponível";
  if (status === "idle") return "Ausente";
  if (status === "dnd") return "Não perturbe";
  return "Ausente";
}

export default function FriendsHome({ friends = [], T, themeColor, myName, onAddFriend, onOpenProfile, onOpenChat, section = "friends" }) {
  const [filter, setFilter] = useState("");
  const visible = useMemo(() => {
    const normalized = filter.trim().toLowerCase();
    return friends.filter((f) => !normalized || String(f.name || "").toLowerCase().includes(normalized));
  }, [friends, filter]);

  const online = visible.filter((f) => f.status === "online" || f.status === "idle" || f.status === "dnd");
  const all = visible;

  if (section !== "friends") {
    const titles = {
      requests: ["Solicitações de mensagens", "Gerencie convites e novas solicitações de conversa."],
      nitro: ["Nitro", "Personalize ainda mais sua experiência no ChronoCord."],
      store: ["Loja", "Em breve: temas, decorações e extras para o seu perfil."],
      quests: ["Missões", "Conclua missões para desbloquear recompensas e personalizações."],
    };
    const [title, subtitle] = titles[section] || titles.friends || ["Amigos", ""];
    return (
      <div className="cc-friends-home">
        <div className="cc-friends-toolbar">
          <div className="cc-friends-title"><span className="cc-friends-title-icon">◖</span>{title}</div>
          {section === "requests" && <button className="cc-friends-primary" onClick={onAddFriend}>Adicionar amigo</button>}
        </div>
        <div className="cc-friends-empty-card">
          <div className="cc-friends-empty-icon">✦</div>
          <div className="cc-friends-empty-title">{title}</div>
          <div className="cc-friends-empty-text">{subtitle}</div>
          {section === "requests" && <button className="cc-friends-primary" onClick={onAddFriend}>Adicionar amigo</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="cc-friends-home">
      <div className="cc-friends-toolbar">
        <div className="cc-friends-tabs">
          <div className="cc-friends-title"><span className="cc-friends-title-icon">◖</span>Amigos</div>
          <button className="cc-friends-tab is-active">Disponível</button>
          <button className="cc-friends-tab">Todos</button>
        </div>
        <button className="cc-friends-primary" onClick={onAddFriend}>Adicionar amigo</button>
      </div>

      <div className="cc-friends-search-wrap">
        <span className="cc-friends-search-icon">⌕</span>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar" aria-label="Buscar amigos" />
      </div>

      <div className="cc-friends-layout">
        <section className="cc-friends-list-panel">
          <div className="cc-friends-section-label">Online — {online.length}</div>
          {online.map((f) => (
            <div className="cc-friend-row" key={f.id} onDoubleClick={() => onOpenChat(f.id)}>
              <div className="cc-friend-avatar-wrap" onClick={() => onOpenProfile?.(f)}>
                <img src={f.imgSrc || "/assets/chronocord-default-avatar.svg"} alt="" className="cc-friend-avatar" />
                <span className="cc-friend-status" data-status={f.status || "offline"} />
              </div>
              <div className="cc-friend-info">
                <div className="cc-friend-name">{f.name || "Usuário"}</div>
                <div className="cc-friend-activity">{f.activity || statusLabel(f.status)}</div>
              </div>
              <div className="cc-friend-actions">
                <button title="Mensagem" onClick={() => onOpenChat(f.id)}>●</button>
                <button title="Mais opções">⋮</button>
              </div>
            </div>
          ))}
          {!online.length && <div className="cc-friends-no-results">Nenhum amigo disponível agora.</div>}

          <div className="cc-friends-section-divider" />
          <div className="cc-friends-section-label">Todos — {all.length}</div>
          {all.filter((f) => !online.includes(f)).map((f) => (
            <div className="cc-friend-row" key={f.id} onDoubleClick={() => onOpenChat(f.id)}>
              <div className="cc-friend-avatar-wrap" onClick={() => onOpenProfile?.(f)}>
                <img src={f.imgSrc || "/assets/chronocord-default-avatar.svg"} alt="" className="cc-friend-avatar" />
                <span className="cc-friend-status" data-status={f.status || "offline"} />
              </div>
              <div className="cc-friend-info">
                <div className="cc-friend-name">{f.name || "Usuário"}</div>
                <div className="cc-friend-activity">{f.activity || statusLabel(f.status)}</div>
              </div>
              <div className="cc-friend-actions">
                <button title="Mensagem" onClick={() => onOpenChat(f.id)}>●</button>
                <button title="Mais opções">⋮</button>
              </div>
            </div>
          ))}
        </section>

        <aside className="cc-friends-now-panel">
          <div className="cc-friends-now-title">Ativo agora</div>
          <div className="cc-friends-now-card">
            {online.slice(0, 4).map((f) => (
              <div className="cc-friends-now-item" key={f.id} onClick={() => onOpenChat(f.id)}>
                <img src={f.imgSrc || "/assets/chronocord-default-avatar.svg"} alt="" />
                <div className="cc-friends-now-copy">
                  <div>{f.name || "Usuário"}</div>
                  <span>{f.activity || statusLabel(f.status)}</span>
                </div>
                <span className="cc-friends-now-dot" />
              </div>
            ))}
            {!online.length && <div className="cc-friends-now-empty">Nenhum amigo está ativo agora.</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
