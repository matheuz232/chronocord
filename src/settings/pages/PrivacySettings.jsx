import React, { useState } from 'react';
import { ActionButton, RelatedSettingCard, SettingRadio, SettingRow, SettingSection, SettingToggle, SettingsDialog, SettingsNotice } from '../components/SettingControls.jsx';

export default function PrivacySettings({ settings, patch, navigate }) {
  const [requestDialog, setRequestDialog] = useState(false);

  return (
    <>
      <SettingSection route="privacy.data" title="Como o ChronoCord usa meus dados">
        <SettingRow label="Utilizar dados para fazer o ChronoCord funcionar" description="Dados básicos de conta, servidores e mensagens são necessários para fornecer o serviço." disabled>
          <SettingToggle checked onChange={() => {}} disabled ariaLabel="Dados necessários" />
        </SettingRow>
        <SettingRow label="Utilizar dados para melhorar o ChronoCord" description="Permite usar informações de uso locais para orientar melhorias futuras.">
          <SettingToggle checked={settings.privacy.improveProduct} onChange={(value) => patch('privacy.improveProduct', value)} ariaLabel="Melhorar ChronoCord" />
        </SettingRow>
        <SettingRow label="Utilizar dados para personalizar minha experiência" description="Preferência local para personalização futura da experiência.">
          <SettingToggle checked={settings.privacy.personalizeExperience} onChange={(value) => patch('privacy.personalizeExperience', value)} ariaLabel="Personalizar experiência" />
        </SettingRow>
        <SettingRow label="Usar minha atividade para personalizar conteúdo patrocinado" description="Somente preferência visual nesta etapa; não existe entrega publicitária no ChronoCord atual.">
          <SettingToggle checked={settings.privacy.sponsoredActivityPersonalization} onChange={(value) => patch('privacy.sponsoredActivityPersonalization', value)} ariaLabel="Personalização patrocinada por atividade" />
        </SettingRow>
        <SettingRow label="Usar dados de terceiros para personalizar conteúdo patrocinado" description="Somente preferência local nesta fase.">
          <SettingToggle checked={settings.privacy.sponsoredThirdPartyPersonalization} onChange={(value) => patch('privacy.sponsoredThirdPartyPersonalization', value)} ariaLabel="Personalização patrocinada por terceiros" />
        </SettingRow>
        <SettingRow label="Permitir que minha voz seja gravada nos clipes" description="Controla somente a preferência local até o sistema de clipes ser integrado.">
          <SettingToggle checked={settings.privacy.allowVoiceInClips} onChange={(value) => patch('privacy.allowVoiceInClips', value)} ariaLabel="Permitir voz em clipes" />
        </SettingRow>
        <SettingRow label="Solicitar meus dados" description="A solicitação real ao servidor será implementada na versão final.">
          <ActionButton onClick={() => setRequestDialog(true)}>{settings.privacy.dataRequestStatus === 'requested' ? 'Solicitado localmente' : 'Solicitar dados'}</ActionButton>
        </SettingRow>
        <div style={{ marginTop: 14 }}>
          <RelatedSettingCard title="Jogos registrados" description="Gerencie os jogos usados nas experiências sociais." onClick={() => navigate?.('registeredGames')} icon="♟" />
        </div>
      </SettingSection>

      <SettingSection route="privacy.profile" title="Privacidade do perfil" description="Controle quem pode ver as áreas completas do seu perfil.">
        <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 650 }}>Compartilhe meu perfil completo com</div>
        <SettingRadio name="profile-audience" checked={settings.privacy.fullProfileAudience === 'friends_and_servers'} onChange={() => patch('privacy.fullProfileAudience', 'friends_and_servers')} label="Amigos e todos os servidores" description="Seu perfil completo fica visível para amigos e membros dos servidores em que você participa." />
        <SettingRadio name="profile-audience" checked={settings.privacy.fullProfileAudience === 'friends_small_servers'} onChange={() => patch('privacy.fullProfileAudience', 'friends_small_servers')} label="Amigos e servidores pequenos apenas" description="Servidores grandes recebem uma visão limitada." />
        <SettingRadio name="profile-audience" checked={settings.privacy.fullProfileAudience === 'friends_only'} onChange={() => patch('privacy.fullProfileAudience', 'friends_only')} label="Apenas amigos" description="Outras pessoas recebem somente uma versão resumida do perfil." />
        <SettingRow label="Compartilhar quando eu atualizar meu perfil" description="Permita que seus amigos sejam avisados quando você atualizar seu perfil.">
          <SettingToggle checked={settings.privacy.shareProfileUpdates} onChange={(value) => patch('privacy.shareProfileUpdates', value)} ariaLabel="Compartilhar atualização de perfil" />
        </SettingRow>
        <RelatedSettingCard title="Privacidade nas atividades" description="Controle como sua atividade de jogos e apps aparece para outras pessoas." onClick={() => navigate?.('activityPrivacy')} icon="◌" />
      </SettingSection>

      <SettingSection route="privacy.voiceEncryption" title="Criptografia de voz de ponta a ponta">
        <SettingRow label="Habilitar códigos de verificação persistentes" description="Salva somente sua preferência nesta versão. O ChronoCord ainda não afirma aplicar criptografia ponta a ponta por causa deste controle.">
          <SettingToggle checked={settings.privacy.persistentVoiceVerificationCodes} onChange={(value) => patch('privacy.persistentVoiceVerificationCodes', value)} ariaLabel="Códigos persistentes de voz" />
        </SettingRow>
        <SettingsNotice tone="warning">A implementação criptográfica real e os códigos de verificação serão conectados somente na fase final de segurança.</SettingsNotice>
      </SettingSection>

      <SettingsDialog open={requestDialog} title="Solicitar meus dados" description="Nesta fase a solicitação será registrada somente neste dispositivo." confirmLabel="Registrar solicitação" onClose={() => setRequestDialog(false)} onConfirm={() => { patch('privacy.dataRequestStatus', 'requested'); setRequestDialog(false); }}>
        <SettingsNotice>Quando a API final estiver pronta, esta mesma ação poderá iniciar uma exportação real dos seus dados.</SettingsNotice>
      </SettingsDialog>
    </>
  );
}
