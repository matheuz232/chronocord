import React from 'react';
import { RelatedSettingCard, SettingCard, SettingRadio, SettingRow, SettingSection, SettingSelect, SettingToggle, SettingsNotice } from '../components/SettingControls.jsx';

export default function MiscSettings({ route, settings, patch, legacy, navigate }) {
  if (route === 'language') {
    return (
      <SettingSection route="language" title="Idioma e Horário">
        <SettingRow label="Idioma"><SettingSelect value={legacy?.language || 'Português (Brasil)'} onChange={(value) => legacy?.setLanguage?.(value)} options={['Português (Brasil)','English (US)','Español','日本語']} ariaLabel="Idioma" /></SettingRow>
        <div style={{ fontSize: 12, fontWeight: 650, marginTop: 10 }}>Formato de horário</div>
        <SettingRadio name="time-format" checked={(legacy?.timeFormat || '24 horas') === '24 horas'} onChange={() => legacy?.setTimeFormat?.('24 horas')} label="24 horas" />
        <SettingRadio name="time-format" checked={legacy?.timeFormat === '12 horas (AM/PM)'} onChange={() => legacy?.setTimeFormat?.('12 horas (AM/PM)')} label="12 horas (AM/PM)" />
      </SettingSection>
    );
  }

  if (route === 'registeredGames') {
    return (
      <SettingSection route="registeredGames" title="Jogos registrados" description="Jogos detectados e integrações futuras aparecem aqui quando houver dados reais.">
        <SettingCard title="Nenhum jogo registrado para exibir" description="O ChronoCord não cria jogos fictícios. Quando a detecção real estiver disponível, esta lista será preenchida automaticamente." />
        <RelatedSettingCard title="Privacidade nas atividades" description="Defina como sua atividade de jogos poderá aparecer para outras pessoas." onClick={() => navigate?.('activityPrivacy')} icon="◌" />
      </SettingSection>
    );
  }

  if (route === 'activityPrivacy') {
    const enabled = settings.ui?.activitySharing ?? true;
    return (
      <SettingSection route="activityPrivacy" title="Privacidade nas atividades">
        <SettingRow label="Compartilhar minha atividade de jogos e apps" description="Preferência local até a presença rica e detecção de jogos estarem integradas ao backend final."><SettingToggle checked={enabled} onChange={(value) => patch('ui.activitySharing', value)} ariaLabel="Compartilhar atividade" /></SettingRow>
        <SettingsNotice>Informações de jogos só serão mostradas quando existirem dados reais de atividade; nada é inventado para preencher o perfil.</SettingsNotice>
      </SettingSection>
    );
  }

  if (route === 'gameOverlay') {
    const enabled = settings.ui?.gameOverlayEnabled ?? false;
    return (
      <SettingSection route="gameOverlay" title="Sobreposição de jogo">
        <SettingRow label="Ativar sobreposição do ChronoCord" description="A preferência é salva agora. A janela sobreposta real será implementada na integração final do Electron/Windows."><SettingToggle checked={enabled} onChange={(value) => patch('ui.gameOverlayEnabled', value)} ariaLabel="Sobreposição de jogo" /></SettingRow>
        <SettingsNotice tone="warning">Nenhuma sobreposição é injetada em jogos nesta versão.</SettingsNotice>
      </SettingSection>
    );
  }

  if (route === 'connectedApps') {
    return (
      <SettingSection route="connectedApps" title="Apps conectados" description="Integrações autorizadas aparecem somente quando existirem conexões reais.">
        <SettingCard title="Nenhum aplicativo conectado" description="O ChronoCord não simula contas externas ou autorizações que você não criou." />
        <RelatedSettingCard title="Jogos registrados" description="Veja os jogos detectados quando a integração estiver disponível." onClick={() => navigate?.('registeredGames')} icon="♟" />
      </SettingSection>
    );
  }

  return <SettingSection route={route} title="Configuração"><SettingsNotice>Esta rota ainda não possui conteúdo adicional.</SettingsNotice></SettingSection>;
}
