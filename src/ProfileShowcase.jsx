import React from "react";
import "./profile-showcase.css";

function Icon({ name, size = 18 }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    message: <><path d="M3.5 4.5h13v9h-8l-3.5 3v-3h-1.5z" {...p}/></>,
    users: <><circle cx="7" cy="7" r="2.4" {...p}/><path d="M2.8 15c.5-2 1.9-3 4.2-3s3.7 1 4.2 3" {...p}/><path d="M12.5 5.2a2.2 2.2 0 0 1 0 4.3M13.2 12c1.9.2 3.1 1.2 3.5 3" {...p}/></>,
    music: <><path d="M7 14.2V4.5l8-1.8v9.8" {...p}/><circle cx="5.5" cy="14.7" r="2" {...p}/><circle cx="13.5" cy="12.8" r="2" {...p}/></>,
    plus: <><line x1="10" y1="4" x2="10" y2="16" {...p}/><line x1="4" y1="10" x2="16" y2="10" {...p}/></>,
    edit: <path d="M13.4 3.6a1.7 1.7 0 0 1 2.4 2.4L6.5 15.3l-3.2.8.8-3.2 9.3-9.3Z" {...p}/>,
  };
  return <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">{paths[name]}</svg>;
}

function gameVisual(title, index, themeColor) {
  const palettes = [
    ["#2b1c54", "#8f4cff"], ["#1b3a54", "#42b9ff"], ["#55301d", "#ff8d48"],
    ["#24351e", "#7fd35c"], ["#3d1e34", "#ef5ca8"], ["#17213d", "#6b8cff"],
  ];
  const [a, b] = palettes[index % palettes.length];
  return { background: `linear-gradient(145deg, ${a}, ${b})`, title };
}

export default function ProfileShowcase({
  T,
  themeColor,
  isMe,
  profile,
  favoriteGames,
  wantGames,
  onAddGame,
  onEditProfile,
}) {
  const games = (favoriteGames || []).slice(0, 20);
  const tags = Array.isArray(profile?.tags) && profile.tags.length ? profile.tags : ["ChronoCord", "Comunidade", "Voz", "Gaming"];
  const spotify = profile?.spotify;
  return (
    <div className="cc-profile-showcase" style={{ display: "grid", gridTemplateColumns: "minmax(250px, 0.9fr) minmax(0, 1.6fr)", gap: 16, marginBottom: 22 }}>
      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        <section style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.textFaint, textTransform: "uppercase", letterSpacing: .7, marginBottom: 8 }}>Sobre</div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: T.textDim }}>{profile?.about || "Ainda não adicionou uma descrição. Personalize seu perfil para contar um pouco sobre você."}</div>
          <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 7 }}>{tags.map((tag, i) => <span key={`${tag}-${i}`} style={{ border: `1px solid ${T.border}`, background: T.bg1, borderRadius: 999, padding: "5px 9px", fontSize: 11.5, color: T.textDim }}>{tag}</span>)}</div>
        </section>
        <section style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 800, color: T.textFaint, textTransform: "uppercase", letterSpacing: .7 }}>Conexões</div>{isMe && <button onClick={onEditProfile} style={{ border: 0, background: "none", color: themeColor, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11.5 }}><Icon name="edit" size={13}/>Editar</button>}</div>
          <div style={{ display: "grid", gap: 8 }}>{isMe && <button onClick={onEditProfile} style={{ border: `1px solid ${T.border}`, background: T.bg1, color: T.textMain, borderRadius: 9, padding: "9px 11px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}><Icon name="users" size={15}/><span style={{fontSize:12.5}}>Gerenciar conexões</span></button>}{!isMe && <button style={{ border: 0, background: themeColor, color: T.text, borderRadius: 9, padding: "9px 11px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}><Icon name="message" size={15}/><span style={{fontSize:12.5}}>Enviar mensagem</span></button>}</div>
        </section>
      </div>

      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        <section style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><div><div style={{ fontSize: 15, fontWeight: 800 }}>Jogos que eu gosto</div><div style={{ fontSize: 11.5, color: T.textFaint }}>Adicionar até 20 jogos</div></div>{isMe && <button onClick={onAddGame} aria-label="Adicionar jogo" style={{ width: 34, height: 34, border: `1px solid ${T.border}`, background: T.bg1, borderRadius: 9, color: T.textMain, cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="plus" size={16}/></button>}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 }}>
            {games.map((game, index) => { const text=String(game); const parts=text.split("|"); const title=parts[0].trim(); const image=parts[1]?.trim(); const visual=gameVisual(title,index,themeColor); return <div key={`${title}-${index}`} style={{ minWidth: 0 }} title={title}><div style={{ aspectRatio: "0.78", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}`, background: visual.background, position: "relative", boxShadow: "0 10px 24px rgba(0,0,0,.2)" }}>{image?<img src={image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{position:"absolute",inset:0,padding:9,display:"flex",alignItems:"flex-end",background:"linear-gradient(180deg, transparent 35%, rgba(0,0,0,.68))"}}><span style={{color:"#fff",fontWeight:800,fontSize:11.5,lineHeight:1.2}}>{title}</span></div>}</div>{image&&<div style={{fontSize:11.5,color:T.textDim,marginTop:5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{title}</div>}</div>;})}
            {games.length===0&&<div style={{gridColumn:"1 / -1",padding:"30px 16px",textAlign:"center",border:`1px dashed ${T.border}`,borderRadius:10,color:T.textFaint,fontSize:12.5}}>Nenhum jogo adicionado ainda.</div>}
          </div>
        </section>
        <section style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}><div style={{ fontSize: 15, fontWeight: 800 }}>Ouvindo no Spotify</div><Icon name="music" size={16} color="#6ee7a2"/></div>
          {spotify?.title?<div style={{display:"flex",gap:12,alignItems:"center"}}><div style={{width:72,height:72,borderRadius:10,overflow:"hidden",background:T.bg1,flexShrink:0}}>{spotify.image?<img src={spotify.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{width:"100%",height:"100%",display:"grid",placeItems:"center",color:"#6ee7a2"}}><Icon name="music" size={26}/></div>}</div><div style={{minWidth:0,flex:1}}><div style={{fontWeight:800,fontSize:14.5,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{spotify.title}</div><div style={{color:T.textDim,fontSize:12,marginTop:3}}>{spotify.artist||"Artista"}</div><div style={{height:5,background:T.bg1,borderRadius:999,marginTop:13,overflow:"hidden"}}><div style={{width:`${Math.max(5,Math.min(100,Number(spotify.progress)||42))}%`,height:"100%",background:"#6ee7a2"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:10.5,color:T.textFaint,marginTop:4}}><span>{spotify.elapsed||"01:35"}</span><span>{spotify.duration||"02:25"}</span></div></div></div>:<div style={{padding:"15px 0",color:T.textFaint,fontSize:12.5}}>Nenhuma música sendo compartilhada no momento.</div>}
        </section>
        <section style={{ background: T.bg2, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Coleção</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{[["Kitsune","#ff8f3d"],["Guardian","#f4cf55"],["Jail Mod","#8c8f98"],["Afterlife","#a34dff"],["Solborn","#9ca5ff"],["+9","#444a59"]].map(([label,color])=><div key={label} style={{border:`1px solid ${T.border}`,background:T.bg1,borderRadius:999,padding:"7px 11px",fontSize:12.5,display:"flex",alignItems:"center",gap:7}}><span style={{width:10,height:10,borderRadius:"50%",background:color,boxShadow:`0 0 9px ${color}66`}}/>{label}</div>)}</div>
        </section>
      </div>
      {isMe&&<button onClick={onEditProfile} style={{gridColumn:"1 / -1",border:0,background:themeColor,color:T.text,borderRadius:11,padding:"12px 14px",cursor:"pointer",fontWeight:800,fontSize:14}}>✎ Editar perfil</button>}
    </div>
  );
}
