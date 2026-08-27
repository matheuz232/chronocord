export function chronocordScreenShare() {
  return {
    name: 'chronocord-screen-share-source-picker',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/ChronoCord.jsx') && !id.endsWith('\\src\\ChronoCord.jsx')) return null;

      let output = code.replace(/\r\n/g, '\n');
      let changed = output !== code;

      const stateMarker = '  const [voiceScreenSharing, setVoiceScreenSharing] = useState(false);';
      if (output.includes(stateMarker) && !output.includes('screenSharePickerOpen')) {
        output = output.replace(stateMarker, `${stateMarker}
  const [screenSharePickerOpen, setScreenSharePickerOpen] = useState(false);
  const [screenShareSources, setScreenShareSources] = useState([]);
  const [screenSharePickerBusy, setScreenSharePickerBusy] = useState(false);
  const [screenSharePickerError, setScreenSharePickerError] = useState('');`);
        changed = true;
      }

      const oldScreenBlock = `  async function toggleVoiceScreen(){
    if(!voiceState.connected)return;
    if(voiceScreenSharing){
      await stopLocalVideo('screen');
      setVoiceScreenSharing(false);
      return;
    }
    if (voiceCameraOn) {
      await stopLocalVideo('camera');
      setVoiceCameraOn(false);
    }
    try{
      const stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:30}},audio:false});
      const track=stream.getVideoTracks()[0];
      if(!track) throw new Error('Nenhuma fonte de tela foi selecionada.');
      localVideoTrackRef.current=track; localVideoKindRef.current='screen';
      track.onended=()=>{ if(localVideoKindRef.current==='screen'){ localVideoTrackRef.current=null; localVideoKindRef.current=null; setVoiceScreenSharing(false); void replacePeerVideoTrack(null); } };
      if(localVideoRef.current)localVideoRef.current.srcObject=new MediaStream([track]);
      await replacePeerVideoTrack(track);
      setVoiceScreenSharing(true);
    }catch(e){ setAuthError(e?.message || 'Não foi possível compartilhar a tela.'); }
  }
`;

      const newScreenBlock = `  async function validateVoiceScreenStream(stream){
    const track=stream?.getVideoTracks?.()[0] || null;
    if(!track || track.readyState !== 'live') throw new Error('A fonte selecionada não iniciou uma transmissão de vídeo válida.');
    const probe=document.createElement('video');
    probe.muted=true;
    probe.playsInline=true;
    probe.srcObject=stream;
    try{
      await probe.play().catch(()=>{});
      await new Promise((resolve,reject)=>{
        let settled=false;
        const finish=(error)=>{ if(settled)return; settled=true; clearTimeout(timer); if(error)reject(error); else resolve(); };
        const verify=()=>{ if(track.readyState !== 'live') return finish(new Error('A transmissão foi encerrada antes do primeiro quadro.')); if(probe.videoWidth>0 && probe.videoHeight>0) finish(); else finish(new Error('A fonte selecionada não forneceu quadros de vídeo.')); };
        const timer=setTimeout(()=>finish(new Error('A fonte selecionada não começou a transmitir quadros a tempo.')),3500);
        if(typeof probe.requestVideoFrameCallback === 'function') probe.requestVideoFrameCallback(()=>verify());
        else if(probe.readyState>=2) verify();
        else probe.addEventListener('loadeddata',verify,{once:true});
      });
      if(track.readyState !== 'live') throw new Error('A transmissão foi encerrada antes de começar.');
      return track;
    }finally{
      try{probe.pause();}catch{}
      probe.srcObject=null;
    }
  }

  async function activateVoiceScreenStream(stream){
    let track=null;
    try{
      track=await validateVoiceScreenStream(stream);
      localVideoTrackRef.current=track;
      localVideoKindRef.current='screen';
      track.onended=()=>{
        if(localVideoKindRef.current!=='screen')return;
        localVideoTrackRef.current=null;
        localVideoKindRef.current=null;
        setVoiceScreenSharing(false);
        if(localVideoRef.current)localVideoRef.current.srcObject=null;
        void replacePeerVideoTrack(null);
      };
      if(localVideoRef.current){
        localVideoRef.current.srcObject=stream;
        await localVideoRef.current.play().catch(()=>{});
      }
      await replacePeerVideoTrack(track);
      setVoiceScreenSharing(true);
      return true;
    }catch(error){
      for(const mediaTrack of stream?.getTracks?.() || []){ try{mediaTrack.stop();}catch{} }
      throw error;
    }
  }

  async function captureVoiceScreenSource(sourceId){
    if(!sourceId || screenSharePickerBusy)return;
    setScreenSharePickerBusy(true);
    setScreenSharePickerError('');
    try{
      const stream=await navigator.mediaDevices.getUserMedia({
        audio:false,
        video:{mandatory:{chromeMediaSource:'desktop',chromeMediaSourceId:String(sourceId),maxFrameRate:30}}
      });
      await activateVoiceScreenStream(stream);
      setScreenSharePickerOpen(false);
      setScreenShareSources([]);
    }catch(e){
      setScreenSharePickerError(e?.message || 'Não foi possível iniciar esta fonte. Tente outra tela ou janela.');
    }finally{
      setScreenSharePickerBusy(false);
    }
  }

  async function toggleVoiceScreen(){
    if(!voiceState.connected)return;
    if(voiceScreenSharing){
      await stopLocalVideo('screen');
      setVoiceScreenSharing(false);
      return;
    }
    if(voiceCameraOn){
      await stopLocalVideo('camera');
      setVoiceCameraOn(false);
    }
    setScreenSharePickerError('');
    const getDesktopSources=globalThis.window?.electronAPI?.getDesktopSources;
    if(typeof getDesktopSources === 'function'){
      setScreenSharePickerBusy(true);
      try{
        const sources=await getDesktopSources();
        if(!Array.isArray(sources) || sources.length===0) throw new Error('Nenhuma tela ou janela disponível para compartilhar.');
        setScreenShareSources(sources);
        setScreenSharePickerOpen(true);
      }catch(e){
        setAuthError(e?.message || 'Não foi possível listar as telas e janelas disponíveis.');
      }finally{
        setScreenSharePickerBusy(false);
      }
      return;
    }
    try{
      const stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:30}},audio:false});
      await activateVoiceScreenStream(stream);
    }catch(e){ setAuthError(e?.message || 'Não foi possível compartilhar a tela.'); }
  }
`;

      if (output.includes(oldScreenBlock)) {
        output = output.replace(oldScreenBlock, newScreenBlock);
        changed = true;
      }

      const modalMarker = '      {/* MODAL: WATCH2CHRONOS */}';
      if (output.includes(modalMarker) && !output.includes('cc-screen-share-picker')) {
        const picker = `      {screenSharePickerOpen && (
        <div className="cc-screen-share-picker" role="dialog" aria-modal="true" aria-labelledby="cc-screen-share-title" style={{position:'fixed',inset:0,zIndex:82,background:'rgba(5,4,10,.72)',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onMouseDown={(e)=>{if(e.target===e.currentTarget && !screenSharePickerBusy)setScreenSharePickerOpen(false);}}>
          <div style={{width:'min(920px,94vw)',maxHeight:'86vh',display:'flex',flexDirection:'column',overflow:'hidden',borderRadius:20,border:'1px solid '+T.border,background:T.bg2,boxShadow:'0 30px 90px rgba(0,0,0,.55)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,padding:'18px 20px 14px',borderBottom:'1px solid '+T.border}}>
              <div><div id="cc-screen-share-title" style={{fontFamily:FONT_DISPLAY,fontSize:19,fontWeight:800}}>Escolha o que compartilhar</div><div style={{fontSize:12.5,color:T.textDim,marginTop:4}}>Selecione uma tela inteira ou uma janela. O ChronoCord só inicia a transmissão depois da sua escolha.</div></div>
              <button type="button" aria-label="Fechar seletor de compartilhamento" disabled={screenSharePickerBusy} onClick={()=>setScreenSharePickerOpen(false)} style={{width:36,height:36,borderRadius:10,border:'1px solid '+T.border,background:T.bg1,color:T.textMain,cursor:screenSharePickerBusy?'wait':'pointer',fontSize:20,lineHeight:1}}>×</button>
            </div>
            <div style={{overflowY:'auto',padding:18}}>
              {screenSharePickerError && <div role="alert" style={{marginBottom:14,padding:'10px 12px',borderRadius:10,background:'rgba(226,87,76,.14)',border:'1px solid rgba(226,87,76,.35)',color:'#ffb2aa',fontSize:12.5}}>{screenSharePickerError}</div>}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:14}}>
                {screenShareSources.map(source=><button key={source.id} type="button" disabled={screenSharePickerBusy} title="Compartilhar esta fonte" aria-label={'Compartilhar esta fonte: '+source.name} onClick={()=>captureVoiceScreenSource(source.id)} style={{appearance:'none',padding:0,textAlign:'left',overflow:'hidden',borderRadius:14,border:'1px solid '+T.border,background:T.bg1,color:T.textMain,cursor:screenSharePickerBusy?'wait':'pointer'}}>
                  <div style={{aspectRatio:'16/9',background:'#09090d',display:'grid',placeItems:'center',overflow:'hidden'}}>{source.thumbnail?<img src={source.thumbnail} alt="" draggable="false" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<Icon name="screen" size={26} color={themeColor}/>}</div>
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 12px'}}>{source.appIcon?<img src={source.appIcon} alt="" style={{width:24,height:24,objectFit:'contain'}}/>:<div style={{width:24,height:24,borderRadius:7,display:'grid',placeItems:'center',background:themeColor+'22'}}><Icon name="screen" size={14} color={themeColor}/></div>}<div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:12.5,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{source.name}</div><div style={{fontSize:10.5,color:T.textFaint,marginTop:2}}>{source.type==='screen'?'Tela inteira':'Janela'}</div></div></div>
                </button>)}
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:10,padding:'12px 18px 16px',borderTop:'1px solid '+T.border}}><span style={{fontSize:11.5,color:T.textFaint,marginRight:'auto'}}>{screenSharePickerBusy?'Iniciando transmissão…':'Nada será transmitido até você selecionar uma fonte.'}</span><button type="button" disabled={screenSharePickerBusy} onClick={()=>setScreenSharePickerOpen(false)} style={{padding:'9px 14px',borderRadius:9,border:'1px solid '+T.border,background:T.bg1,color:T.textMain,cursor:screenSharePickerBusy?'wait':'pointer'}}>Cancelar</button></div>
          </div>
        </div>
      )}

`;
        output = output.replace(modalMarker, picker + modalMarker);
        changed = true;
      }

      if (!changed) return null;
      for (const marker of ['screenSharePickerOpen', 'chromeMediaSourceId', 'cc-screen-share-picker', 'validateVoiceScreenStream']) {
        if (!output.includes(marker)) throw new Error(`ChronoCord screen-share marker missing: ${marker}`);
      }
      return { code: output, map: null };
    },
  };
}
