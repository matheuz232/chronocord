import React from 'react';
import { ActionButton, SettingRadio, SettingRange, SettingRow, SettingSection, SettingSelect, SettingToggle, SettingsNotice } from '../components/SettingControls.jsx';

function speakPreview(rate) {
  try {
    if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return;
    globalThis.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('Esta é uma prévia da leitura de texto do ChronoCord.');
    utterance.lang = 'pt-BR';
    utterance.rate = Number(rate) || 1;
    globalThis.speechSynthesis.speak(utterance);
  } catch {}
}

export default function AccessibilitySettings({ settings, patch, profile }) {
  const a = settings.accessibility;
  return (
    <>
      <div className="cc-access-preview" style={{ fontSize: `${a.chatFontSize}px`, filter: `${a.highContrast ? 'contrast(1.18) ' : ''}saturate(${a.saturation / 100})` }}>
        <div style={{ color: 'var(--cc-text-faint)', fontSize: 10, marginBottom: 8 }}>Prévia</div>
        <div className="cc-access-preview-message"><div className="cc-access-preview-avatar" /><div className="cc-access-preview-copy"><strong>{profile?.name || 'Chronista'} ✦</strong><p>o que aconteceu com todos os feijões</p></div></div>
        <div className="cc-access-preview-message"><div className="cc-access-preview-avatar" /><div className="cc-access-preview-copy"><strong>{profile?.name || 'Chronista'} ✦</strong><p><span style={{ textDecoration: a.underlineLinks ? 'underline' : 'none' }}>chronocord.app/accessibility</span></p></div></div>
      </div>

      <SettingSection route="accessibility.readability" title="Legibilidade do texto">
        <SettingRow label={`Tamanho do texto no chat: ${a.chatFontSize}px`} vertical><SettingRange value={a.chatFontSize} min={12} max={24} marks={['12px','14px','16px','18px','20px','24px']} onChange={(v) => patch('accessibility.chatFontSize', v)} ariaLabel="Tamanho do texto" /></SettingRow>
        <SettingRow label="Sempre sublinhar links"><SettingToggle checked={a.underlineLinks} onChange={(v) => patch('accessibility.underlineLinks', v)} ariaLabel="Sublinhar links" /></SettingRow>
        <SettingRow label="Estilos de nome exibido"><SettingToggle checked={a.displayNameStyles} onChange={(v) => patch('accessibility.displayNameStyles', v)} ariaLabel="Estilos de nome" /></SettingRow>
      </SettingSection>

      <SettingSection route="accessibility.density" title="Densidade visual">
        <div style={{ fontSize: 12, fontWeight: 650 }}>Densidade da interface</div>
        {['compact','default','spacious'].map((v) => <SettingRadio key={v} name="interface-density" checked={a.interfaceDensity === v} onChange={() => patch('accessibility.interfaceDensity', v)} label={{compact:'Compacto',default:'Padrão',spacious:'Espaçoso'}[v]} />)}
        <div style={{ fontSize: 12, fontWeight: 650, marginTop: 12 }}>Exibição das mensagens de bate-papo</div>
        {['default','compact'].map((v) => <SettingRadio key={v} name="message-density" checked={a.messageDensity === v} onChange={() => patch('accessibility.messageDensity', v)} label={v === 'default' ? 'Padrão' : 'Compacto'} />)}
        <SettingRow label={`Espaço entre grupos de mensagens: ${a.messageGroupSpacing}px`} vertical><SettingRange value={a.messageGroupSpacing} min={0} max={24} step={4} marks={['0px','4px','8px','16px','24px']} onChange={(v) => patch('accessibility.messageGroupSpacing', v)} ariaLabel="Espaço entre mensagens" /></SettingRow>
        <SettingRow label={`Nível de zoom: ${a.zoom}%`} vertical><SettingRange value={a.zoom} min={75} max={150} step={5} onChange={(v) => patch('accessibility.zoom', v)} ariaLabel="Nível de zoom" /></SettingRow>
      </SettingSection>

      <SettingSection route="accessibility.contrast" title="Cor e contraste">
        <SettingRow label={`Saturação: ${a.saturation}%`} vertical><SettingRange value={a.saturation} min={0} max={100} step={10} marks={['0%','20%','40%','60%','80%','100%']} onChange={(v) => patch('accessibility.saturation', v)} ariaLabel="Saturação" /></SettingRow>
        <SettingRow label="Aplicar configuração de saturação às cores personalizadas"><SettingToggle checked={a.saturationAffectsCustomColors} onChange={(v) => patch('accessibility.saturationAffectsCustomColors', v)} ariaLabel="Saturação personalizada" /></SettingRow>
        <SettingRow label="Ativar modo de contraste alto"><SettingToggle checked={a.highContrast} onChange={(v) => patch('accessibility.highContrast', v)} ariaLabel="Contraste alto" /></SettingRow>
        <SettingRow label="Sincronizar configurações de contraste"><SettingToggle checked={a.syncContrastWithSystem} onChange={(v) => patch('accessibility.syncContrastWithSystem', v)} ariaLabel="Sincronizar contraste" /></SettingRow>
        <SettingRow label="Cores dos cargos"><SettingSelect value={a.roleColorDisplay} onChange={(v) => patch('accessibility.roleColorDisplay', v)} options={[{value:'names',label:'Nos nomes'},{value:'dots',label:'Como indicadores'},{value:'none',label:'Não exibir'}]} ariaLabel="Cores dos cargos" /></SettingRow>
        <SettingRow label="Mensagens oficiais"><SettingSelect value={a.officialMessageColor} onChange={(v) => patch('accessibility.officialMessageColor', v)} options={[{value:'none',label:'Sem cor do texto'},{value:'accent',label:'Usar cor de destaque'},{value:'strong',label:'Contraste reforçado'}]} ariaLabel="Mensagens oficiais" /></SettingRow>
      </SettingSection>

      <SettingSection route="accessibility.motion" title="Movimento Reduzido">
        <SettingRow label="Ativar movimento reduzido"><SettingToggle checked={a.reducedMotion} onChange={(v) => patch('accessibility.reducedMotion', v)} ariaLabel="Movimento reduzido" /></SettingRow>
        <SettingRow label="Sincronizar com computador"><SettingToggle checked={a.syncMotionWithSystem} onChange={(v) => patch('accessibility.syncMotionWithSystem', v)} ariaLabel="Sincronizar movimento" /></SettingRow>
        <SettingRow label="Reproduzir GIFs quando o ChronoCord estiver em primeiro plano"><SettingToggle checked={a.foregroundGifs} onChange={(v) => patch('accessibility.foregroundGifs', v)} ariaLabel="GIFs em primeiro plano" /></SettingRow>
        <SettingRow label="Reproduzir emojis animados"><SettingToggle checked={a.animatedEmoji} onChange={(v) => patch('accessibility.animatedEmoji', v)} ariaLabel="Emojis animados" /></SettingRow>
        <div style={{ fontSize: 12, fontWeight: 650, marginTop: 10 }}>Jogar animações de figurinha</div>
        {[['always','Animar sempre'],['interaction','Animar ao interagir'],['never','Nunca animar']].map(([v,l]) => <SettingRadio key={v} name="sticker-animation" checked={a.stickerAnimation === v} onChange={() => patch('accessibility.stickerAnimation', v)} label={l} />)}
      </SettingSection>

      <SettingSection route="accessibility.screenReader" title="Áudio e leitor de tela">
        <SettingRow label={`Taxa de texto-para-voz: x${Number(a.ttsRate).toFixed(1)}`} vertical><SettingRange value={a.ttsRate} min={0.5} max={2} step={0.1} marks={['Mais devagar','x1.0','Mais rápido']} onChange={(v) => patch('accessibility.ttsRate', v)} ariaLabel="Taxa de texto para voz" /></SettingRow>
        <ActionButton tone="primary" onClick={() => speakPreview(a.ttsRate)}>▶ Prévia</ActionButton>
        <SettingRow label="Mostrar descrições de imagens"><SettingToggle checked={a.imageDescriptions} onChange={(v) => patch('accessibility.imageDescriptions', v)} ariaLabel="Descrição de imagens" /></SettingRow>
        <SettingRow label="Use entrada de chat padrão"><SettingToggle checked={a.standardScreenReaderChatInput} onChange={(v) => patch('accessibility.standardScreenReaderChatInput', v)} ariaLabel="Entrada de chat padrão" /></SettingRow>
        <SettingsNotice>As preferências ficam prontas e persistidas agora; recursos nativos do sistema operacional só serão declarados ativos quando forem realmente integrados.</SettingsNotice>
      </SettingSection>
    </>
  );
}
