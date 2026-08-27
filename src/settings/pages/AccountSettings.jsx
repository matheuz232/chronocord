import React, { useMemo, useState } from 'react';
import { ActionButton, DangerAction, InlineField, SettingCard, SettingRow, SettingSection, SettingToggle, SettingsDialog, SettingsNotice } from '../components/SettingControls.jsx';

function maskEmail(value) {
  const text = String(value || '').trim();
  const [name, domain] = text.split('@');
  if (!name || !domain) return text ? '••••••••' : 'Não informado';
  return `${name.slice(0, 1)}${'•'.repeat(Math.max(4, name.length - 1))}@${domain}`;
}

function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 'Não informado';
  return `${'•'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}

export default function AccountSettings({ settings, patch, user, profile, legacy }) {
  const [dialog, setDialog] = useState(null);
  const [draft, setDraft] = useState('');
  const [reveal, setReveal] = useState({ email: false, phone: false });
  const [deletePhrase, setDeletePhrase] = useState('');
  const currentDevice = useMemo(() => ({
    id: 'current',
    name: typeof navigator === 'undefined' ? 'Este dispositivo' : `${navigator.platform || 'Windows'} · ChronoCord Desktop`,
    current: true,
  }), []);
  const devices = settings.account.connectedDevices?.length ? settings.account.connectedDevices : [currentDevice];

  const openValueDialog = (type) => {
    setDraft('');
    setDialog(type);
  };

  const saveValue = () => {
    if (dialog === 'email') patch('account.emailMasked', maskEmail(draft));
    if (dialog === 'phone') patch('account.phoneMasked', maskPhone(draft));
    setDialog(null);
    setDraft('');
  };

  return (
    <>
      <SettingSection route="account.info" title="Informações da conta">
        <div className="cc-settings-row-list">
          <SettingRow label="Nome de usuário" description="Seu nome principal no ChronoCord.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><strong style={{ fontSize: 12 }}>{profile?.name || user?.username || 'Usuário'}</strong><ActionButton onClick={() => legacy?.openProfileEditor?.()}>Editar</ActionButton></div>
          </SettingRow>
          <SettingRow label="E-mail" description="Nesta fase o valor é somente uma referência local.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ fontSize: 11 }}>{reveal.email ? (settings.account.emailMasked || 'Não informado') : maskEmail(settings.account.emailMasked)}</span><ActionButton tone="ghost" onClick={() => setReveal((v) => ({ ...v, email: !v.email }))}>{reveal.email ? 'Ocultar' : 'Mostrar'}</ActionButton><ActionButton onClick={() => openValueDialog('email')}>Editar</ActionButton></div>
          </SettingRow>
          <SettingRow label="Telefone" description="Somente interface local por enquanto.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ fontSize: 11 }}>{reveal.phone ? (settings.account.phoneMasked || 'Não informado') : maskPhone(settings.account.phoneMasked)}</span><ActionButton tone="ghost" onClick={() => setReveal((v) => ({ ...v, phone: !v.phone }))}>{reveal.phone ? 'Ocultar' : 'Mostrar'}</ActionButton><ActionButton onClick={() => openValueDialog('phone')}>Editar</ActionButton></div>
          </SettingRow>
          <SettingRow label="Grupo Etário" description="A confirmação real será ligada ao backend na versão final.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ fontSize: 11 }}>{settings.account.ageGroupStatus === 'confirmed' ? 'Confirmado' : 'Não confirmado'}</span><ActionButton onClick={() => setDialog('age')}>{settings.account.ageGroupStatus === 'confirmed' ? 'Rever' : 'Confirmar'}</ActionButton></div>
          </SettingRow>
        </div>
      </SettingSection>

      <SettingSection route="account.security" title="Senha e segurança">
        <SettingRow label="Senha" description="A troca real de senha será conectada ao backend final."><ActionButton onClick={() => setDialog('password')}>Editar</ActionButton></SettingRow>
        <SettingRow label="Autenticação Multifatorial" description="Preferência visual local; nenhum segredo MFA é armazenado."><ActionButton onClick={() => setDialog('mfa')}>{settings.account.mfaEnabled ? 'Gerenciar' : 'Definir'}</ActionButton></SettingRow>
        <SettingRow label="Dispositivos conectados" description="A lista real de sessões será fornecida pelo backend final."><ActionButton onClick={() => setDialog('devices')}>{devices.length} dispositivo{devices.length === 1 ? '' : 's'} ›</ActionButton></SettingRow>
      </SettingSection>

      <SettingSection route="account.status" title="Status da Conta">
        <SettingCard className="cc-account-health-card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(63,217,190,.14)', color: '#3FD9BE', display: 'grid', placeItems: 'center', fontWeight: 900 }}>✓</div><div><strong style={{ fontSize: 12.5 }}>Sua conta está toda em ordem</strong><div style={{ marginTop: 3, color: 'var(--cc-text-faint)', fontSize: 10.5 }}>Obrigado por respeitar os Termos do ChronoCord e as diretrizes da comunidade.</div></div></div>
        </SettingCard>
      </SettingSection>

      <SettingSection route="account.family" title="Central da Família">
        <SettingRow label="Configurar Central da Família" description="Prepare uma experiência local de supervisão sem expor o conteúdo das suas mensagens."><ActionButton onClick={() => patch('account.familyCenterConfigured', !settings.account.familyCenterConfigured)}>{settings.account.familyCenterConfigured ? 'Configurada' : 'Configurar'} ›</ActionButton></SettingRow>
        {settings.account.familyCenterConfigured && <SettingsNotice>A Central da Família está marcada como configurada neste dispositivo. A integração real com responsáveis fica para a versão final.</SettingsNotice>}
        <div style={{ height: 16 }} />
        <DangerAction title="Desative sua conta" description="Simula a desativação somente nesta interface; sua conta no servidor não será removida." actionLabel="Desativar conta" onClick={() => setDialog('deactivate')} />
        <DangerAction title="Encerrar sua conta" description="A exclusão real permanece bloqueada nesta fase para proteger seus dados." actionLabel="Excluir conta" onClick={() => { setDeletePhrase(''); setDialog('delete'); }} />
      </SettingSection>

      <SettingsDialog open={dialog === 'email' || dialog === 'phone'} title={dialog === 'email' ? 'Editar e-mail local' : 'Editar telefone local'} description="Esse dado será mascarado e salvo somente como referência de interface nesta versão." confirmLabel="Salvar" onClose={() => setDialog(null)} onConfirm={saveValue} confirmDisabled={!draft.trim()}>
        <InlineField value={draft} onChange={setDraft} placeholder={dialog === 'email' ? 'nome@exemplo.com' : '+55 11 99999-9999'} />
      </SettingsDialog>

      <SettingsDialog open={dialog === 'age'} title="Confirmar grupo etário" description="Esta confirmação é apenas local e não substitui uma verificação real de idade." confirmLabel="Marcar como confirmado" onClose={() => setDialog(null)} onConfirm={() => { patch('account.ageGroupStatus', 'confirmed'); setDialog(null); }} />

      <SettingsDialog open={dialog === 'password'} title="Alteração de senha" description="A senha real não será modificada nesta etapa e nunca é salva nas preferências locais." confirmLabel="Entendi" cancelLabel="Fechar" onClose={() => setDialog(null)} onConfirm={() => setDialog(null)}>
        <SettingsNotice tone="warning">A troca real de senha será implementada quando a camada final de segurança do ChronoCord estiver pronta.</SettingsNotice>
      </SettingsDialog>

      <SettingsDialog open={dialog === 'mfa'} title="Autenticação Multifatorial" description="O estado abaixo serve para finalizar a experiência visual; nenhum segredo, QR ou chave real é gerado." confirmLabel={settings.account.mfaEnabled ? 'Desativar localmente' : 'Ativar localmente'} onClose={() => setDialog(null)} onConfirm={() => { patch('account.mfaEnabled', !settings.account.mfaEnabled); setDialog(null); }}>
        <SettingRow label="MFA local" description={settings.account.mfaEnabled ? 'Marcada como ativa neste dispositivo.' : 'Ainda não marcada como ativa.'}><SettingToggle checked={settings.account.mfaEnabled} onChange={(checked) => patch('account.mfaEnabled', checked)} ariaLabel="MFA local" /></SettingRow>
      </SettingsDialog>

      <SettingsDialog open={dialog === 'devices'} title="Dispositivos conectados" description="Somente o dispositivo atual pode ser derivado localmente nesta fase." confirmLabel="Fechar" cancelLabel="Voltar" onClose={() => setDialog(null)} onConfirm={() => setDialog(null)}>
        {devices.map((device) => <SettingCard key={device.id}><strong style={{ fontSize: 12 }}>{device.name}</strong><div style={{ color: 'var(--cc-text-faint)', fontSize: 10, marginTop: 3 }}>{device.current ? 'Sessão atual' : 'Sessão local salva'}</div></SettingCard>)}
      </SettingsDialog>

      <SettingsDialog open={dialog === 'deactivate'} title="Desativar conta?" description="Esta ação será apenas simulada. O servidor não será alterado." tone="danger" confirmLabel="Simular desativação" onClose={() => setDialog(null)} onConfirm={() => setDialog(null)}>
        <SettingsNotice tone="danger">Sua conta real continuará intacta nesta versão de desenvolvimento.</SettingsNotice>
      </SettingsDialog>

      <SettingsDialog open={dialog === 'delete'} title="Excluir conta?" description="Digite EXCLUIR para confirmar a simulação. Nenhum dado real do servidor será apagado." tone="danger" confirmLabel="Simular exclusão" confirmDisabled={deletePhrase !== 'EXCLUIR'} onClose={() => setDialog(null)} onConfirm={() => setDialog(null)}>
        <InlineField value={deletePhrase} onChange={setDeletePhrase} placeholder="EXCLUIR" />
      </SettingsDialog>
    </>
  );
}
