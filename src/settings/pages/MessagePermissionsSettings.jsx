import React from 'react';
import { ActionButton, RelatedSettingCard, SettingRadio, SettingRow, SettingSection, SettingSelect, SettingToggle, SettingCard } from '../components/SettingControls.jsx';

const mediaOptions = [
  { value: 'show', label: 'Mostrar' },
  { value: 'blur', label: 'Borrar' },
  { value: 'block', label: 'Bloquear' },
];

export default function MessagePermissionsSettings({ settings, patch, navigate }) {
  const blocked = settings.messaging.blockedUsers || [];
  const unblock = (id) => patch('messaging.blockedUsers', blocked.filter((user) => user.id !== id));

  return (
    <>
      <SettingSection route="messaging.content" title="Filtros de conteúdo">
        <SettingCard title="Conteúdo sensível" description="Escolha como o ChronoCord deve representar mídia potencialmente sensível nesta versão local.">
          <SettingRow label="Mensagens diretas de amigos"><SettingSelect value={settings.messaging.sensitiveMediaFriends} onChange={(value) => patch('messaging.sensitiveMediaFriends', value)} options={mediaOptions} ariaLabel="Conteúdo sensível de amigos" /></SettingRow>
          <SettingRow label="Mensagens diretas de outras pessoas"><SettingSelect value={settings.messaging.sensitiveMediaOthers} onChange={(value) => patch('messaging.sensitiveMediaOthers', value)} options={mediaOptions} ariaLabel="Conteúdo sensível de desconhecidos" /></SettingRow>
          <SettingRow label="Mensagens em canais do servidor"><SettingSelect value={settings.messaging.sensitiveMediaServers} onChange={(value) => patch('messaging.sensitiveMediaServers', value)} options={mediaOptions} ariaLabel="Conteúdo sensível de servidores" /></SettingRow>
        </SettingCard>
        <SettingRow label="Permitir acesso a comandos com restrição de idade em mensagens diretas" description="Preferência local até existir verificação etária no backend."><SettingToggle checked={settings.messaging.ageRestrictedDmCommands} onChange={(value) => patch('messaging.ageRestrictedDmCommands', value)} ariaLabel="Comandos com restrição de idade" /></SettingRow>
        <SettingRow label="Permitir acesso a servidores com restrição de idade no iOS" description="A integração de plataforma será feita na versão final."><SettingToggle checked={settings.messaging.ageRestrictedIosServers} onChange={(value) => patch('messaging.ageRestrictedIosServers', value)} ariaLabel="Servidores restritos no iOS" /></SettingRow>
        <RelatedSettingCard title="Aparência" description="Controle spoilers, prévias e mídia exibida no chat." onClick={() => navigate?.('appearance.messages')} icon="◐" />
      </SettingSection>

      <SettingSection route="messaging.spam" title="Filtros de spam">
        <div style={{ fontSize: 12, fontWeight: 650, marginBottom: 5 }}>Filtrar automaticamente mensagens de spam suspeitas</div>
        <SettingRadio name="spam-filter" checked={settings.messaging.spamFilter === 'all'} onChange={() => patch('messaging.spamFilter', 'all')} label="Filtrar todos os envios de spam" />
        <SettingRadio name="spam-filter" checked={settings.messaging.spamFilter === 'unknown_only'} onChange={() => patch('messaging.spamFilter', 'unknown_only')} label="Filtrar mensagens de desconhecidos (recomendado)" />
        <SettingRadio name="spam-filter" checked={settings.messaging.spamFilter === 'none'} onChange={() => patch('messaging.spamFilter', 'none')} label="Não filtrar envios de spam" />
      </SettingSection>

      <SettingSection route="messaging.dm" title="Permissões de mensagens diretas (DM)">
        <SettingRow label="Escopo das configurações"><SettingSelect value={settings.messaging.dmScope} onChange={(value) => patch('messaging.dmScope', value)} options={[{ value: 'all_servers', label: 'Todos os servidores' }, { value: 'current_server', label: 'Servidor atual' }]} ariaLabel="Escopo de DMs" /></SettingRow>
        <SettingRow label="Permitir DMs de outros membros dos meus servidores"><SettingToggle checked={settings.messaging.allowServerMemberDMs} onChange={(value) => patch('messaging.allowServerMemberDMs', value)} ariaLabel="Permitir DMs de membros" /></SettingRow>
        <SettingRow label="Filtrar mensagens de membros do servidor que você talvez não conheça"><SettingToggle checked={settings.messaging.filterUnknownServerDMs} onChange={(value) => patch('messaging.filterUnknownServerDMs', value)} ariaLabel="Filtrar DMs desconhecidas" /></SettingRow>
      </SettingSection>

      <SettingSection route="messaging.friendRequests" title="Permissões de pedido de amizade">
        <div style={{ fontSize: 12, fontWeight: 650, marginBottom: 8 }}>Permitir pedidos de amizade de...</div>
        <SettingRow label="Todos"><SettingToggle checked={settings.messaging.friendRequestsEveryone} onChange={(value) => patch('messaging.friendRequestsEveryone', value)} ariaLabel="Pedidos de todos" /></SettingRow>
        <SettingRow label="Amigos de amigos"><SettingToggle checked={settings.messaging.friendRequestsFriendsOfFriends} onChange={(value) => patch('messaging.friendRequestsFriendsOfFriends', value)} ariaLabel="Pedidos de amigos de amigos" /></SettingRow>
        <SettingRow label="Membros do servidor" description="Pessoas de servidores em comum."><SettingToggle checked={settings.messaging.friendRequestsServerMembers} onChange={(value) => patch('messaging.friendRequestsServerMembers', value)} ariaLabel="Pedidos de membros do servidor" /></SettingRow>
      </SettingSection>

      <SettingSection route="messaging.games" title="Mensagens em jogos conectados">
        <SettingRow label="Permita que amigos dos jogos enviem mensagens diretas e convites" description="Preferência local para futuras integrações de jogos."><SettingToggle checked={settings.messaging.connectedGameDMs} onChange={(value) => patch('messaging.connectedGameDMs', value)} ariaLabel="DMs de jogos conectados" /></SettingRow>
        <div style={{ fontSize: 12, fontWeight: 650, margin: '12px 0 4px' }}>Mostrar mensagens diretas em jogos</div>
        <SettingRadio name="game-dm-display" checked={settings.messaging.gameDmDisplay === 'all'} onChange={() => patch('messaging.gameDmDisplay', 'all')} label="Mostrar todas as DMs" />
        <SettingRadio name="game-dm-display" checked={settings.messaging.gameDmDisplay === 'players_only'} onChange={() => patch('messaging.gameDmDisplay', 'players_only')} label="Mostrar apenas DMs de pessoas que também jogam o jogo" />
        <SettingRadio name="game-dm-display" checked={settings.messaging.gameDmDisplay === 'none'} onChange={() => patch('messaging.gameDmDisplay', 'none')} label="Não mostrar nenhuma mensagem direta" />
        <RelatedSettingCard title="Aplicativos autorizados" description="Gerencie seus jogos e integrações em Apps conectados." onClick={() => navigate?.('connectedApps')} icon="↗" />
      </SettingSection>

      <SettingSection route="messaging.blocking" title="Ignorar e bloquear" description="Você está no controle. A lista abaixo é local nesta fase.">
        <SettingCard title="Contas bloqueadas" description={`${blocked.length} conta${blocked.length === 1 ? '' : 's'}`}>
          {blocked.length ? blocked.map((user) => (
            <div className="cc-blocked-user" key={user.id}>
              <div className="cc-blocked-avatar">{user.avatar ? <img src={user.avatar} alt="" /> : String(user.name || user.username || '?').slice(0, 1).toUpperCase()}</div>
              <div className="cc-blocked-copy"><strong>{user.name || user.username || 'Usuário'}</strong><small>{user.username || user.id}</small></div>
              <ActionButton onClick={() => unblock(user.id)}>Desbloquear</ActionButton>
            </div>
          )) : <div style={{ color: 'var(--cc-text-faint)', fontSize: 11, padding: 12 }}>Você não bloqueou ninguém localmente.</div>}
        </SettingCard>
      </SettingSection>
    </>
  );
}
