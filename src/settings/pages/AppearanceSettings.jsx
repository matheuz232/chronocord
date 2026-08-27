import React from 'react';
import { ActionButton, RelatedSettingCard, SettingCard, SettingRadio, SettingRow, SettingSection, SettingSelect, SettingToggle, SettingsNotice } from '../components/SettingControls.jsx';

const themePresets = [
  { id: 'light', label: 'Claro', mode: 'branco', accent: '#6D46FF', bg: '#f4f3f8', text: '#1c1830' },
  { id: 'chronocord', label: 'ChronoCord', mode: 'original', accent: '#9B4DFF', bg: 'linear-gradient(135deg,#161126,#392458)', text: '#fff' },
  { id: 'graphite', label: 'Grafite', mode: 'preto', accent: '#8C7CFF', bg: '#101014', text: '#fff' },
  { id: 'oled', label: 'OLED', mode: 'preto', accent: '#B07DF0', bg: '#000', text: '#fff' },
  { id: 'forest', label: 'Floresta', mode: 'original', accent: '#57C765', bg: 'linear-gradient(135deg,#102719,#274733)', text: '#fff' },
  { id: 'sunset', label: 'Pôr do sol', mode: 'original', accent: '#E86B9A', bg: 'linear-gradient(135deg,#52243e,#e08165)', text: '#fff' },
  { id: 'ocean', label: 'Oceano', mode: 'original', accent: '#5B8CFF', bg: 'linear-gradient(135deg,#102341,#285d8f)', text: '#fff' },
  { id: 'aurora', label: 'Aurora', mode: 'original', accent: '#3FD9BE', bg: 'linear-gradient(135deg,#142533,#594099,#38b59f)', text: '#fff' },
  { id: 'amber', label: 'Âmbar', mode: 'original', accent: '#E8A33D', bg: 'linear-gradient(135deg,#30200d,#8e561d)', text: '#fff' },
];

const iconVariants = [
  ['default', '#21183c'], ['midnight', '#07070b'], ['violet', '#5e35b1'], ['ocean', '#174b73'], ['mint', '#1f6b5f'], ['sunset', '#8c315a'], ['gold', '#79520f'], ['ice', '#54768c'], ['rose', '#7a3658'], ['cosmic', '#2a1a56'], ['paper', '#eeeef4'], ['ember', '#562318'],
];

export default function AppearanceSettings({ settings, patch, legacy, navigate }) {
  const applyTheme = (preset) => {
    patch('appearance.themePreset', preset.id);
    legacy?.setThemeMode?.(preset.mode);
    legacy?.setThemeColor?.(preset.accent);
    legacy?.setHexDraft?.(preset.accent);
    legacy?.setHexError?.(false);
  };

  const accent = legacy?.themeColor || '#9B4DFF';

  return (
    <>
      <SettingSection route="appearance.theme" title="Tema">
        <div style={{ fontSize: 12, fontWeight: 650, marginBottom: 9 }}>Temas padrão</div>
        <div className="cc-theme-grid">
          {themePresets.map((preset) => <button key={preset.id} type="button" className={`cc-theme-tile${settings.appearance.themePreset === preset.id ? ' is-active' : ''}`} style={{ '--tile-bg': preset.bg, '--tile-text': preset.text }} onClick={() => applyTheme(preset)}><span>{preset.label}</span></button>)}
        </div>
        <SettingCard title="Deixe o ChronoCord do seu jeitinho" description="Ajuste a cor principal e experimente sua identidade visual.">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="color" value={accent} onChange={(event) => { const value = event.target.value; patch('appearance.customTheme', { accent: value }); patch('appearance.themePreset', 'custom'); legacy?.setThemeColor?.(value); legacy?.setHexDraft?.(value); }} style={{ width: 48, height: 40, border: 0, background: 'transparent' }} aria-label="Cor do tema" />
            <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11 }}>{accent}</span>
            <ActionButton tone="primary" onClick={() => patch('appearance.themePreset', 'custom')}>Experimentar</ActionButton>
          </div>
        </SettingCard>
        <SettingRow label="Sincronizar tema em meus dispositivos" description="Preferência local até a sincronização de conta final."><SettingToggle checked={settings.appearance.syncTheme} onChange={(value) => patch('appearance.syncTheme', value)} ariaLabel="Sincronizar tema" /></SettingRow>
        <SettingRow label="Aplicar tema aos perfis de outros usuários"><SettingToggle checked={settings.appearance.applyThemeToProfiles} onChange={(value) => patch('appearance.applyThemeToProfiles', value)} ariaLabel="Aplicar tema aos perfis" /></SettingRow>
        <SettingRow label="Tema padrão nos servidores"><SettingSelect value={settings.appearance.serverThemeMode} onChange={(value) => patch('appearance.serverThemeMode', value)} options={[{ value: 'server', label: 'Usar o tema do servidor' }, { value: 'mine', label: 'Usar meu tema' }, { value: 'neutral', label: 'Tema neutro' }]} ariaLabel="Tema padrão dos servidores" /></SettingRow>
      </SettingSection>

      <SettingSection route="appearance.appIcon" title="Ícone do aplicativo" description="Escolha uma variação visual local. O executável e os atalhos do Windows continuam usando a logo oficial nesta fase.">
        <div className="cc-icon-grid">
          {iconVariants.map(([id, color]) => <button type="button" key={id} className={`cc-app-icon-choice${settings.appearance.appIcon === id ? ' is-active' : ''}`} onClick={() => patch('appearance.appIcon', id)} style={{ background: color }} title={id}><img src="/assets/chronocord-logo.svg" alt="" /></button>)}
        </div>
        <SettingsNotice>Essa seleção muda somente superfícies internas de prévia. Trocar o ícone instalado do Windows dinamicamente será feito na integração final.</SettingsNotice>
      </SettingSection>

      <SettingSection route="appearance.messages" title="Mensagens">
        <div style={{ fontWeight: 650, fontSize: 12, marginBottom: 5 }}>Mostrar imagens, vídeos e memes...</div>
        <SettingRow label="Quando publicados como links no chat"><SettingToggle checked={settings.appearance.media.linkedMedia} onChange={(value) => patch('appearance.media.linkedMedia', value)} ariaLabel="Mídia de links" /></SettingRow>
        <SettingRow label="Quando o envio é feito diretamente ao ChronoCord"><SettingToggle checked={settings.appearance.media.uploadedMedia} onChange={(value) => patch('appearance.media.uploadedMedia', value)} ariaLabel="Mídia enviada" /></SettingRow>
        <SettingRow label="Mostrar anexos e prévia de links"><SettingToggle checked={settings.appearance.media.linkPreviews} onChange={(value) => patch('appearance.media.linkPreviews', value)} ariaLabel="Prévias de links" /></SettingRow>
        <SettingRow label="Mostrar reações de emoji"><SettingToggle checked={settings.appearance.media.emojiReactions} onChange={(value) => patch('appearance.media.emojiReactions', value)} ariaLabel="Reações de emoji" /></SettingRow>
        <SettingRow label="Mostrar spoilers"><SettingSelect value={settings.appearance.media.spoilers} onChange={(value) => patch('appearance.media.spoilers', value)} options={[{ value: 'click', label: 'Ao clicar' }, { value: 'always', label: 'Sempre' }, { value: 'never', label: 'Nunca revelar automaticamente' }]} ariaLabel="Exibição de spoilers" /></SettingRow>
        <SettingRow label="Abrir tópicos em janela dividida"><SettingToggle checked={settings.appearance.media.splitThreads} onChange={(value) => patch('appearance.media.splitThreads', value)} ariaLabel="Tópicos em janela dividida" /></SettingRow>
        <SettingRow label="Mostrar avatares dos usuários"><SettingToggle checked={settings.appearance.media.showAvatars} onChange={(value) => patch('appearance.media.showAvatars', value)} ariaLabel="Mostrar avatares" /></SettingRow>
        <RelatedSettingCard title="Acessibilidade" description="Ajuste densidade visual, tamanho do texto e contraste." onClick={() => navigate?.('accessibility.readability')} icon="◎" />
      </SettingSection>

      <SettingSection route="appearance.chatBox" title="Caixa de chat">
        <SettingRow label="Prévia emojis, menções e sintaxe de markdown enquanto digita"><SettingToggle checked={settings.appearance.chatBox.liveMarkdownPreview} onChange={(value) => patch('appearance.chatBox.liveMarkdownPreview', value)} ariaLabel="Prévia de markdown" /></SettingRow>
        <SettingRow label="Converter automaticamente emoticons em emojis"><SettingToggle checked={settings.appearance.chatBox.emoticonsToEmoji} onChange={(value) => patch('appearance.chatBox.emoticonsToEmoji', value)} ariaLabel="Converter emoticons" /></SettingRow>
        <SettingRow label="Mostrar figurinhas nos resultados de preenchimento automático"><SettingToggle checked={settings.appearance.chatBox.autocompleteStickers} onChange={(value) => patch('appearance.chatBox.autocompleteStickers', value)} ariaLabel="Figurinhas no autocomplete" /></SettingRow>
        <SettingRow label="Mostrar jogos nos resultados de preenchimento automático"><SettingToggle checked={settings.appearance.chatBox.autocompleteGames} onChange={(value) => patch('appearance.chatBox.autocompleteGames', value)} ariaLabel="Jogos no autocomplete" /></SettingRow>
        <SettingRow label="Mostrar botão de enviar mensagem"><SettingToggle checked={settings.appearance.chatBox.showSendButton} onChange={(value) => patch('appearance.chatBox.showSendButton', value)} ariaLabel="Botão enviar" /></SettingRow>
      </SettingSection>

      <SettingSection route="appearance.search" title="Buscar">
        <div style={{ fontSize: 12, fontWeight: 650, marginBottom: 5 }}>Por padrão, buscando nas mensagens diretas...</div>
        <SettingRadio name="dm-search" checked={settings.appearance.dmSearchScope === 'selected'} onChange={() => patch('appearance.dmSearchScope', 'selected')} label="Busca apenas nas mensagens diretas selecionadas" />
        <SettingRadio name="dm-search" checked={settings.appearance.dmSearchScope === 'all'} onChange={() => patch('appearance.dmSearchScope', 'all')} label="Busca em todas as minhas mensagens diretas" />
      </SettingSection>

      <SettingSection route="appearance.streamer" title="Modo streamer">
        <SettingRow label="Ativar modo streamer" description="Oculta visualmente informações pessoais conforme as preferências abaixo."><SettingToggle checked={settings.appearance.streamer.enabled} onChange={(value) => patch('appearance.streamer.enabled', value)} ariaLabel="Modo streamer" /></SettingRow>
        <SettingRow label="Ativar automaticamente o Modo streamer se OBS ou XSplit estiverem em execução" description="A preferência fica pronta agora; detecção real de processos virá na integração final."><SettingToggle checked={settings.appearance.streamer.autoDetectStreamingApps} onChange={(value) => patch('appearance.streamer.autoDetectStreamingApps', value)} ariaLabel="Detectar apps de streaming" /></SettingRow>
        <div style={{ fontSize: 12, fontWeight: 650, margin: '12px 0 4px' }}>Se o modo streamer estiver habilitado...</div>
        <SettingRow label="Ocultar meus dados pessoais, como e-mail, contas conectadas e notas"><SettingToggle checked={settings.appearance.streamer.hidePersonalData} onChange={(value) => patch('appearance.streamer.hidePersonalData', value)} ariaLabel="Ocultar dados pessoais" /></SettingRow>
        <SettingRow label="Ocultar links de convite para meus servidores"><SettingToggle checked={settings.appearance.streamer.hideInviteLinks} onChange={(value) => patch('appearance.streamer.hideInviteLinks', value)} ariaLabel="Ocultar convites" /></SettingRow>
        <SettingRow label="Desativar todos os efeitos de som"><SettingToggle checked={settings.appearance.streamer.disableSounds} onChange={(value) => patch('appearance.streamer.disableSounds', value)} ariaLabel="Desativar sons no streamer" /></SettingRow>
        <SettingRow label="Desativar notificações"><SettingToggle checked={settings.appearance.streamer.disableNotifications} onChange={(value) => patch('appearance.streamer.disableNotifications', value)} ariaLabel="Desativar notificações no streamer" /></SettingRow>
        <SettingRow label="Ocultar janela do ChronoCord na captura de tela" description="Preferência local até a exclusão de captura ser conectada ao Electron."><SettingToggle checked={settings.appearance.streamer.hideWindowFromCapture} onChange={(value) => patch('appearance.streamer.hideWindowFromCapture', value)} ariaLabel="Ocultar ChronoCord da captura" /></SettingRow>
      </SettingSection>
    </>
  );
}
