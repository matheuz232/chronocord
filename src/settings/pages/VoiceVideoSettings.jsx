import React from 'react';
import { ActionButton, RelatedSettingCard, SettingCard, SettingRange, SettingRow, SettingSection, SettingSelect, SettingToggle, SettingsNotice } from '../components/SettingControls.jsx';

function tone(freq = 520) {
  try {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
    osc.addEventListener('ended', () => ctx.close().catch(() => {}), { once: true });
  } catch {}
}

const toOptions = (items, fallback) => {
  if (Array.isArray(items) && items.length) return items.map((item) => typeof item === 'string' ? { value: item, label: item } : { value: item.deviceId || item.value || item.label, label: item.label || item.name || item.deviceId || 'Dispositivo' });
  return fallback.map((value) => ({ value, label: value }));
};

export default function VoiceVideoSettings({ settings, patch, resetSubtree, navigate, legacy }) {
  const inputOptions = toOptions(legacy?.inputDevices, ['Microfone padrão', 'Headset USB', 'Microfone da webcam']);
  const outputOptions = toOptions(legacy?.outputDevices, ['Alto-falantes padrão', 'Fones de ouvido']);
  const cameraOptions = toOptions(legacy?.cameraDevices, ['Webcam padrão', 'Câmera USB externa', 'Câmera virtual']);
  const soundEvents = settings.voiceVideo.soundEvents;

  const resetVoice = () => {
    resetSubtree('voiceVideo');
    legacy?.setInputVol?.(72);
    legacy?.setOutputVol?.(85);
    legacy?.setCameraBg?.('Nenhum');
    legacy?.setStreamQuality?.('720p 30fps');
    legacy?.setStreamAudio?.(true);
    legacy?.setSoundboardVolume?.(100);
  };

  return (
    <>
      <SettingSection route="voice.voice" title="Voz" description="Selecione e identifique os dispositivos usados nas chamadas.">
        <SettingRow label="Dispositivo de entrada" description="O ChronoCord usa o dispositivo escolhido para o microfone.">
          <SettingSelect value={legacy?.voiceIn || inputOptions[0]?.value} onChange={(value) => legacy?.setVoiceIn?.(value)} options={inputOptions} ariaLabel="Dispositivo de entrada" />
        </SettingRow>
        <SettingRow label={`Volume de entrada: ${legacy?.inputVol ?? 72}%`} vertical><SettingRange value={legacy?.inputVol ?? 72} onChange={(value) => legacy?.setInputVol?.(value)} ariaLabel="Volume de entrada" /></SettingRow>
        <SettingRow label="Dispositivo de saída"><SettingSelect value={legacy?.voiceOut || outputOptions[0]?.value} onChange={(value) => legacy?.setVoiceOut?.(value)} options={outputOptions} ariaLabel="Dispositivo de saída" /></SettingRow>
        <SettingRow label={`Volume de saída: ${legacy?.outputVol ?? 85}%`} vertical><SettingRange value={legacy?.outputVol ?? 85} onChange={(value) => legacy?.setOutputVol?.(value)} ariaLabel="Volume de saída" /></SettingRow>
      </SettingSection>

      <SettingSection route="voice.camera" title="Câmera">
        <SettingCard title="Prévia" description="A prévia real será exibida quando o fluxo de câmera já estiver ativo no Electron.">
          <div style={{ height: 150, borderRadius: 9, background: 'linear-gradient(135deg,var(--cc-bg-1),var(--cc-bg-4))', display: 'grid', placeItems: 'center', color: 'var(--cc-text-faint)', fontSize: 11 }}>▣ Pré-visualização da câmera</div>
        </SettingCard>
        <SettingRow label="Dispositivo de vídeo"><SettingSelect value={legacy?.cameraDevice || cameraOptions[0]?.value} onChange={(value) => legacy?.setCameraDevice?.(value)} options={cameraOptions} ariaLabel="Dispositivo de vídeo" /></SettingRow>
        <SettingRow label="Plano de fundo"><SettingSelect value={legacy?.cameraBg || 'Nenhum'} onChange={(value) => legacy?.setCameraBg?.(value)} options={['Nenhum', 'Desfoque leve', 'Desfoque forte']} ariaLabel="Plano de fundo da câmera" /></SettingRow>
      </SettingSection>

      <SettingSection route="voice.stream" title="Transmissão">
        <SettingRow label="Mostrar prévias da transmissão" description="Permite que outras pessoas vejam uma prévia antes de entrarem na transmissão."><SettingToggle checked={settings.voiceVideo.streamPreviews} onChange={(value) => patch('voiceVideo.streamPreviews', value)} ariaLabel="Prévias da transmissão" /></SettingRow>
        <SettingRow label="Qualidade da transmissão de tela"><SettingSelect value={legacy?.streamQuality || '720p 30fps'} onChange={(value) => legacy?.setStreamQuality?.(value)} options={['720p 30fps', '1080p 60fps', 'Fonte 4K 60fps']} ariaLabel="Qualidade da transmissão" /></SettingRow>
        <SettingRow label="Transmitir áudio do computador"><SettingToggle checked={legacy?.streamAudio ?? true} onChange={(value) => legacy?.setStreamAudio?.(value)} ariaLabel="Transmitir áudio do computador" /></SettingRow>
        <SettingRow label="Mostrar Configurações Avançadas da Transmissão" description="Atenuação, intensidade e outros controles locais."><ActionButton onClick={() => patch('voiceVideo.advancedStreamExpanded', !settings.voiceVideo.advancedStreamExpanded)}>{settings.voiceVideo.advancedStreamExpanded ? 'Ocultar' : 'Mostrar'}⌄</ActionButton></SettingRow>
        {settings.voiceVideo.advancedStreamExpanded && <SettingCard title="Configurações avançadas"><SettingRow label="Priorizar fluidez sobre nitidez" description="Preferência visual para o futuro encoder adaptativo."><SettingToggle checked={false} onChange={() => {}} ariaLabel="Priorizar fluidez" /></SettingRow><SettingsNotice>As opções avançadas de encoder só terão efeito real quando o pipeline final de transmissão for conectado.</SettingsNotice></SettingCard>}
      </SettingSection>

      <SettingSection route="voice.sounds" title="Sons">
        {[['mute', 'Desativar áudio', 360], ['unmute', 'Reativar áudio', 520], ['deafen', 'Silenciar', 300], ['undeafen', 'Dessilenciar', 620]].map(([key, label, freq]) => (
          <SettingRow key={key} label={label}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ActionButton tone="ghost" onClick={() => tone(freq)}>Prévia do som</ActionButton><SettingToggle checked={soundEvents[key]} onChange={(value) => patch(`voiceVideo.soundEvents.${key}`, value)} ariaLabel={`Som ${label}`} /></div></SettingRow>
        ))}
        <SettingRow label="Mostrar 18 mais sons" description="Câmera ligada, câmera desligada, voz desconectada e mais."><ActionButton onClick={() => patch('voiceVideo.moreSoundsExpanded', !settings.voiceVideo.moreSoundsExpanded)}>{settings.voiceVideo.moreSoundsExpanded ? 'Ocultar' : 'Mostrar'}⌄</ActionButton></SettingRow>
        {settings.voiceVideo.moreSoundsExpanded && <SettingCard><div className="cc-settings-choice-grid">{['Câmera ligada', 'Câmera desligada', 'Entrou na chamada', 'Saiu da chamada', 'Compartilhamento iniciado', 'Compartilhamento encerrado'].map((name, index) => <button key={name} type="button" className="cc-settings-choice" onClick={() => tone(420 + index * 55)}><strong>{name}</strong><small>Prévia</small></button>)}</div></SettingCard>}
        <RelatedSettingCard title="Notificações" description="Ativar/desativar sons para novas mensagens e chamadas recebidas." onClick={() => navigate?.('notifications.sounds')} icon="●" />
      </SettingSection>

      <SettingSection route="voice.soundboard" title="Painel de efeitos sonoros">
        <SettingRow label={`Volume dos efeitos sonoros: ${settings.voiceVideo.soundboardVolume}%`} vertical><SettingRange value={settings.voiceVideo.soundboardVolume} onChange={(value) => { patch('voiceVideo.soundboardVolume', value); legacy?.setSoundboardVolume?.(value); }} ariaLabel="Volume dos efeitos sonoros" /></SettingRow>
        <SettingRow label="Escolha um servidor"><SettingSelect value={settings.voiceVideo.entranceSoundServer} onChange={(value) => patch('voiceVideo.entranceSoundServer', value)} options={[{ value: 'all', label: 'Todos os servidores' }, { value: 'current', label: 'Servidor atual' }]} ariaLabel="Servidor do som de entrada" /></SettingRow>
        <SettingRow label="Escolha um som"><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><SettingSelect value={settings.voiceVideo.entranceSound || ''} onChange={(value) => patch('voiceVideo.entranceSound', value || null)} options={[{ value: '', label: 'Nenhum 🔊' }, { value: 'chime', label: 'Pulso Cronal' }, { value: 'glass', label: 'Cristal' }, { value: 'soft', label: 'Entrada suave' }]} ariaLabel="Som de entrada" /><ActionButton onClick={() => tone(570)}>▶</ActionButton></div></SettingRow>
        <SettingCard title="Efeitos disponíveis" description="O painel real do servidor continua usando o sistema de efeitos do ChronoCord."><div className="cc-settings-choice-grid">{['Aplausos', 'Risada', 'Tambores', 'Alarme cronal', 'Vitória', 'Erro'].map((sound) => <button type="button" className="cc-settings-choice" key={sound} onClick={() => legacy?.playSound?.(sound)}><strong>{sound}</strong><small>{legacy?.playingSound === sound ? 'Tocando…' : 'Reproduzir'}</small></button>)}</div></SettingCard>
      </SettingSection>

      <SettingSection route="voice.advanced" title="Avançado">
        <SettingRow label="Mostrar Configurações de diagnóstico" description="Exibe informações técnicas locais para suporte."><ActionButton onClick={() => patch('voiceVideo.diagnosticsExpanded', !settings.voiceVideo.diagnosticsExpanded)}>{settings.voiceVideo.diagnosticsExpanded ? 'Ocultar' : 'Mostrar'}⌄</ActionButton></SettingRow>
        {settings.voiceVideo.diagnosticsExpanded && <SettingsNotice>Dispositivo de entrada: {legacy?.voiceIn || 'padrão'} · saída: {legacy?.voiceOut || 'padrão'} · qualidade: {legacy?.streamQuality || '720p 30fps'}.</SettingsNotice>}
        <SettingRow label="Redefinir todas as configurações de Voz e vídeo" description="Restaura somente preferências. Uma chamada ativa não será desconectada."><ActionButton tone="danger" onClick={resetVoice}>Redefinir</ActionButton></SettingRow>
      </SettingSection>
    </>
  );
}
