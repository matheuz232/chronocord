import React from 'react';
import { ActionButton, RelatedSettingCard, SettingRow, SettingSection, SettingSelect, SettingToggle, SettingsNotice } from '../components/SettingControls.jsx';

function previewTone(frequency = 660, duration = 0.12) {
  try {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return false;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
    oscillator.addEventListener('ended', () => context.close().catch(() => {}), { once: true });
    return true;
  } catch {
    return false;
  }
}

export default function NotificationSettings({ settings, patch, navigate }) {
  const soundsDisabled = settings.notifications.disableAllNotificationSounds;
  const preview = (frequency) => previewTone(frequency);

  return (
    <>
      <SettingSection route="notifications.overview" title="Visão geral">
        <SettingRow label="Ativar notificações na área de trabalho" description="Permite ao ChronoCord exibir avisos quando o aplicativo estiver em segundo plano."><SettingToggle checked={settings.notifications.desktopEnabled} onChange={(value) => patch('notifications.desktopEnabled', value)} ariaLabel="Notificações na área de trabalho" /></SettingRow>
        <SettingRow label="Ativar alerta na barra de tarefas" description="Pisca o ícone do aplicativo quando chegarem novas notificações."><SettingToggle checked={settings.notifications.taskbarFlash} onChange={(value) => patch('notifications.taskbarFlash', value)} ariaLabel="Alerta na barra de tarefas" /></SettingRow>
        <div style={{ fontWeight: 650, fontSize: 12, margin: '14px 0 4px' }}>Notifique-me quando...</div>
        <SettingRow label="Pessoas que conheço começam a transmitir em pequenos servidores"><SettingToggle checked={settings.notifications.notifySmallServerStreams} onChange={(value) => patch('notifications.notifySmallServerStreams', value)} ariaLabel="Transmissões de conhecidos" /></SettingRow>
        <SettingRow label="Um amigo e eu chegamos a um aniversário de amizade"><SettingToggle checked={settings.notifications.notifyFriendAnniversary} onChange={(value) => patch('notifications.notifyFriendAnniversary', value)} ariaLabel="Aniversário de amizade" /></SettingRow>
        <SettingRow label="Amigos ficam online"><SettingToggle checked={settings.notifications.notifyFriendsOnline} onChange={(value) => patch('notifications.notifyFriendsOnline', value)} ariaLabel="Amigos online" /></SettingRow>
        <SettingRow label="Um servidor tem um evento futuro"><SettingToggle checked={settings.notifications.notifyUpcomingServerEvent} onChange={(value) => patch('notifications.notifyUpcomingServerEvent', value)} ariaLabel="Evento futuro" /></SettingRow>
        <SettingRow label="Alguém reage às minhas mensagens"><SettingSelect value={settings.notifications.reactionNotifications} onChange={(value) => patch('notifications.reactionNotifications', value)} options={[{ value: 'all', label: 'Todas as mensagens' }, { value: 'mentions', label: 'Somente menções' }, { value: 'none', label: 'Nenhuma' }]} ariaLabel="Notificações de reação" /></SettingRow>
      </SettingSection>

      <SettingSection route="notifications.sounds" title="Sons">
        <SettingRow label="Nova mensagem" disabled={soundsDisabled}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ActionButton tone="ghost" onClick={() => preview(660)} disabled={soundsDisabled}>Prévia do som</ActionButton><SettingToggle checked={settings.notifications.soundNewMessage && !soundsDisabled} onChange={(value) => patch('notifications.soundNewMessage', value)} disabled={soundsDisabled} ariaLabel="Som de nova mensagem" /></div></SettingRow>
        <SettingRow label="Nova mensagem no canal que estou lendo atualmente" disabled={soundsDisabled}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ActionButton tone="ghost" onClick={() => preview(740)} disabled={soundsDisabled}>Prévia do som</ActionButton><SettingToggle checked={settings.notifications.soundCurrentChannelMessage && !soundsDisabled} onChange={(value) => patch('notifications.soundCurrentChannelMessage', value)} disabled={soundsDisabled} ariaLabel="Som no canal atual" /></div></SettingRow>
        <SettingRow label="Toque de chamada recebida" disabled={soundsDisabled}><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><ActionButton tone="ghost" onClick={() => preview(520)} disabled={soundsDisabled}>Prévia do som</ActionButton><SettingToggle checked={settings.notifications.soundIncomingCall && !soundsDisabled} onChange={(value) => patch('notifications.soundIncomingCall', value)} disabled={soundsDisabled} ariaLabel="Som de chamada recebida" /></div></SettingRow>
        <SettingRow label="Desativar todos os sons de notificação" description="Mantém suas preferências individuais salvas para quando você reativar o áudio."><SettingToggle checked={soundsDisabled} onChange={(value) => patch('notifications.disableAllNotificationSounds', value)} ariaLabel="Desativar sons de notificação" /></SettingRow>
        <RelatedSettingCard title="Voz e vídeo" description="Gerencie sons de entrada, silenciar, reativar áudio e painel de efeitos." onClick={() => navigate?.('voice.sounds')} icon="♬" />
      </SettingSection>

      <SettingSection route="notifications.badges" title="Insígnias">
        <SettingRow label="Ativar indicador de mensagens não lidas" description="Mostra um indicador no ícone do aplicativo quando houver mensagens não lidas."><SettingToggle checked={settings.notifications.unreadBadge} onChange={(value) => patch('notifications.unreadBadge', value)} ariaLabel="Indicador de não lidas" /></SettingRow>
      </SettingSection>

      <SettingSection route="notifications.email" title="E-mail">
        <SettingRow label="E-mails de comunicação" description="Preferência local para ligações perdidas, mensagens e resumos."><SettingToggle checked={settings.notifications.emailCommunication} onChange={(value) => patch('notifications.emailCommunication', value)} ariaLabel="E-mails de comunicação" /></SettingRow>
        <SettingRow label="E-mails sociais" description="Pedidos de amizade, sugestões e eventos."><SettingToggle checked={settings.notifications.emailSocial} onChange={(value) => patch('notifications.emailSocial', value)} ariaLabel="E-mails sociais" /></SettingRow>
        <SettingRow label="E-mails de atualização e anúncios"><SettingToggle checked={settings.notifications.emailProductUpdates} onChange={(value) => patch('notifications.emailProductUpdates', value)} ariaLabel="E-mails de atualização" /></SettingRow>
        <SettingRow label="E-mails com dicas"><SettingToggle checked={settings.notifications.emailTips} onChange={(value) => patch('notifications.emailTips', value)} ariaLabel="E-mails com dicas" /></SettingRow>
        <SettingRow label="E-mails de recomendações"><SettingToggle checked={settings.notifications.emailRecommendations} onChange={(value) => patch('notifications.emailRecommendations', value)} ariaLabel="E-mails de recomendações" /></SettingRow>
        <SettingRow label="Cancelar inscrição para e-mails de marketing" description="Somente preferência local nesta etapa."><ActionButton tone="danger" onClick={() => patch('notifications.emailMarketingUnsubscribed', true)} disabled={settings.notifications.emailMarketingUnsubscribed}>{settings.notifications.emailMarketingUnsubscribed ? 'Inscrição cancelada localmente' : 'Cancelar inscrição'}</ActionButton></SettingRow>
      </SettingSection>

      <SettingSection route="notifications.advanced" title="Avançado">
        <SettingRow label="Agrupar notificações quando eu estiver ocupado" description="Reduz repetições locais quando várias notificações semelhantes chegarem em sequência."><SettingToggle checked={settings.notifications.aggregateWhenBusy} onChange={(value) => patch('notifications.aggregateWhenBusy', value)} ariaLabel="Agrupar notificações" /></SettingRow>
        <SettingsNotice>Algumas integrações com notificações nativas do Windows serão conectadas quando a camada final de sistema estiver pronta.</SettingsNotice>
      </SettingSection>
    </>
  );
}
