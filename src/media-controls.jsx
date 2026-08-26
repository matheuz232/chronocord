import React, { useEffect, useRef, useState } from 'react';

const MIC_STORAGE_KEY = 'chronocord.selectedMicrophone';

function readSelectedMicrophone() {
  try { return localStorage.getItem(MIC_STORAGE_KEY) || ''; } catch { return ''; }
}
function writeSelectedMicrophone(deviceId) {
  try {
    if (deviceId) localStorage.setItem(MIC_STORAGE_KEY, deviceId);
    else localStorage.removeItem(MIC_STORAGE_KEY);
  } catch {}
}

function withSelectedAudioDevice(constraints, deviceId) {
  if (!deviceId || !constraints || constraints.audio === false) return constraints;
  const audio = constraints.audio === true ? {} : { ...constraints.audio };
  if (audio.deviceId) return constraints;
  return { ...constraints, audio: { ...audio, deviceId: { exact: deviceId } } };
}

function desktopVideoConstraints(sourceId) {
  return {
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId,
      },
    },
    audio: false,
  };
}

let installed = false;
let originalGetUserMedia = null;
let originalGetDisplayMedia = null;

function installMediaOverrides() {
  if (installed || !navigator.mediaDevices) return;
  installed = true;
  originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia?.bind(navigator.mediaDevices);

  navigator.mediaDevices.getUserMedia = async (constraints = {}) => {
    const selected = readSelectedMicrophone();
    if (!selected || constraints.audio === false) return originalGetUserMedia(constraints);
    try {
      return await originalGetUserMedia(withSelectedAudioDevice(constraints, selected));
    } catch (error) {
      // A disconnected/replaced microphone must not make every voice join fail.
      if (error?.name === 'OverconstrainedError' || error?.name === 'NotFoundError') {
        writeSelectedMicrophone('');
        return originalGetUserMedia(constraints);
      }
      throw error;
    }
  };

  if (originalGetDisplayMedia) {
    navigator.mediaDevices.getDisplayMedia = async (constraints = {}) => {
      const bridge = globalThis.window?.electronAPI;
      if (!bridge?.getDesktopSources) return originalGetDisplayMedia(constraints);
      const sources = await bridge.getDesktopSources();
      if (!Array.isArray(sources) || !sources.length) throw new Error('Nenhuma tela ou janela disponível para compartilhar.');

      const selected = await new Promise((resolve, reject) => {
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const handler = (event) => {
          if (event.detail?.requestId !== requestId) return;
          window.removeEventListener('chronocord:desktop-source-selected', handler);
          if (event.detail.sourceId) resolve(event.detail.sourceId);
          else reject(new DOMException('Seleção de tela cancelada.', 'AbortError'));
        };
        window.addEventListener('chronocord:desktop-source-selected', handler);
        window.dispatchEvent(new CustomEvent('chronocord:desktop-source-request', { detail: { requestId, sources } }));
      });

      return originalGetUserMedia(desktopVideoConstraints(selected));
    };
  }
}

export function restoreMediaOverrides() {
  if (!installed || !navigator.mediaDevices) return;
  if (originalGetUserMedia) navigator.mediaDevices.getUserMedia = originalGetUserMedia;
  if (originalGetDisplayMedia) navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
  installed = false;
}

export function MediaControls() {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selected, setSelected] = useState(readSelectedMicrophone());
  const [level, setLevel] = useState(0);
  const [micError, setMicError] = useState('');
  const [screenRequest, setScreenRequest] = useState(null);
  const analyserRef = useRef(null);
  const levelTimerRef = useRef(null);
  const testStreamRef = useRef(null);

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter((device) => device.kind === 'audioinput');
      setDevices(inputs);
      if (selected && !inputs.some((device) => device.deviceId === selected)) {
        setSelected('');
        writeSelectedMicrophone('');
      }
    } catch (error) {
      setMicError(error?.message || 'Não foi possível listar os microfones.');
    }
  }

  useEffect(() => {
    installMediaOverrides();
    refreshDevices();
    const onDeviceChange = () => refreshDevices();
    const onScreenRequest = (event) => setScreenRequest(event.detail);
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);
    window.addEventListener('chronocord:desktop-source-request', onScreenRequest);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange);
      window.removeEventListener('chronocord:desktop-source-request', onScreenRequest);
      stopTest();
    };
  }, []);

  function stopTest() {
    if (levelTimerRef.current) clearInterval(levelTimerRef.current);
    levelTimerRef.current = null;
    try { testStreamRef.current?.getTracks().forEach((track) => track.stop()); } catch {}
    testStreamRef.current = null;
    try { analyserRef.current?.context?.close?.(); } catch {}
    analyserRef.current = null;
    setLevel(0);
  }

  async function testMicrophone() {
    stopTest();
    setMicError('');
    try {
      const constraints = { audio: selected ? { deviceId: { exact: selected }, echoCancellation: true, noiseSuppression: true, autoGainControl: true } : true, video: false };
      const stream = await originalGetUserMedia(constraints);
      testStreamRef.current = stream;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.fftSize);
      levelTimerRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) { const n = (value - 128) / 128; sum += n * n; }
        setLevel(Math.min(100, Math.round(Math.sqrt(sum / data.length) * 180)));
      }, 80);
    } catch (error) {
      setMicError(error?.message || 'Não foi possível testar este microfone.');
    }
  }

  function chooseMicrophone(deviceId) {
    setSelected(deviceId);
    writeSelectedMicrophone(deviceId);
    setMicError('');
  }

  function chooseScreen(requestId, sourceId) {
    setScreenRequest(null);
    window.dispatchEvent(new CustomEvent('chronocord:desktop-source-selected', { detail: { requestId, sourceId } }));
  }

  function cancelScreen(requestId) {
    setScreenRequest(null);
    window.dispatchEvent(new CustomEvent('chronocord:desktop-source-selected', { detail: { requestId, sourceId: '' } }));
  }

  const selectedName = devices.find((device) => device.deviceId === selected)?.label || (selected ? 'Microfone selecionado' : 'Microfone padrão');

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); if (!open) refreshDevices(); }}
        title="Dispositivos de áudio"
        aria-label="Dispositivos de áudio"
        style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 9998, width: 46, height: 46, border: '1px solid rgba(255,255,255,.14)', borderRadius: 14, background: '#17132a', color: '#fff', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,.35)', fontSize: 20 }}
      >🎤</button>

      {open && (
        <div style={{ position: 'fixed', right: 18, bottom: 74, zIndex: 9999, width: 360, maxWidth: 'calc(100vw - 36px)', padding: 18, borderRadius: 16, border: '1px solid rgba(255,255,255,.12)', background: '#17132a', color: '#f7f4ff', boxShadow: '0 24px 70px rgba(0,0,0,.5)', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 5 }}>Dispositivos de áudio</div>
          <div style={{ color: '#aaa1bf', fontSize: 12, marginBottom: 14 }}>Escolha o microfone usado nas chamadas do ChronoCord.</div>
          <select value={selected} onChange={(event) => chooseMicrophone(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #3a3158', background: '#0f0c1c', color: '#fff', outline: 'none' }}>
            <option value="">Microfone padrão — {selectedName}</option>
            {devices.map((device, index) => <option key={device.deviceId || `input-${index}`} value={device.deviceId}>{device.label || `Microfone ${index + 1}`}</option>)}
          </select>
          <div style={{ marginTop: 14, fontSize: 12, color: '#aaa1bf' }}>Nível do microfone</div>
          <div style={{ height: 8, marginTop: 7, borderRadius: 99, overflow: 'hidden', background: '#2b2540' }}><div style={{ width: `${level}%`, height: '100%', background: '#3fd9be', transition: 'width .08s linear' }} /></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" onClick={level ? stopTest : testMicrophone} style={{ flex: 1, border: 0, borderRadius: 9, padding: '9px 10px', background: '#8c5cff', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{level ? 'Parar teste' : 'Testar microfone'}</button>
            <button type="button" onClick={refreshDevices} style={{ border: '1px solid #3a3158', borderRadius: 9, padding: '9px 12px', background: '#211b38', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Atualizar</button>
          </div>
          {micError && <div style={{ marginTop: 10, color: '#ff9f9f', fontSize: 12 }}>{micError}</div>}
        </div>
      )}

      {screenRequest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(4,3,9,.72)', backdropFilter: 'blur(8px)', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ width: 'min(820px, 100%)', maxHeight: '80vh', overflow: 'auto', padding: 22, borderRadius: 18, border: '1px solid rgba(255,255,255,.14)', background: '#17132a', color: '#fff', boxShadow: '0 30px 100px rgba(0,0,0,.55)' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Escolha o que compartilhar</div>
            <div style={{ color: '#aaa1bf', fontSize: 12, margin: '5px 0 16px' }}>Selecione uma tela ou uma janela aberta.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
              {screenRequest.sources.map((source) => (
                <button key={source.id} type="button" onClick={() => chooseScreen(screenRequest.requestId, source.id)} style={{ padding: 10, textAlign: 'left', border: '1px solid #3a3158', borderRadius: 12, background: '#0f0c1c', color: '#fff', cursor: 'pointer' }}>
                  {source.thumbnail ? <img src={source.thumbnail} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8, display: 'block', marginBottom: 8 }} /> : <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 8, background: '#27213d', display: 'grid', placeItems: 'center', marginBottom: 8 }}>🖥️</div>}
                  <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{source.name}</div>
                  <div style={{ color: '#8f87a8', fontSize: 11 }}>{source.type === 'screen' ? 'Tela' : 'Janela'}</div>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => cancelScreen(screenRequest.requestId)} style={{ marginTop: 16, width: '100%', border: '1px solid #3a3158', borderRadius: 10, padding: 10, background: '#211b38', color: '#fff', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}

export { withSelectedAudioDevice, desktopVideoConstraints };
