function replaceRequired(code, marker, replacement, label) {
  if (!code.includes(marker)) throw new Error(`ChronoCord media transform: missing ${label} marker.`);
  return code.replace(marker, replacement);
}

export function applyChronoCordMediaFeatures(input) {
  let output = input.replace(/\r\n/g, '\n');

  // Rewrite existing UI entry points before adding openWatch2Chronos itself,
  // otherwise a global replacement would turn the helper into recursion.
  output = output.replaceAll('setWatch2Open(true)', 'openWatch2Chronos()');

  const legacyQueueState = "  const [showJukeboxQueue, setShowJukeboxQueue] = useState(() => { try { return localStorage.getItem('chronocord.jukebox.queueVisible') !== 'false'; } catch { return true; } });";
  const mediaState = `  const [showJukeboxQueue, setShowJukeboxQueue] = useState(() => {
    try { return localStorage.getItem("chronocord:jukebox:showQueue") !== "0"; } catch { return true; }
  });
  const [jukeboxLocalHold, setJukeboxLocalHold] = useState(false);
  const jukeboxLocalHoldRef = useRef(false);
  const locallyPlaying = isPlaying && !jukeboxLocalHold;`;
  output = replaceRequired(output, legacyQueueState, mediaState, 'Jukebox queue state');

  const legacyPersistence = "  useEffect(() => { try { localStorage.setItem('chronocord.jukebox.queueVisible', String(showJukeboxQueue)); } catch {} }, [showJukeboxQueue]);";
  const mediaHelpers = `  useEffect(() => { jukeboxLocalHoldRef.current = jukeboxLocalHold; }, [jukeboxLocalHold]);
  useEffect(() => {
    try { localStorage.setItem("chronocord:jukebox:showQueue", showJukeboxQueue ? "1" : "0"); } catch {}
  }, [showJukeboxQueue]);
  function jukeboxArtworkUrl(track) {
    if (!track) return "";
    if (track.thumbnail) return track.thumbnail;
    const videoId = track.videoId || extractYoutubeId(track.source || "");
    return videoId ? \`https://img.youtube.com/vi/\${videoId}/hqdefault.jpg\` : "";
  }
  function pauseJukeboxLocalMedia() {
    try { jukeboxAudioRef.current?.pause?.(); } catch {}
    try { jukeboxVideoRef.current?.pause?.(); } catch {}
    try { jukeboxYoutubePost("pauseVideo"); } catch {}
  }
  function openWatch2Chronos() {
    setJukeboxLocalHold(true);
    jukeboxLocalHoldRef.current = true;
    pauseJukeboxLocalMedia();
    setJukeboxOpen(false);
    setWatch2Open(true);
  }
  function closeWatch2Chronos() {
    setWatch2Open(false);
  }
  function selectJukeboxTrack(track) {
    if (!track) return;
    const remaining = queue.filter((item) => item.id !== track.id);
    setJukeboxLocalHold(false);
    jukeboxLocalHoldRef.current = false;
    setQueue(remaining);
    setNowPlaying(track);
    setJukeboxPosition(0);
    setIsPlaying(true);
    emitJukeboxState({ nowPlaying: track, queue: remaining, isPlaying: true, elapsed: 0 });
  }`;
  output = replaceRequired(output, legacyPersistence, mediaHelpers, 'Jukebox preference persistence');

  const legacyPriority = `  // Watch2Chronos tem prioridade sobre o Jukebox.
  useEffect(() => { if (!watch2Open) return; if (isPlaying) { try { pauseJukeboxMedia(); } catch {} setIsPlaying(false); try { emitJukeboxState({ isPlaying: false }); } catch {} } setJukeboxOpen(false); }, [watch2Open]);

`;
  output = replaceRequired(output, legacyPriority, '', 'legacy shared Watch2 priority');

  const playMarker = '  async function playJukeboxMedia() {\n';
  output = replaceRequired(output, playMarker, `${playMarker}    setJukeboxLocalHold(false);\n    jukeboxLocalHoldRef.current = false;\n`, 'Jukebox play function');

  const playbackEffect = `    if (jukeboxIsYoutube()) { jukeboxYoutubePost(jukeboxMuted?"mute":"unMute"); jukeboxYoutubePost("setVolume",[jukeboxVolume]); if(isPlaying) jukeboxYoutubePost("playVideo"); else jukeboxYoutubePost("pauseVideo"); return; }
    const el = nowPlaying?.type === "video" ? jukeboxVideoRef.current : jukeboxAudioRef.current;
    if (!el || !nowPlaying) return;
    el.volume = jukeboxVolume / 100; el.muted = jukeboxMuted;
    if (Math.abs((el.currentTime||0) - (jukeboxPosition||0)) > 1.5) el.currentTime = jukeboxPosition || 0;
    if (isPlaying) el.play().catch(()=>setIsPlaying(false)); else el.pause();
  }, [nowPlaying, jukeboxVolume, jukeboxMuted]);`;
  const localPlaybackEffect = `    if (jukeboxIsYoutube()) { jukeboxYoutubePost(jukeboxMuted?"mute":"unMute"); jukeboxYoutubePost("setVolume",[jukeboxVolume]); if (locallyPlaying) jukeboxYoutubePost("playVideo"); else jukeboxYoutubePost("pauseVideo"); return; }
    const el = nowPlaying?.type === "video" ? jukeboxVideoRef.current : jukeboxAudioRef.current;
    if (!el || !nowPlaying) return;
    el.volume = jukeboxVolume / 100; el.muted = jukeboxMuted;
    if (Math.abs((el.currentTime||0) - (jukeboxPosition||0)) > 1.5) el.currentTime = jukeboxPosition || 0;
    if (locallyPlaying) el.play().catch(()=>setIsPlaying(false)); else el.pause();
  }, [nowPlaying, jukeboxVolume, jukeboxMuted, locallyPlaying]);`;
  output = replaceRequired(output, playbackEffect, localPlaybackEffect, 'Jukebox playback effect');

  const progressGuard = '    if (!isPlaying || !nowPlaying || !socketRef.current || !activeEra || !voiceState.channelId) return;';
  output = replaceRequired(output, progressGuard, '    if (!locallyPlaying || !nowPlaying || !socketRef.current || !activeEra || !voiceState.channelId) return;', 'Jukebox progress guard');
  output = replaceRequired(output, '  }, [isPlaying, nowPlaying, activeEra, voiceState.channelId]);', '  }, [locallyPlaying, nowPlaying, activeEra, voiceState.channelId]);', 'Jukebox progress dependencies');

  output = replaceRequired(output, '<Modal onClose={() => setWatch2Open(false)} width={520} bg={T.bg2} border={T.border}>', '<Modal onClose={closeWatch2Chronos} width={520} bg={T.bg2} border={T.border}>', 'Watch2 close control');

  output = replaceRequired(output, '<div className="cc-media-panel cc-jukebox-panel">', '<div className="cc-media-panel cc-jukebox-panel cc-jukebox-premium">', 'Jukebox premium shell');
  output = replaceRequired(output, 'className="cc-jukebox-art-card"', 'className="cc-jukebox-art-card cc-jukebox-artwork"', 'Jukebox artwork class');

  const queueItem = '<div key={t.id} className={"cc-jukebox-queue-item " + (index === 0 ? "is-next" : "")}>';
  const selectableQueueItem = '<div className="cc-jukebox-queue-item" key={t.id} data-next={index === 0 ? "true" : "false"} onClick={() => selectJukeboxTrack(t)}>';
  output = replaceRequired(output, queueItem, selectableQueueItem, 'Jukebox queue item');
  output = replaceRequired(output, 'onClick={() => removeFromQueue(t.id)} className="cc-jukebox-queue-remove"', 'onClick={(event) => { event.stopPropagation(); removeFromQueue(t.id); }} className="cc-jukebox-queue-remove"', 'Jukebox queue remove control');

  const modalPlayControl = 'onClick={() => { if(isPlaying) pauseJukeboxMedia(); else playJukeboxMedia(); const next=!isPlaying; setIsPlaying(next); emitJukeboxState({isPlaying:next}); }} title={isPlaying?"Pausar":"Despausar"}';
  const localPlayControl = 'onClick={() => { if(locallyPlaying) pauseJukeboxMedia(); else playJukeboxMedia(); const next=!locallyPlaying; setIsPlaying(next); emitJukeboxState({isPlaying:next}); }} title={locallyPlaying?"Pausar":"Despausar"}';
  output = replaceRequired(output, modalPlayControl, localPlayControl, 'Jukebox modal play control');
  output = output.replace('name={isPlaying?"pause":"play"}', 'name={locallyPlaying?"pause":"play"}');

  output = output.replace('src={youtubeEmbedUrl(extractYoutubeId(nowPlaying.source), isPlaying)}', 'src={youtubeEmbedUrl(extractYoutubeId(nowPlaying.source), locallyPlaying)}');
  output = output.replace('if(isPlaying)jukeboxYoutubePost("playVideo");', 'if(locallyPlaying)jukeboxYoutubePost("playVideo");');
  output = output.replace('autoPlay={isPlaying}', 'autoPlay={locallyPlaying}');

  const mini = `{nowPlaying && !jukeboxOpen && !watch2Open && <div className="cc-jukebox-mini"><div className="cc-jukebox-mini-art">♫</div><div className="cc-jukebox-mini-copy"><strong>{nowPlaying.title}</strong><span>{isPlaying ? 'Tocando agora' : 'Pausado'}</span></div><button type="button" onClick={() => isPlaying ? (pauseJukeboxMedia(), setIsPlaying(false), emitJukeboxState({isPlaying:false})) : playJukeboxMedia()} className="cc-jukebox-mini-action">{isPlaying ? 'Ⅱ' : '▶'}</button><button type="button" onClick={() => setJukeboxOpen(true)} className="cc-jukebox-mini-action" title="Abrir Jukebox">♪</button></div>}`;
  const localMini = `{nowPlaying && !jukeboxOpen && !watch2Open && <div className="cc-jukebox-mini"><div className="cc-jukebox-mini-art" style={{ backgroundImage: jukeboxArtworkUrl(nowPlaying) ? \`url(\${jukeboxArtworkUrl(nowPlaying)})\` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>{jukeboxArtworkUrl(nowPlaying) ? "" : "♫"}</div><div className="cc-jukebox-mini-copy"><strong>{nowPlaying.title}</strong><span>{locallyPlaying ? 'Tocando agora' : (jukeboxLocalHold ? 'Pausado para o Watch2Chronos' : 'Pausado')}</span></div><button type="button" onClick={() => locallyPlaying ? (pauseJukeboxMedia(), setIsPlaying(false), emitJukeboxState({isPlaying:false})) : playJukeboxMedia()} className="cc-jukebox-mini-action">{locallyPlaying ? 'Ⅱ' : '▶'}</button><button type="button" onClick={() => setJukeboxOpen(true)} className="cc-jukebox-mini-action" title="Abrir Jukebox">♪</button></div>}`;
  output = replaceRequired(output, mini, localMini, 'Jukebox mini-player');

  const required = [
    'const [jukeboxLocalHold, setJukeboxLocalHold] = useState(false);',
    'const locallyPlaying = isPlaying && !jukeboxLocalHold;',
    'chronocord:jukebox:showQueue',
    'function openWatch2Chronos()',
    'function closeWatch2Chronos()',
    'function selectJukeboxTrack(track)',
    'function jukeboxArtworkUrl(track)',
    'cc-jukebox-premium',
    'cc-jukebox-artwork',
    'cc-jukebox-queue',
    'cc-jukebox-mini',
  ];
  for (const marker of required) {
    if (!output.includes(marker)) throw new Error(`ChronoCord media transform: missing output marker ${marker}`);
  }
  return output;
}
