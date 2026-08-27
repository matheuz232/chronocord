import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { chronocordFeatureInteractions } from './build/chronocord-feature-transform.mjs';

function chronocordWebRtcFix() {
  return {
    name: 'chronocord-webrtc-screen-share-fix',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/ChronoCord.jsx') && !id.endsWith('\\src\\ChronoCord.jsx')) return null;
      let output = code;
      let changed = false;
      const signalMarker = "if(data.type==='offer'){";
      const signalReplacement = `if(data.type==='renegotiate-request'){
      if(String(authUser.id)<String(from)){
        try{const offer=await pc.createOffer();await pc.setLocalDescription(offer);socketRef.current?.emit("webrtc-signal",{to:from,data:{type:"offer",sdp:offer}});}catch{}
      }
      return;
    } else if(data.type==='offer'){`;
      if (output.includes(signalMarker) && !output.includes("data.type==='renegotiate-request'")) { output = output.replace(signalMarker, signalReplacement); changed = true; }
      const oldRenegotiate = `async function renegotiatePeers(){
    for(const [peerId,pc] of peerConnectionsRef.current){
      if(String(authUser.id)<String(peerId)){ try{const offer=await pc.createOffer();await pc.setLocalDescription(offer);socketRef.current?.emit("webrtc-signal",{to:peerId,data:{type:"offer",sdp:offer}});}catch{} }
    }
  }`;
      const newRenegotiate = `async function renegotiatePeers(){
    for(const [peerId,pc] of peerConnectionsRef.current){
      try{
        if(String(authUser.id)<String(peerId)){
          const offer=await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit("webrtc-signal",{to:peerId,data:{type:"offer",sdp:offer}});
        } else {
          socketRef.current?.emit("webrtc-signal",{to:peerId,data:{type:"renegotiate-request"}});
        }
      }catch{}
    }
  }`;
      if (output.includes(oldRenegotiate)) { output = output.replace(oldRenegotiate, newRenegotiate); changed = true; }
      const oldPreview = `{voiceCameraOn && <video ref={localVideoRef}`;
      const newPreview = `{(voiceCameraOn || voiceScreenSharing) && <video ref={localVideoRef}`;
      if (output.includes(oldPreview)) { output = output.replace(oldPreview, newPreview); changed = true; }
      if (!changed) throw new Error('ChronoCord WebRTC fix: expected source markers were not found; refusing to build an unpatched screen-share bundle.');
      return { code: output, map: null };
    },
  };
}

function chronocordProductFeatures() {
  return {
    name: 'chronocord-product-features',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/ChronoCord.jsx') && !id.endsWith('\\src\\ChronoCord.jsx')) return null;
      let output = code;
      let changed = false;
      if (!output.includes("import ProfilePage from './ProfilePage.jsx';")) { output = "import ProfilePage from './ProfilePage.jsx';\n" + output; changed = true; }
      const appVersionMarker = 'const APP_VERSION = "1.0.2";';
      if (output.includes(appVersionMarker)) { output = output.replace(appVersionMarker, 'const APP_VERSION = "1.0.3";'); changed = true; }
      const profileStateMarker = 'const [profileModal, setProfileModal] = useState(null);';
      if (output.includes(profileStateMarker) && !output.includes('const [fullProfilePage, setFullProfilePage]')) { output = output.replace(profileStateMarker, `${profileStateMarker}\n  const [fullProfilePage, setFullProfilePage] = useState(null);`); changed = true; }
      const jukeboxQueueMarker = 'const [jukeboxMuted, setJukeboxMuted] = useState(false);';
      if (output.includes(jukeboxQueueMarker) && !output.includes('chronocord.jukebox.queueVisible')) { output = output.replace(jukeboxQueueMarker, `${jukeboxQueueMarker}\n  const [showJukeboxQueue, setShowJukeboxQueue] = useState(() => { try { return localStorage.getItem('chronocord.jukebox.queueVisible') !== 'false'; } catch { return true; } });`); changed = true; }
      const fmtMarker = 'function fmtDuration(sec) { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return `${m}:${String(s).padStart(2, "0")}`; }';
      if (output.includes(fmtMarker) && !output.includes("localStorage.setItem('chronocord.jukebox.queueVisible'")) { output = output.replace(fmtMarker, `${fmtMarker}\n  useEffect(() => { try { localStorage.setItem('chronocord.jukebox.queueVisible', String(showJukeboxQueue)); } catch {} }, [showJukeboxQueue]);`); changed = true; }
      const restrictedMarker = '// ---- canais restritos: só dono/moderador escrevem ----';
      if (output.includes(restrictedMarker) && !output.includes('Watch2Chronos tem prioridade sobre o Jukebox')) { output = output.replace(restrictedMarker, `// Watch2Chronos tem prioridade sobre o Jukebox.\n  useEffect(() => { if (!watch2Open) return; if (isPlaying) { try { pauseJukeboxMedia(); } catch {} setIsPlaying(false); try { emitJukeboxState({ isPlaying: false }); } catch {} } setJukeboxOpen(false); }, [watch2Open]);\n\n  ${restrictedMarker}`); changed = true; }
      const modalMarker = 'function Modal({ onClose, width = 380, bg, border, children }) {';
      if (output.includes(modalMarker)) { output = output.replace(modalMarker, 'function Modal({ onClose, width = 380, bg, border, children, hidden = false }) {'); output = output.replace('zIndex: 60 }}>', 'zIndex: 60, display: hidden ? "none" : "flex" }}>'); changed = true; }
      const jukeboxOpenMarker = '      {jukeboxOpen && (\n        <Modal onClose={() => setJukeboxOpen(false)} width={380} bg={T.bg2} border={T.border}>';
      if (output.includes(jukeboxOpenMarker)) { output = output.replace(jukeboxOpenMarker, `      {(jukeboxOpen || !!nowPlaying) && (\n        <Modal onClose={() => setJukeboxOpen(false)} width={820} bg={T.bg2} border={T.border} hidden={!jukeboxOpen}>`); changed = true; }
      const jukeboxTitleMarker = `<div className="cc-media-modal-title" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>\n            <Icon name="music" size={18} color={themeColor} />\n            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16 }}>Jukebox</div>\n          </div>`;
      if (output.includes(jukeboxTitleMarker)) {
        const jukeboxTitleReplacement = '<div className="cc-media-modal-title cc-jukebox-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>\n            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="music" size={18} color={themeColor} /><div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17 }}>Jukebox</div></div>\n            <button type="button" onClick={() => setShowJukeboxQueue(v => !v)} className="cc-jukebox-queue-toggle">{showJukeboxQueue ? \'Ocultar fila\' : \'Mostrar fila\'}</button>\n          </div>\n          {showJukeboxQueue && <aside className="cc-jukebox-queue"><div className="cc-jukebox-queue-head"><span>Fila</span><span>{queue.length}</span></div>{queue.length ? queue.map((t, index) => <div key={t.id} className={"cc-jukebox-queue-item " + (index === 0 ? "is-next" : "")}><div className="cc-jukebox-queue-number">{String(index + 1).padStart(2, \'0\')}</div><div className="cc-jukebox-queue-copy"><strong>{t.title}</strong><span>{t.type === \'video\' ? \'Vídeo\' : \'Áudio\'}</span></div><button type="button" onClick={() => removeFromQueue(t.id)} className="cc-jukebox-queue-remove" title="Remover da fila">×</button></div>) : <div className="cc-jukebox-queue-empty">A fila está vazia.</div>}</aside>';
        output = output.replace(jukeboxTitleMarker, jukeboxTitleReplacement);
        changed = true;
      }
      const nowPlayingCard = '<div style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, marginBottom: 14 }}>';
      const nowPlayingCardReplacement = '<div className="cc-jukebox-art-card" style={{ background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14, marginBottom: 14, backgroundImage: jukeboxIsYoutube() && nowPlaying.source ? `linear-gradient(180deg, rgba(12,9,18,.28), rgba(12,9,18,.92)), url(https://img.youtube.com/vi/${extractYoutubeId(nowPlaying.source)}/hqdefault.jpg)` : `radial-gradient(circle at 20% 0%, ${themeColor}55, transparent 45%), linear-gradient(135deg, ${T.bg1}, ${T.bg0})`, backgroundPosition: "center", backgroundSize: "cover" }}>';
      if (output.includes(nowPlayingCard) && !output.includes('cc-jukebox-art-card')) { output = output.replace(nowPlayingCard, nowPlayingCardReplacement); changed = true; }
      const inlineQueueMarker = `          {queue.length > 0 && (\n            <div style={{ marginBottom: 14 }}>`;
      if (output.includes(inlineQueueMarker)) { output = output.replace(inlineQueueMarker, `          {queue.length > 0 && (\n            <div className="cc-jukebox-inline-queue" style={{ marginBottom: 14, display: showJukeboxQueue ? 'none' : 'block' }}>`); changed = true; }
      const remoteFn = `function RemoteVideo({ stream }) {\n  const ref = useRef(null);\n  useEffect(() => { if (ref.current) ref.current.srcObject = stream || null; return () => { if (ref.current) ref.current.srcObject = null; }; }, [stream]);\n  return <video ref={ref} autoPlay playsInline style={{width:"100%",aspectRatio:"16/9",objectFit:"cover",borderRadius:7,background:"#000"}} />;\n}`;
      const remoteReplacement = `function RemoteVideo({ stream, name = 'O usuário' }) {\n  const ref = useRef(null);\n  const [paused, setPaused] = useState(false);\n  useEffect(() => { const el = ref.current; if (el) el.srcObject = stream || null; const track = stream?.getVideoTracks?.()[0] || null; const sync = () => setPaused(!track || track.readyState !== 'live' || track.muted === true); sync(); const ended = () => setPaused(true), muted = () => setPaused(true), unmuted = () => setPaused(false); track?.addEventListener?.('ended', ended); track?.addEventListener?.('mute', muted); track?.addEventListener?.('unmute', unmuted); return () => { track?.removeEventListener?.('ended', ended); track?.removeEventListener?.('mute', muted); track?.removeEventListener?.('unmute', unmuted); if (el) el.srcObject = null; }; }, [stream]);\n  return <div className="cc-remote-video-shell"><video ref={ref} autoPlay playsInline style={{width:"100%",height:"100%",objectFit:"contain",background:"#000"}} />{paused && <div className="cc-remote-video-paused"><div className="cc-remote-video-paused-icon">⏸</div><strong>Transmissão pausada</strong><span>A transmissão de {name} está pausada.</span><small>Aguarde ou peça para {name} retomar a transmissão.</small></div>}</div>;\n}`;
      if (output.includes(remoteFn)) { output = output.replace(remoteFn, remoteReplacement); const remoteCall = '<RemoteVideo key={id} stream={stream} />'; const remoteCallReplacement = '<RemoteVideo key={id} stream={stream} name={voiceParticipants[id]?.user?.username || voiceParticipants[id]?.username || \'O usuário\'} />'; if (output.includes(remoteCall)) output = output.replace(remoteCall, remoteCallReplacement); changed = true; }
      const profileModalButtonMarker = `{profileModal.isMe ? (\n                <div onClick={() => { setProfileModal(null); setSettingsOpen(true); setSettingsTab("perfil"); }}`;
      if (output.includes(profileModalButtonMarker) && !output.includes('cc-profile-full-button')) { output = output.replace(profileModalButtonMarker, `<div onClick={() => { const p = profileModal; setProfileModal(null); setFullProfilePage({ ...p, about: p.isMe ? aboutMe : (p.about || "") }); }} className="cc-profile-full-button">Ver perfil completo</div>\n              {profileModal.isMe ? (\n                <div onClick={() => { setProfileModal(null); setSettingsOpen(true); setSettingsTab("perfil"); }}`); changed = true; }
      const profileOverlayMarker = '      {/* MODAL: PERFIL */}\n      {profileModal && (';
      if (output.includes(profileOverlayMarker) && !output.includes('{fullProfilePage && (')) { output = output.replace(profileOverlayMarker, `      {fullProfilePage && (\n        <ProfilePage profile={{ ...fullProfilePage, banner: fullProfilePage.isMe ? myBannerUrl : fullProfilePage.banner, imgSrc: fullProfilePage.isMe ? myAvatarUrl : fullProfilePage.imgSrc }} isMe={!!fullProfilePage.isMe} T={T} themeColor={themeColor} onClose={() => setFullProfilePage(null)} onEditProfile={() => { setFullProfilePage(null); setSettingsOpen(true); setSettingsTab('perfil'); }} />\n      )}\n\n${profileOverlayMarker}`); changed = true; }
      const watch2Marker = '      {/* MODAL: WATCH2CHRONOS */}\n      {watch2Open && (';
      if (output.includes(watch2Marker) && !output.includes('cc-jukebox-mini')) { const mini = `      {nowPlaying && !jukeboxOpen && !watch2Open && <div className="cc-jukebox-mini"><div className="cc-jukebox-mini-art">♫</div><div className="cc-jukebox-mini-copy"><strong>{nowPlaying.title}</strong><span>{isPlaying ? 'Tocando agora' : 'Pausado'}</span></div><button type="button" onClick={() => isPlaying ? (pauseJukeboxMedia(), setIsPlaying(false), emitJukeboxState({isPlaying:false})) : playJukeboxMedia()} className="cc-jukebox-mini-action">{isPlaying ? 'Ⅱ' : '▶'}</button><button type="button" onClick={() => setJukeboxOpen(true)} className="cc-jukebox-mini-action" title="Abrir Jukebox">♪</button></div>}\n\n`; output = output.replace(watch2Marker, mini + watch2Marker); changed = true; }
      if (!changed) return null;
      const required = ['cc-jukebox-queue-toggle','cc-jukebox-art-card','cc-remote-video-paused','cc-profile-full-button'];
      for (const marker of required) if (!output.includes(marker)) throw new Error(`ChronoCord 1.0.3 feature marker missing: ${marker}`);
      return { code: output, map: null };
    },
  };
}

export default defineConfig({ plugins: [chronocordWebRtcFix(), chronocordProductFeatures(), chronocordFeatureInteractions(), react()], base: './', build: { target: 'es2020' } });
