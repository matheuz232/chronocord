function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const child = (id, label, keywords = []) => ({ id, label, keywords });

export const SETTINGS_GROUPS = [
  {
    id: 'account', label: 'Conta', icon: 'user', section: 'Conta e segurança', children: [
      child('account.info', 'Informações da conta'),
      child('account.security', 'Senha e segurança'),
      child('account.status', 'Status da Conta'),
      child('account.family', 'Central da Família'),
    ],
  },
  {
    id: 'privacy', label: 'Dados e privacidade', icon: 'shield', section: 'Conta e segurança', children: [
      child('privacy.data', 'Como o ChronoCord usa meus dados'),
      child('privacy.profile', 'Privacidade do perfil'),
      child('privacy.voiceEncryption', 'Criptografia de voz de ponta a ponta', ['criptografia', 'voz']),
    ],
  },
  {
    id: 'messaging', label: 'Permissões de mensagens', icon: 'message', section: 'Conta e segurança', children: [
      child('messaging.content', 'Filtros de conteúdo'),
      child('messaging.spam', 'Filtros de spam'),
      child('messaging.dm', 'Mensagens diretas'),
      child('messaging.friendRequests', 'Pedidos de amizade'),
      child('messaging.games', 'Jogos conectados'),
      child('messaging.blocking', 'Ignorar e bloquear'),
    ],
  },
  {
    id: 'notifications', label: 'Notificações', icon: 'bell', section: 'Conta e segurança', children: [
      child('notifications.overview', 'Visão geral'),
      child('notifications.sounds', 'Sons'),
      child('notifications.badges', 'Insígnias'),
      child('notifications.email', 'E-mail'),
      child('notifications.advanced', 'Avançado'),
    ],
  },
  {
    id: 'voice', label: 'Voz e vídeo', icon: 'mic', section: 'Experiência', children: [
      child('voice.voice', 'Voz'),
      child('voice.camera', 'Câmera'),
      child('voice.stream', 'Transmissão', ['stream', 'tela']),
      child('voice.sounds', 'Sons'),
      child('voice.soundboard', 'Painel de efeitos sonoros', ['soundboard']),
      child('voice.advanced', 'Avançado'),
    ],
  },
  {
    id: 'appearance', label: 'Aparência', icon: 'palette', section: 'Experiência', children: [
      child('appearance.theme', 'Tema'),
      child('appearance.appIcon', 'Ícone do aplicativo'),
      child('appearance.messages', 'Mensagens'),
      child('appearance.chatBox', 'Caixa de chat'),
      child('appearance.search', 'Buscar'),
      child('appearance.streamer', 'Modo streamer'),
    ],
  },
  {
    id: 'accessibility', label: 'Acessibilidade', icon: 'accessibility', section: 'Experiência', children: [
      child('accessibility.readability', 'Legibilidade do texto'),
      child('accessibility.density', 'Densidade visual'),
      child('accessibility.contrast', 'Cor e contraste'),
      child('accessibility.motion', 'Movimento Reduzido'),
      child('accessibility.screenReader', 'Áudio e leitor de tela', ['audio leitor', 'texto para voz']),
    ],
  },
  {
    id: 'system', label: 'Sistema', icon: 'system', section: 'Experiência', children: [
      child('system.general', 'Geral'),
      child('system.customShortcuts', 'Atalhos do teclado personalizados', ['atalhos personalizados']),
      child('system.defaultShortcuts', 'Atalhos padrão'),
      child('system.assistant', 'Assistente do ChronoCord'),
    ],
  },
  { id: 'language', label: 'Idioma e Horário', icon: 'language', section: 'Experiência', children: [] },
  { id: 'registeredGames', label: 'Jogos registrados', icon: 'game', section: 'Jogos e apps', children: [] },
  { id: 'activityPrivacy', label: 'Privacidade nas atividades', icon: 'activity', section: 'Jogos e apps', children: [] },
  { id: 'gameOverlay', label: 'Sobreposição de jogo', icon: 'overlay', section: 'Jogos e apps', children: [] },
  { id: 'connectedApps', label: 'Apps conectados', icon: 'link', section: 'Jogos e apps', children: [] },
  { id: 'developer', label: 'Desenvolvedor', icon: 'code', section: 'Avançado', children: [] },
];

export const DEFAULT_SHORTCUTS = [
  { id: 'general.shortcuts', section: 'Atalhos padrão', label: 'Exibir lista de atalhos do teclado', keys: ['CTRL', '/'] },
  { id: 'message.edit', section: 'Mensagens', label: 'Editar mensagem', keys: ['E'] },
  { id: 'message.delete', section: 'Mensagens', label: 'Excluir mensagem', keys: ['BACKSPACE'] },
  { id: 'message.pin', section: 'Mensagens', label: 'Fixar mensagem', keys: ['P'] },
  { id: 'message.react', section: 'Mensagens', label: 'Adicionar reação', keys: ['+'] },
  { id: 'message.reply', section: 'Mensagens', label: 'Responder', keys: ['R'] },
  { id: 'message.forward', section: 'Mensagens', label: 'Encaminhar a mensagem', keys: ['F'] },
  { id: 'message.speak', section: 'Mensagens', label: 'Falar mensagem', keys: ['S'] },
  { id: 'message.copy', section: 'Mensagens', label: 'Copiar texto', keys: ['CTRL', 'C'] },
  { id: 'message.unread', section: 'Mensagens', label: 'Marcar como não lido', keys: ['ALT', 'ENTER'] },
  { id: 'message.focus', section: 'Mensagens', label: 'Focalizar área de texto', keys: ['ESC'] },
  { id: 'voice.toggleMute', section: 'Voz e chamadas', label: 'Ativar/desativar áudio', keys: ['CTRL', 'SHIFT', 'D'] },
  { id: 'voice.answerCall', section: 'Voz e chamadas', label: 'Atender chamada', keys: ['CTRL', 'ENTER'] },
  { id: 'voice.rejectCall', section: 'Voz e chamadas', label: 'Recusar chamada', keys: ['ESC'] },
  { id: 'voice.startCall', section: 'Voz e chamadas', label: 'Iniciar chamada em uma mensagem privada ou grupo', keys: ['CTRL', "'"] },
  { id: 'voice.soundPanel', section: 'Voz e chamadas', label: 'Alternar painel de som', keys: ['CTRL', 'SHIFT', 'B'] },
  { id: 'misc.help', section: 'Diversos', label: 'Obter ajuda', keys: ['CTRL', 'SHIFT', 'H'] },
  { id: 'misc.search', section: 'Diversos', label: 'Buscar', keys: ['CTRL', 'F'] },
  { id: 'misc.contextMenu', section: 'Diversos', label: 'Abrir menu contextual', keys: ['SHIFT', 'F10'] },
  { id: 'misc.chronobeat', section: 'Diversos', label: 'Ativar pulso ChronoBeat', keys: ['CTRL', 'ALT', 'SHIFT', 'C'] },
];

export function flattenSettingsRoutes() {
  const routes = [];
  for (const group of SETTINGS_GROUPS) {
    if (!group.children?.length) {
      routes.push({ id: group.id, label: group.label, groupId: group.id, groupLabel: group.label, section: group.section, keywords: [] });
      continue;
    }
    for (const item of group.children) {
      routes.push({ ...item, groupId: group.id, groupLabel: group.label, section: group.section });
    }
  }
  return routes;
}

export function filterSettingsRoutes(query) {
  const needle = normalize(query);
  const routes = flattenSettingsRoutes();
  if (!needle) return routes;
  return routes.filter((route) => {
    const haystack = normalize([route.label, route.groupLabel, ...(route.keywords || [])].join(' '));
    return haystack.includes(needle);
  });
}

function normalizeKeys(keys) {
  return [...new Set((keys || []).map((key) => String(key).trim().toUpperCase()).filter(Boolean))].sort();
}

export function shortcutSignature(keys) {
  return normalizeKeys(keys).join('+');
}

export function hasShortcutConflict(keys, shortcuts = [], ignoreId = null) {
  const signature = shortcutSignature(keys);
  if (!signature) return false;
  return shortcuts.some((shortcut) => shortcut.id !== ignoreId && shortcutSignature(shortcut.keys) === signature);
}
