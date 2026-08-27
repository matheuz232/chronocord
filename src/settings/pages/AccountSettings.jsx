import React, { useCallback, useEffect, useState } from 'react';
import { ActionButton, DangerAction, InlineField, SettingCard, SettingRow, SettingSection, SettingsDialog, SettingsNotice } from '../components/SettingControls.jsx';

const AGE_LABELS = { unconfirmed:'Não confirmado', under_13:'Menor de 13 anos', '13_17':'13 a 17 anos', '18_plus':'18 anos ou mais' };

export default function AccountSettings({ accountApi, user, profile, legacy, onLogout }) {
  const [account, setAccount] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [draft, setDraft] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSetup, setMfaSetup] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [revealed, setRevealed] = useState({ email:'', phone:'' });
  const [deletePhrase, setDeletePhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const run = useCallback(async (fn, success) => {
    if (!accountApi) { setNotice({ tone:'danger', text:'Faça login novamente para acessar as configurações de segurança.' }); return null; }
    setBusy(true); setNotice(null);
    try { const result = await fn(); if (success) setNotice({ tone:'info', text:success }); return result; }
    catch (error) { setNotice({ tone:'danger', text:error?.message || 'Não foi possível concluir a ação.' }); return null; }
    finally { setBusy(false); }
  }, [accountApi]);

  const refreshAccount = useCallback(async () => {
    if (!accountApi) return;
    const result = await run(() => accountApi.getAccount());
    if (result) setAccount(result);
  }, [accountApi, run]);
  const refreshSessions = useCallback(async () => {
    if (!accountApi) return;
    const result = await run(() => accountApi.getSessions());
    if (Array.isArray(result)) setSessions(result);
  }, [accountApi, run]);

  useEffect(() => { void refreshAccount(); void refreshSessions(); }, [refreshAccount, refreshSessions]);

  const closeDialog = () => { setDialog(null); setDraft(''); setPassword(''); setPassword2(''); setMfaCode(''); setMfaSetup(null); setDeletePhrase(''); };
  const editField = (field) => { setDraft(field === 'email' ? revealed.email : field === 'phone' ? revealed.phone : account?.username || user?.username || ''); setDialog(field); };

  async function saveAccountField(field, value) {
    const result = await run(() => accountApi.patchAccount({ [field]: value }), 'Informações da conta atualizadas.');
    if (result) { setAccount(result); closeDialog(); if (field === 'username') legacy?.setMyName?.(result.username); }
  }

  async function revealPrivate(kind) {
    const result = await run(() => accountApi.revealPrivate(password));
    if (result) { setRevealed(result); setPassword(''); setDialog(null); if (!result[kind]) setNotice({ tone:'info', text:`Nenhum ${kind === 'email' ? 'e-mail' : 'telefone'} foi informado.` }); }
  }

  async function changePassword() {
    if (password2.length < 8) { setNotice({ tone:'danger', text:'A nova senha precisa ter pelo menos 8 caracteres.' }); return; }
    const result = await run(() => accountApi.changePassword(password, password2), 'Senha alterada. As outras sessões foram encerradas.');
    if (result) { closeDialog(); void refreshSessions(); }
  }

  async function beginMfa() {
    const result = await run(() => accountApi.setupMfa(password));
    if (result) { setMfaSetup(result); setPassword(''); }
  }
  async function enableMfa() {
    const result = await run(() => accountApi.enableMfa(mfaCode));
    if (result) { setRecoveryCodes(result.recoveryCodes || []); setAccount((v) => ({ ...v, mfaEnabled:true })); setMfaCode(''); setMfaSetup(null); }
  }
  async function disableMfa() {
    const result = await run(() => accountApi.disableMfa(password, mfaCode), 'Autenticação multifatorial desativada.');
    if (result) { setAccount((v) => ({ ...v, mfaEnabled:false })); closeDialog(); }
  }

  async function revokeSession(id, current) {
    const result = await run(() => accountApi.revokeSession(id), current ? 'Sessão atual encerrada.' : 'Dispositivo desconectado.');
    if (!result) return;
    if (current) onLogout?.(); else void refreshSessions();
  }
  async function revokeOthers() { const result = await run(() => accountApi.revokeOtherSessions(), 'Outros dispositivos foram desconectados.'); if (result) void refreshSessions(); }

  async function deactivate() {
    const result = await run(() => accountApi.deactivate(password));
    if (result) { closeDialog(); onLogout?.(); }
  }
  async function deleteAccount() {
    const result = await run(() => accountApi.deleteAccount(password));
    if (result) { closeDialog(); onLogout?.(); }
  }

  const status = account?.status || 'active';
  const accountName = account?.username || profile?.name || user?.username || 'Usuário';

  return (
    <>
      {notice && <SettingsNotice tone={notice.tone}>{notice.text}</SettingsNotice>}

      <SettingSection route="account.info" title="Informações da conta">
        <div className="cc-settings-row-list">
          <SettingRow label="Nome de usuário" description="Seu nome principal no ChronoCord.">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}><strong style={{ fontSize:12 }}>{accountName}</strong><ActionButton disabled={busy} onClick={() => editField('username')}>Editar</ActionButton></div>
          </SettingRow>
          <SettingRow label="E-mail" description={account?.emailVerified ? 'E-mail verificado.' : 'O ChronoCord não indica verificação externa sem um serviço de e-mail configurado.'}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}><span style={{ fontSize:11 }}>{revealed.email || account?.emailMasked || 'Não informado'}</span><ActionButton tone="ghost" disabled={busy} onClick={() => { setPassword(''); setDialog('reveal-email'); }}>Mostrar</ActionButton><ActionButton disabled={busy} onClick={() => editField('email')}>Editar</ActionButton></div>
          </SettingRow>
          <SettingRow label="Telefone" description={account?.phoneVerified ? 'Telefone verificado.' : 'O ChronoCord não indica verificação por SMS sem um provedor configurado.'}>
            <div style={{ display:'flex', alignItems:'center', gap:7 }}><span style={{ fontSize:11 }}>{revealed.phone || account?.phoneMasked || 'Não informado'}</span><ActionButton tone="ghost" disabled={busy} onClick={() => { setPassword(''); setDialog('reveal-phone'); }}>Mostrar</ActionButton><ActionButton disabled={busy} onClick={() => editField('phone')}>Editar</ActionButton></div>
          </SettingRow>
          <SettingRow label="Grupo Etário" description="A data de nascimento é usada pelo servidor para determinar acesso a controles com restrição de idade.">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}><span style={{ fontSize:11 }}>{AGE_LABELS[account?.ageGroup] || 'Não confirmado'}</span><ActionButton disabled={busy} onClick={() => { setDraft(''); setDialog('age'); }}>{account?.ageGroup && account.ageGroup !== 'unconfirmed' ? 'Rever' : 'Confirmar'}</ActionButton></div>
          </SettingRow>
        </div>
      </SettingSection>

      <SettingSection route="account.security" title="Senha e segurança">
        <SettingRow label="Senha" description="Alterar a senha desconecta todas as outras sessões."><ActionButton disabled={busy} onClick={() => setDialog('password')}>Editar</ActionButton></SettingRow>
        <SettingRow label="Autenticação Multifatorial" description="Use um aplicativo autenticador compatível com TOTP e guarde os códigos de recuperação em local seguro."><ActionButton disabled={busy} onClick={() => setDialog(account?.mfaEnabled ? 'mfa-disable' : 'mfa-setup')}>{account?.mfaEnabled ? 'Gerenciar' : 'Definir'}</ActionButton></SettingRow>
        <SettingRow label="Dispositivos conectados" description="Sessões reais vinculadas à sua conta."><ActionButton disabled={busy} onClick={() => { void refreshSessions(); setDialog('devices'); }}>{sessions.length} dispositivo{sessions.length === 1 ? '' : 's'} ›</ActionButton></SettingRow>
      </SettingSection>

      <SettingSection route="account.status" title="Status da Conta">
        <SettingCard className="cc-account-health-card">
          <div style={{ display:'flex', gap:12, alignItems:'center' }}><div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(63,217,190,.14)', color:'#3FD9BE', display:'grid', placeItems:'center', fontWeight:900 }}>{status === 'active' ? '✓' : '!'}</div><div><strong style={{ fontSize:12.5 }}>{status === 'active' ? 'Sua conta está toda em ordem' : status === 'deletion_pending' ? 'Exclusão da conta agendada' : 'Sua conta requer atenção'}</strong><div style={{ marginTop:3, color:'var(--cc-text-faint)', fontSize:10.5 }}>{status === 'active' ? 'Obrigado por respeitar os Termos do ChronoCord e as diretrizes da comunidade.' : account?.scheduledDeletionAt ? `A exclusão está agendada para ${new Date(account.scheduledDeletionAt).toLocaleString('pt-BR')}.` : 'Entre novamente para reativar uma conta desativada.'}</div></div></div>
        </SettingCard>
      </SettingSection>

      <SettingSection route="account.family" title="Central da Família">
        <SettingRow label="Configurar Central da Família" description="A futura conexão com um responsável não dará acesso ao conteúdo das suas mensagens."><ActionButton disabled>Disponível em uma versão futura</ActionButton></SettingRow>
        <SettingsNotice>A interface está preparada, mas o ChronoCord 1.0.3 não cria vínculos familiares fictícios antes de existir um modelo real de responsáveis no servidor.</SettingsNotice>
        <div style={{ height:16 }} />
        <DangerAction title="Desative sua conta" description="Desativa a conta e encerra todas as sessões. Um login válido pode reativá-la." actionLabel="Desativar conta" onClick={() => setDialog('deactivate')} />
        <DangerAction title="Encerrar sua conta" description="Agenda a exclusão para 14 dias e encerra as sessões. Entrar durante o período cancela a exclusão." actionLabel="Excluir conta" onClick={() => { setDeletePhrase(''); setDialog('delete'); }} />
      </SettingSection>

      <SettingsDialog open={['username','email','phone'].includes(dialog)} title={dialog === 'username' ? 'Editar nome de usuário' : dialog === 'email' ? 'Editar e-mail' : 'Editar telefone'} confirmLabel="Salvar" confirmDisabled={busy || !draft.trim()} onClose={closeDialog} onConfirm={() => saveAccountField(dialog, draft)}>
        <InlineField value={draft} onChange={setDraft} placeholder={dialog === 'email' ? 'nome@exemplo.com' : dialog === 'phone' ? '+55 11 99999-9999' : 'nome_de_usuario'} />
      </SettingsDialog>

      <SettingsDialog open={dialog === 'reveal-email' || dialog === 'reveal-phone'} title={dialog === 'reveal-email' ? 'Mostrar e-mail' : 'Mostrar telefone'} description="Confirme sua senha para revelar este dado sensível." confirmLabel="Mostrar" confirmDisabled={busy || !password} onClose={closeDialog} onConfirm={() => revealPrivate(dialog === 'reveal-email' ? 'email' : 'phone')}>
        <InlineField type="password" label="Senha atual" value={password} onChange={setPassword} />
      </SettingsDialog>

      <SettingsDialog open={dialog === 'age'} title="Confirmar grupo etário" description="Informe sua data de nascimento. O servidor calcula o grupo etário; não é possível ativar manualmente o grupo 18+." confirmLabel="Confirmar" confirmDisabled={busy || !draft} onClose={closeDialog} onConfirm={() => saveAccountField('birthDate', draft)}>
        <InlineField type="date" label="Data de nascimento" value={draft} onChange={setDraft} />
      </SettingsDialog>

      <SettingsDialog open={dialog === 'password'} title="Alterar senha" description="A nova senha deve ter entre 8 e 128 caracteres." confirmLabel="Alterar senha" confirmDisabled={busy || !password || password2.length < 8} onClose={closeDialog} onConfirm={changePassword}>
        <InlineField type="password" label="Senha atual" value={password} onChange={setPassword} />
        <InlineField type="password" label="Nova senha" value={password2} onChange={setPassword2} />
      </SettingsDialog>

      <SettingsDialog open={dialog === 'mfa-setup'} title="Autenticação Multifatorial" description={mfaSetup ? 'Adicione a chave no seu aplicativo autenticador e confirme um código de 6 dígitos.' : 'Confirme sua senha para gerar uma chave TOTP.'} confirmLabel={mfaSetup ? 'Ativar MFA' : 'Gerar chave'} confirmDisabled={busy || (mfaSetup ? mfaCode.length !== 6 : !password)} onClose={closeDialog} onConfirm={mfaSetup ? enableMfa : beginMfa}>
        {!mfaSetup ? <InlineField type="password" label="Senha atual" value={password} onChange={setPassword} /> : <><SettingsNotice>Chave: <strong>{mfaSetup.secret}</strong><br />URI para autenticador: {mfaSetup.otpauthUrl}</SettingsNotice><InlineField label="Código de 6 dígitos" value={mfaCode} onChange={setMfaCode} maxLength={6} /></>}
      </SettingsDialog>

      <SettingsDialog open={dialog === 'mfa-disable'} title="Gerenciar MFA" description="Para desativar a MFA, confirme sua senha e um código TOTP ou código de recuperação." tone="danger" confirmLabel="Desativar MFA" confirmDisabled={busy || !password || !mfaCode} onClose={closeDialog} onConfirm={disableMfa}>
        <InlineField type="password" label="Senha atual" value={password} onChange={setPassword} /><InlineField label="Código" value={mfaCode} onChange={setMfaCode} />
      </SettingsDialog>

      <SettingsDialog open={recoveryCodes.length > 0} title="Códigos de recuperação" description="Salve estes códigos agora. Cada código funciona uma única vez." confirmLabel="Já salvei" cancelLabel="Continuar exibindo" onClose={() => {}} onConfirm={() => { setRecoveryCodes([]); closeDialog(); }}>
        <SettingCard>{recoveryCodes.map((code) => <div key={code} style={{ fontFamily:'monospace', padding:4 }}>{code}</div>)}</SettingCard>
      </SettingsDialog>

      <SettingsDialog open={dialog === 'devices'} title="Dispositivos conectados" description="Revogue qualquer sessão que você não reconheça." confirmLabel="Fechar" cancelLabel="Voltar" onClose={closeDialog} onConfirm={closeDialog}>
        {sessions.map((device) => <SettingCard key={device.id}><div style={{ display:'flex', alignItems:'center', gap:10 }}><div style={{ flex:1 }}><strong style={{ fontSize:12 }}>{device.label || 'ChronoCord'}</strong><div style={{ color:'var(--cc-text-faint)', fontSize:10, marginTop:3 }}>{device.current ? 'Sessão atual' : device.userAgent || 'Dispositivo'} · {new Date(device.lastSeenAt || device.createdAt).toLocaleString('pt-BR')}</div></div><ActionButton tone="danger" disabled={busy} onClick={() => revokeSession(device.id, device.current)}>Desconectar</ActionButton></div></SettingCard>)}
        {sessions.length > 1 && <ActionButton tone="danger" disabled={busy} onClick={revokeOthers}>Desconectar outros dispositivos</ActionButton>}
      </SettingsDialog>

      <SettingsDialog open={dialog === 'deactivate'} title="Desativar conta?" description="Você será desconectado de todos os dispositivos. Entrar novamente com sua senha reativa a conta." tone="danger" confirmLabel="Desativar conta" confirmDisabled={busy || !password} onClose={closeDialog} onConfirm={deactivate}>
        <InlineField type="password" label="Confirme sua senha" value={password} onChange={setPassword} />
      </SettingsDialog>

      <SettingsDialog open={dialog === 'delete'} title="Excluir conta?" description="A exclusão será agendada para 14 dias. Digite EXCLUIR e confirme sua senha." tone="danger" confirmLabel="Agendar exclusão" confirmDisabled={busy || deletePhrase !== 'EXCLUIR' || !password} onClose={closeDialog} onConfirm={deleteAccount}>
        <InlineField value={deletePhrase} onChange={setDeletePhrase} placeholder="EXCLUIR" /><InlineField type="password" label="Confirme sua senha" value={password} onChange={setPassword} />
      </SettingsDialog>
    </>
  );
}
