import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
        try{const offer=await pc.createOffer();await pc.setLocalDescription(offer);socketRef.current?.emit(\"webrtc-signal\",{to:from,data:{type:\"offer\",sdp:offer}});}catch{}
      }
      return;
    } else if(data.type==='offer'){`;
      if (output.includes(signalMarker) && !output.includes("data.type==='renegotiate-request'")) {
        output = output.replace(signalMarker, signalReplacement);
        changed = true;
      }

      const oldRenegotiate = `async function renegotiatePeers(){
    for(const [peerId,pc] of peerConnectionsRef.current){
      if(String(authUser.id)<String(peerId)){ try{const offer=await pc.createOffer();await pc.setLocalDescription(offer);socketRef.current?.emit(\"webrtc-signal\",{to:peerId,data:{type:\"offer\",sdp:offer}});}catch{} }
    }
  }`;
      const newRenegotiate = `async function renegotiatePeers(){
    for(const [peerId,pc] of peerConnectionsRef.current){
      try{
        if(String(authUser.id)<String(peerId)){
          const offer=await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.emit(\"webrtc-signal\",{to:peerId,data:{type:\"offer\",sdp:offer}});
        } else {
          socketRef.current?.emit(\"webrtc-signal\",{to:peerId,data:{type:\"renegotiate-request\"}});
        }
      }catch{}
    }
  }`;
      if (output.includes(oldRenegotiate)) {
        output = output.replace(oldRenegotiate, newRenegotiate);
        changed = true;
      }

      const oldPreview = `{voiceCameraOn && <video ref={localVideoRef}`;
      const newPreview = `{(voiceCameraOn || voiceScreenSharing) && <video ref={localVideoRef}`;
      if (output.includes(oldPreview)) {
        output = output.replace(oldPreview, newPreview);
        changed = true;
      }

      if (!changed) {
        throw new Error('ChronoCord WebRTC fix: expected source markers were not found; refusing to build an unpatched screen-share bundle.');
      }

      return { code: output, map: null };
    },
  };
}

function chronocordProductFeatures() {
  return {
    name: 'chronocord-product-features',
    enforce: 'post',
    transform(code, id) {
      if (!id.endsWith('/src/ChronoCord.jsx') && !id.endsWith('\\src\\ChronoCord.jsx')) return null;
      let output = code;
      let changed = false;

      if (!output.includes("import ProfilePage from './ProfilePage.jsx';")) {
        output = "import ProfilePage from './ProfilePage.jsx';\n" + output;
        changed = true;
      }

      const profileStateMarker = 'const [profileModal, setProfileModal] = useState(null);';
      if (output.includes(profileStateMarker) && !output.includes('const [fullProfilePage, setFullProfilePage]')) {
        output = output.replace(profileStateMarker, `${profileStateMarker}\n  const [fullProfilePage, setFullProfilePage] = useState(null);`);
        changed = true;
      }

      const jukeboxQueueMarker = 'const [jukeboxMuted, setJukeboxMuted] = useState(false);';
      if (output.includes(jukeboxQueueMarker) && !output.includes('chronocord.jukebox.queueVisible')) {
        output = output.replace(jukeboxQueueMarker, `${jukeboxQueueMarker}\n  const [showJukeboxQueue, setShowJukeboxQueue] = useState(() => { try { return localStorage.getItem('chronocord.jukebox.queueVisible') !== 'false'; } catch { return true; } });`);
        changed = true;
      }

      const fmtMarker = 'function fmtDuration(sec) { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return `${m}:${String(s).padStart(2, "0")}`; }';
      if (output.includes(fmtMarker) && !output.includes('chronocord.jukebox.queueVisible')) {
        output = output.replace(fmtMarker, `${fmtMarker}\n  useEffect(() => { try { localStorage.setItem('chronocord.jukebox.queueVisible', String(showJukeboxQueue)); } catch {} }, [showJukeboxQueue]);`);
        changed = true;
      }

      const restrictedMarker = '// ---- canais restritos: só dono/moderador escrevem ----';
      if (output.includes(restrictedMarker) && !output.includes('Watch2Chronos tem prioridade sobre o Jukebox')) {
        const priority = `// Watch2Chronos tem prioridade sobre o Jukebox: abrir o Watch2 pausa a reprodução e fecha o painel.\n  useEffect(() => {\n    if (!watch2Open) return;\n    if (isPlaying) { try { pauseJukeboxMedia(); } catch {} setIsPlaying(false); try { emitJukeboxState({ isPlaying: false }); } catch {} }\n    setJukeboxOpen(false);\n  }, [watch2Open]);\n\n  `;
        output = output.replace(restrictedMarker, priority + restrictedMarker);
        changed = true;
      }

      const modalMarker = 'function Modal({ onClose, width = 380, bg, border, children }) {';
      const modalReplacement = 'function Modal({ onClose, width = 380, bg, border, children, hidden = false }) {';
      if (output.includes(modalMarker)) {
        output = output.replace(modalMarker, modalReplacement);
        output = output.replace('zIndex: 60 }}>', 'zIndex: 60, display: hidden ? "none" : "flex" }}>');
        changed = true;
      }

      const jukeboxOpenMarker = '      {jukeboxOpen && (\n        <Modal onClose={() => setJukeboxOpen(false)} width={380} bg={T.bg2} border={T.border}>';
      const jukeboxOpenReplacement = `      {(jukeboxOpen || !!nowPlaying) && (\n        <Modal onClose={() => setJukeboxOpen(false)} width={820} bg={T.bg2} border={T.border} hidden={!jukeboxOpen}>`;
      if (output.includes(jukeboxOpenMarker)) {
        output = output.replace(jukeboxOpenMarker, jukeboxOpenReplacement);
        changed = true;
      }

      const jukeboxTitleMarker = `<div className="cc-media-modal-title" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>\n            <Icon name="music" size={18} color={themeColor} />\n            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16 }}>Jukebox</div>\n          </div>`;
      const jukeboxTitleReplacement = `<div className="cc-media-modal-title cc-jukebox-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>\n            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>\n              <Icon name="music" size={18} color={themeColor} />\n              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17 }}>Jukebox</div>\n            </div>\n            <button type="button" onClick={() => setShowJukeboxQueue(v => !v)} className="cc-jukebox-queue-toggle">{showJukeboxQueue ? 'Ocultar fila' : 'Mostrar fila'}</button>\n          </div>\n          {showJukeboxQueue && <aside className="cc-jukebox-queue">\n            <div className="cc-jukebox-queue-head"><span>Fila</span><span>{queue.length}</span></div>\n            {queue.length ? queue.map((t, index) => <div key={t.id} className={`cc-jukebox-queue-item ${index === 0 ? 'is-next' : ''}`}>\n              <div className="cc-jukebox-queue-number">{String(index + 1).padStart(2, '0')}</div>\n              <div className="cc-jukebox-queue-copy"><strong>{t.title}</strong><span>{t.type === 'video' ? 'Vídeo' : 'Áudio'}</span></div>\n              <button type="button" onClick={() => removeFromQueue(t.id)} className="cc-jukebox-queue-remove" title="Remover da fila">×</button>\n            </div>) : <div className="cc-jukebox-queue-empty">A fila está vazia.</div>}\n          </aside>}`;
      if (output.includes(jukeboxTitleMarker)) {
        output = output.replace(jukeboxTitleMarker, jukeboxTitleReplacement);
        changed = true;
      }

      const inlineQueueMarker = `          {queue.length > 0 && (\n            <div style={{ marginBottom: 14 }}>`;
      const inlineQueueReplacement = `          {queue.length > 0 && (\n            <div className="cc-jukebox-inline-queue" style={{ marginBottom: 14, display: showJukeboxQueue ? 'none' : 'block' }}>`;
      if (output.includes(inlineQueueMarker)) {
        output = output.replace(inlineQueueMarker, inlineQueueReplacement);
        changed = true;
      }

      const remoteFn = `function RemoteVideo({ stream }) {\n  const ref = useRef(null);\n  useEffect(() => { if (ref.current) ref.current.srcObject = stream || null; return () => { if (ref.current) ref.current.srcObject = null; }; }, [stream]);\n  return <video ref={ref} autoPlay playsInline style={{width:"100%",aspectRatio:"16/9",objectFit:"cover",borderRadius:7,background:"#000"}} />;\n}`;
      const remoteReplacement = `function RemoteVideo({ stream, name = 'O usuário' }) {\n  const ref = useRef(null);\n  const [paused, setPaused] = useState(false);\n  useEffect(() => {\n    const el = ref.current;\n    if (el) el.srcObject = stream || null;\n    const track = stream?.getVideoTracks?.()[0] || null;\n    const sync = () => setPaused(!track || track.readyState !== 'live' || track.muted === true);\n    sync();\n    const ended = () => setPaused(true);\n    const muted = () => setPaused(true);\n    const unmuted = () => setPaused(false);\n    track?.addEventListener?.('ended', ended);\n    track?.addEventListener?.('mute', muted);\n    track?.addEventListener?.('unmute', unmuted);\n    return () => { track?.removeEventListener?.('ended', ended); track?.removeEventListener?.('mute', muted); track?.removeEventListener?.('unmute', unmuted); if (el) el.srcObject = null; };\n  }, [stream]);\n  return <div className="cc-remote-video-shell">\n    <video ref={ref} autoPlay playsInline style={{width:"100%",height:"100%",objectFit:"contain",background:"#000"}} />\n    {paused && <div className="cc-remote-video-paused">\n      <div className="cc-remote-video-paused-icon">⏸</div>\n      <strong>Transmissão pausada</strong>\n      <span>A transmissão de {name} está pausada.</span>\n      <small>Aguarde ou peça para {name} retomar a transmissão.</small>\n    </div>}\n  </div>;\n}`;
      if (output.includes(remoteFn)) {
        output = output.replace(remoteFn, remoteReplacement);
        const remoteCall = '<RemoteVideo key={id} stream={stream} />';
        const remoteCallReplacement = '<RemoteVideo key={id} stream={stream} name={voiceParticipants[id]?.user?.username || voiceParticipants[id]?.username || \'O usuário\'} />';
        if (output.includes(remoteCall)) output = output.replace(remoteCall, remoteCallReplacement);
        changed = true;
      }

      const profileModalButtonMarker = `{profileModal.isMe ? (\n                <div onClick={() => { setProfileModal(null); setSettingsOpen(true); setSettingsTab("perfil"); }}`;
      const profileModalButtonReplacement = `<div onClick={() => { const p = profileModal; setProfileModal(null); setFullProfilePage({ ...p, about: p.isMe ? aboutMe : (p.about || "") }); }} className="cc-profile-full-button">Ver perfil completo</div>\n              {profileModal.isMe ? (\n                <div onClick={() => { setProfileModal(null); setSettingsOpen(true); setSettingsTab("perfil"); }}`;
      if (output.includes(profileModalButtonMarker) && !output.includes('cc-profile-full-button')) {
        output = output.replace(profileModalButtonMarker, profileModalButtonReplacement);
        changed = true;
      }

      const profileOverlayMarker = '      {/* MODAL: PERFIL */}\n      {profileModal && (';
      if (output.includes(profileOverlayMarker) && !output.includes('{fullProfilePage && (')) {
        const overlay = `      {fullProfilePage && (\n        <ProfilePage\n          profile={{ ...fullProfilePage, banner: fullProfilePage.isMe ? myBannerUrl : fullProfilePage.banner, imgSrc: fullProfilePage.isMe ? myAvatarUrl : fullProfilePage.imgSrc }}\n          isMe={!!fullProfilePage.isMe}\n          T={T}\n          themeColor={themeColor}\n          onClose={() => setFullProfilePage(null)}\n          onEditProfile={() => { setFullProfilePage(null); setSettingsOpen(true); setSettingsTab('perfil'); }}\n        />\n      )}\n\n`;
        output = output.replace(profileOverlayMarker, overlay + profileOverlayMarker);
        changed = true;
      }

      if (!changed) return null;
      return { code: output, map: null };
    },
  };
}

export default defineConfig({
  plugins: [react(), chronocordWebRtcFix(), chronocordProductFeatures()],
  base: './',
  build: { target: 'es2020' },
});
