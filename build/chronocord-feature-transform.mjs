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

      const joinMarker = `  async function joinEraByCode() {
    const code = joinCode.trim();`;
      if (output.includes(joinMarker) && !output.includes('function normalizeInviteCode(rawValue)')) {
        output = output.replace(joinMarker, `  function normalizeInviteCode(rawValue) {
    const raw = String(rawValue || "").trim();
    if (!raw) return "";
    const withoutQuery = raw.split(/[?#]/)[0].replace(/\\/+$/, "");
    const match = withoutQuery.match(/^(?:https?:\\/\\/)?(?:www\\.)?chronocord\\.gg\\/(?:invite\\/)?([^\\/\\s]+)$/i);
    if (match) {
      try { return decodeURIComponent(match[1]); } catch { return match[1]; }
    }
    return withoutQuery;
  }

  async function joinEraByCode() {
    const code = normalizeInviteCode(joinCode);`);
        changed = true;
      }

      const oldCopyInvite = `  function copyInvite() {
    const link = \`chronocord.gg/\${activeEra}-\${eraNames[activeEra]?.toLowerCase().replace(/\\s+/g, "-")}\`;
    try { navigator.clipboard && navigator.clipboard.writeText(link); } catch (e) {}
    setCopyState("Copiado!");
    setTimeout(() => setCopyState("Copiar"), 1500);
  }`;
      if (output.includes(oldCopyInvite) && !output.includes('function getActiveInviteLink()')) {
        output = output.replace(oldCopyInvite, `  function getActiveInviteLink() {
    const inviteCode = eras.find((era) => era.id === activeEra)?.inviteCode || "";
    return inviteCode ? \`https://chronocord.gg/invite/\${inviteCode}\` : "";
  }

  async function copyInvite() {
    const link = getActiveInviteLink();
    if (!link) {
      setCopyState("Convite indisponível");
      setTimeout(() => setCopyState("Copiar"), 1800);
      return;
    }
    try {
      if (window.electronAPI?.writeClipboardText) {
        await window.electronAPI.writeClipboardText(link);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const input = document.createElement("textarea");
        input.value = link;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Clipboard indisponível.");
      }
      setCopyState("Copiado!");
    } catch {
      setCopyState("Falha ao copiar");
    }
    setTimeout(() => setCopyState("Copiar"), 1800);
  }`);
        changed = true;
      }

      if (output.includes('placeholder="nome#0000"')) {
        output = output.replace('placeholder="nome#0000"', 'placeholder="nome de usuário"');
        changed = true;
      }

      const oldInviteField = '<div style={{ flex: 1, background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, fontFamily: FONT_MONO, color: T.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>chronocord.gg/{activeEra}-{eraNames[activeEra]?.toLowerCase().replace(/\\s+/g, "-")}</div>';
      const newInviteField = '<input readOnly value={getActiveInviteLink()} onFocus={(e) => e.target.select()} onClick={(e) => e.currentTarget.select()} aria-label="Link de convite" style={{ flex: 1, background: T.bg1, border: `1px solid ${T.border}`, borderRadius: 6, padding: "9px 12px", fontSize: 13, fontFamily: FONT_MONO, color: T.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", outline: "none" }} />';
      if (output.includes(oldInviteField)) {
        output = output.replace(oldInviteField, newInviteField);
        changed = true;
      }

      const oldInviteButton = '<span onClick={copyInvite} style={{ background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "9px 16px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}>{copyState}</span>';
      const newInviteButton = '<button type="button" onClick={copyInvite} style={{ border: "none", background: themeColor, color: T.text, fontWeight: 600, fontSize: 13, padding: "9px 16px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap" }}>{copyState}</button>';
      if (output.includes(oldInviteButton)) {
        output = output.replace(oldInviteButton, newInviteButton);
        changed = true;
      }

      return changed ? { code: output, map: null } : null;
    },
  };
}
