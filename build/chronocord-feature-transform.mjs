export function chronocordFeatureInteractions() {
  return {
    name: 'chronocord-feature-interactions',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/ChronoCord.jsx') && !id.endsWith('\\src\\ChronoCord.jsx')) return null;
      let output = code.replace(/\r\n/g, '\n');
      let changed = output !== code;

      const stageState = '  const [voiceStageOpen, setVoiceStageOpen] = useState(false);';
      if (output.includes(stageState) && !output.includes('async function openVoiceStage(tryFullscreen = false)')) {
        output = output.replace(stageState, `${stageState}
  async function openVoiceStage(tryFullscreen = false) {
    setVoiceStageOpen(true);
    if(tryFullscreen && !document.fullscreenElement) {
      try { await document.documentElement.requestFullscreen?.(); } catch {}
    }
  }`);
        changed = true;
      }

      const confirmedJoin = `          setVoiceState(v => ({ ...v, connected:true }));
          setVoiceJoinStatus("");
          if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });`;
      if (output.includes(confirmedJoin)) {
        output = output.replace(confirmedJoin, `          setVoiceState(v => ({ ...v, connected:true }));
          setVoiceJoinStatus("");
          void openVoiceStage(true);
          if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });`);
        changed = true;
      }

      const voiceJoined = '    socket.on("voice-joined", ({channelId,participants}) => { if(channelId===voiceChannelRef.current) { setVoiceState(v=>({...v,connected:true})); } });';
      if (output.includes(voiceJoined)) {
        output = output.replace(voiceJoined, '    socket.on("voice-joined", ({channelId,participants}) => { if(channelId===voiceChannelRef.current) { setVoiceState(v=>({...v,connected:true})); setVoiceStageOpen(true); } });');
        changed = true;
      }

      const leaveStart = `  function leaveVoice() {
    const old=voiceState.channelId;`;
      if (output.includes(leaveStart)) {
        output = output.replace(leaveStart, `  function leaveVoice() {
    setVoiceStageOpen(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    const old=voiceState.channelId;`);
        changed = true;
      }

      const manualStage = '<span className="cc-call-control" onClick={async () => { setVoiceStageOpen(true); try { await document.documentElement.requestFullscreen?.(); } catch {} }} title="Abrir tela de voz"';
      if (output.includes(manualStage)) {
        output = output.replace(manualStage, '<span className="cc-call-control" onClick={() => { void openVoiceStage(true); }} title="Abrir tela de voz"');
        changed = true;
      }

      const memberRow = '<div key={m.name} className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 4px", borderRadius: 6, opacity: group === "offline" ? 0.5 : 1, cursor: "pointer" }} onClick={() => openProfile(m.name === myName ? { isMe: true, name: myName, color: themeColor, status: myStatus, role: "Cronista fundador", imgSrc: myAvatarUrl } : { isMe: false, name: m.name, color: m.color, status: m.status, role: m.role, imgSrc: m.imgSrc })}>';
      const memberRowReplacement = '<div key={m.name} className="hoverable" style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 4px", borderRadius: 8, opacity: group === "offline" ? 0.5 : 1, cursor: "pointer" }} onClick={() => openProfile(m.name === myName ? { isMe: true, name: myName, color: themeColor, status: myStatus, role: "Cronista fundador", imgSrc: myAvatarUrl } : { isMe: false, name: m.name, color: m.color, status: m.status, role: m.role, imgSrc: m.imgSrc })} onContextMenu={(e) => { e.preventDefault(); const p = m.name === myName ? { isMe: true, name: myName, color: themeColor, status: myStatus, role: "Cronista fundador", imgSrc: myAvatarUrl } : { isMe: false, name: m.name, color: m.color, status: m.status, role: m.role, imgSrc: m.imgSrc }; setProfileModal(p); }}>';
      if (output.includes(memberRow)) { output = output.replace(memberRow, memberRowReplacement); changed = true; }

      const stageTile = '<div key={id} className="cc-stage-tile" style={{ position: "relative", minHeight: 0, borderRadius: 12, overflow: "hidden", background: "#15151b", border: `2px solid ${id === authUser?.id ? themeColor : "rgba(255,255,255,0.08)"}`, boxShadow: id === authUser?.id ? `0 0 0 1px ${themeColor}22 inset` : "none" }}>';
      if (output.includes(stageTile)) {
        output = output.replace(stageTile, '<div key={id} className="cc-stage-tile" onContextMenu={(e) => { e.preventDefault(); setProfileModal(id === authUser?.id ? { isMe: true, name: myName, color: themeColor, status: myStatus, role: "Cronista fundador", imgSrc: myAvatarUrl } : { isMe: false, name, color: p.user?.color || themeColor, status: p.user?.status || "online", role: "Cronista", imgSrc: p.user?.avatar }); }} style={{ position: "relative", minHeight: 0, borderRadius: 12, overflow: "hidden", background: "#15151b", border: `2px solid ${id === authUser?.id ? themeColor : (p.speaking ? (p.user?.color || themeColor) : "rgba(255,255,255,0.08)")}`, boxShadow: p.speaking ? `0 0 0 2px ${(p.user?.color || themeColor)}33` : (id === authUser?.id ? `0 0 0 1px ${themeColor}22 inset` : "none") }}>' );
        changed = true;
      }

      return changed ? { code: output, map: null } : null;
    },
  };
}
