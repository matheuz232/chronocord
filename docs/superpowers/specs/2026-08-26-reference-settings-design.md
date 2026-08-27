# ChronoCord Reference Settings Design

## Goal

Expand the current ChronoCord settings and profile experience using the supplied reference screenshots, while keeping this release UI-first: every control must work in the client and persist locally, but backend-heavy account/security operations remain explicitly local/simulated until the final ChronoCord backend phase.

## Scope and product rule

This phase implements the visible information architecture, navigation, controls, feedback, and persistence represented by the reference images.

The following are real client-side behaviors now:
- navigation and subnavigation;
- settings search;
- toggles, radios, selects, buttons and expandable sections;
- local preference persistence per signed-in user;
- profile visibility preference UI;
- blocked-user list UI and local unblock behavior;
- notification/sound preference UI;
- developer mode and app-test mode UI;
- shortcut catalog and local custom-shortcut data model;
- account status/family center states;
- profile summary and full-profile navigation.

The following remain local/simulated until the final backend phase:
- changing/verifying email;
- changing/verifying telephone;
- age-group verification;
- real MFA enrollment;
- real connected-session/device enumeration;
- actual account deactivation/deletion;
- server-enforced blocking/privacy/message-policy rules;
- data-export requests;
- real end-to-end voice encryption management;
- real marketing email subscriptions;
- Discord-style assistant process/service installation.

No destructive server mutation is allowed for a simulated control in this phase.

## Visual direction

The supplied screenshots are references, not a requirement to clone Discord pixel-for-pixel. ChronoCord keeps its own visual identity:
- ChronoCord typography and accent color;
- current dark/light/theme system;
- rounded panels already used by the app;
- compact left settings rail, nested subitems, large scrollable content pane;
- clear section headings, dividers and right-aligned controls;
- all wording adapted to ChronoCord branding.

## 1. Settings navigation and subnavigation

### Account
Main item: `Conta`
Subitems:
- `Informações da conta`
- `Senha e segurança`
- `Status da Conta`
- `Central da Família`

### Data and privacy
Main item: `Dados e privacidade`
Subitems:
- `Como o ChronoCord usa meus dados`
- `Privacidade do perfil`
- `Criptografia de voz de ponta a ponta`

### Message permissions
Main item: `Permissões de mensagens`
Subitems:
- `Filtros de conteúdo`
- `Filtros de spam`
- `Mensagens diretas`
- `Pedidos de amizade`
- `Jogos conectados`
- `Ignorar e bloquear`

### Notifications
Main item: `Notificações`
Subitems:
- `Visão geral`
- `Sons`
- `Insígnias`
- `E-mail`
- `Avançado`

### Experience/system items preserved and expanded
- `Voz e vídeo`
- `Aparência`
- `Acessibilidade`
- `Sistema`
  - `Geral`
  - `Atalhos do teclado personalizados`
  - `Atalhos padrão`
  - `Assistente do ChronoCord`
- `Idioma e Horário`
- `Jogos registrados`
- `Privacidade nas atividades`
- `Sobreposição de jogo`
- `Apps conectados`
- `Desenvolvedor`
- `Sair`

Search filters both main items and nested subitems. Selecting a nested subitem scrolls/focuses the matching content section instead of opening a duplicate page.

## 2. Settings data model and local persistence

Persist per authenticated user using a versioned key:

`chronocord.settings.v2.<userId>`

Shape:

```js
{
  schemaVersion: 2,
  account: {
    emailMasked: "",
    phoneMasked: "",
    ageGroupStatus: "unconfirmed",
    mfaEnabled: false,
    connectedDevices: [],
    accountHealth: "ok",
    familyCenterConfigured: false
  },
  privacy: {
    improveProduct: false,
    personalizeExperience: false,
    sponsoredActivityPersonalization: false,
    sponsoredThirdPartyPersonalization: false,
    allowVoiceInClips: true,
    fullProfileAudience: "friends_and_servers",
    shareProfileUpdates: true,
    persistentVoiceVerificationCodes: false
  },
  messaging: {
    sensitiveMediaFriends: "blur",
    sensitiveMediaOthers: "blur",
    sensitiveMediaServers: "blur",
    ageRestrictedDmCommands: false,
    ageRestrictedIosServers: false,
    spamFilter: "unknown_only",
    dmScope: "all_servers",
    allowServerMemberDMs: true,
    filterUnknownServerDMs: true,
    friendRequestsEveryone: true,
    friendRequestsFriendsOfFriends: true,
    friendRequestsServerMembers: true,
    connectedGameDMs: true,
    gameDmDisplay: "all",
    blockedUsers: []
  },
  notifications: {
    desktopEnabled: true,
    taskbarFlash: true,
    notifySmallServerStreams: true,
    notifyFriendAnniversary: true,
    notifyFriendsOnline: true,
    notifyUpcomingServerEvent: true,
    reactionNotifications: "all",
    soundNewMessage: true,
    soundCurrentChannelMessage: false,
    soundIncomingCall: true,
    disableAllNotificationSounds: false,
    unreadBadge: true,
    emailCommunication: true,
    emailSocial: true,
    emailProductUpdates: false,
    emailTips: false,
    emailRecommendations: false
  },
  system: {
    showShortcutListBinding: ["CTRL", "/"],
    customShortcuts: [],
    assistantInstalled: false,
    assistantRunning: false,
    developerMode: false,
    appTestMode: false,
    appTestId: ""
  },
  ui: {
    lastSettingsRoute: "account.info",
    expandedGroups: {}
  }
}
```

Persistence rules:
- merge defaults with stored values so future fields are backward compatible;
- write on change with a short debounce;
- never store raw password, raw email credentials, MFA secrets or auth tokens in this settings object;
- masked email/phone are display-only local placeholders until backend implementation;
- logout does not delete preferences;
- app updates keep the same storage key and schema migration path.

## 3. Exact page content to implement

### Account — Informações da conta
Rows:
- Nome de usuário — real current ChronoCord username; existing edit flow remains real where supported.
- E-mail — masked placeholder/local value with `Mostrar` and `Editar` local dialog.
- Telefone — masked placeholder/local value with `Mostrar` and `Editar` local dialog.
- Grupo Etário — `Não confirmado` and `Confirmar` local dialog.

### Account — Senha e segurança
Rows:
- Senha — `Editar`; opens local explanatory/simulated dialog unless existing backend password-change support is later added.
- Autenticação Multifatorial — `Definir`; local state only.
- Dispositivos conectados — count and drill-in list; local generated/current-device data only.

### Account — Status da Conta
- healthy state card: `Sua conta está toda em ordem`;
- explanatory copy adapted to ChronoCord terms/community rules.

### Account — Central da Família
- `Configurar Central da Família`;
- local setup state and explanatory copy;
- no message contents exposed to a simulated family member.

### Account — destructive actions
- `Desativar conta` — local confirmation modal; no server deletion.
- `Excluir conta` — stronger red confirmation modal requiring a typed confirmation phrase; no server deletion in this phase.
- simulated completion must clearly say the server account was not destroyed in this preview phase.

### Data and privacy — Como o ChronoCord usa meus dados
- core service-data explanation (informational, not toggleable);
- `Utilizar dados para melhorar o ChronoCord` toggle;
- `Utilizar dados para personalizar minha experiência no ChronoCord` toggle;
- sponsored-content activity personalization toggle;
- third-party sponsored-content personalization toggle;
- `Permitir que minha voz seja gravada nos clipes` toggle;
- `Solicitar meus dados` action with local request-status feedback;
- related settings card for registered games/activity privacy.

### Data and privacy — Privacidade do perfil
Radio group `Compartilhe meu perfil completo com`:
- `Amigos e todos os servidores`;
- `Amigos e servidores pequenos apenas`;
- `Apenas amigos`.

Additional toggle:
- `Compartilhar quando eu atualizar meu perfil`.

Related card:
- `Privacidade nas atividades`.

### Data and privacy — Criptografia de voz de ponta a ponta
- `Habilitar códigos de verificação persistentes` toggle;
- explanatory text that this release stores only the preference; it does not claim cryptographic enforcement yet.

### Message permissions — Filtros de conteúdo
Sensitive content rows:
- conteúdo sexual maduro: DMs de amigos;
- mídia gráfica: DMs de outras pessoas;
- mensagens em canais do servidor;
- each row uses a select such as `Borrar`, `Mostrar`, `Bloquear` where locally supported.

Age restriction toggles:
- commands with age restriction in DMs;
- access to age-restricted servers on iOS.

Related card:
- `Aparência` for spoiler/media visibility.

### Message permissions — Filtros de spam
Radio group:
- `Filtrar todos os envios de spam`;
- `Filtrar mensagens de desconhecidos (recomendado)`;
- `Não filtrar envios de spam`.

### Message permissions — Mensagens diretas
- server scope selector (`Todos os servidores` as default UI value);
- `Permitir DMs de outros membros dos meus servidores` toggle;
- `Filtrar mensagens de membros do servidor que você talvez não conheça` toggle.

### Message permissions — Pedidos de amizade
Toggles:
- `Todos`;
- `Amigos de amigos`;
- `Membros do servidor`.

### Message permissions — Jogos conectados
- `Permita que amigos dos jogos enviem mensagens diretas e convites` toggle;
- `Mostrar mensagens diretas em jogos` radio group:
  - mostrar todas as DMs;
  - mostrar apenas DMs de pessoas que também jogam o jogo;
  - não mostrar nenhuma mensagem direta.
- related card: `Aplicativos autorizados` / `Apps conectados`.

### Message permissions — Ignorar e bloquear
- local list with avatar, username and `Desbloquear` button;
- if the existing app later exposes a real block action, this UI can be wired to it without changing the component contract;
- empty state when list is empty.

### Notifications — Visão geral
Toggles:
- desktop notifications;
- taskbar flash;
- notify when known people start streaming in small servers;
- friendship anniversary;
- friends become online;
- upcoming server event.

Select:
- reaction notifications (`Todas as mensagens` default).

### Notifications — Sons
Toggles:
- new message;
- new message in current channel;
- incoming call;
- disable all notification sounds.

`Prévia do som` action beside individual sounds where the app has a playable sound; otherwise provide a lightweight local preview tone.

Related card:
- `Voz e vídeo`.

### Notifications — Insígnias
- unread-message badge toggle.

### Notifications — E-mail
Toggles:
- communication emails;
- social emails;
- product-update/announcement emails;
- tips emails;
- recommendation emails.

`Cancelar inscrição` button is local-state only in this phase.

### Notifications — Avançado
- reserved subsection for notification aggregation and platform behavior already present in ChronoCord; no new backend dependency.

### System — Atalhos padrão
Catalog shown as rows with shortcut chips. At minimum include the visible reference actions:

General/message actions:
- Exibir lista de atalhos do teclado — `CTRL` + `/`;
- Editar mensagem — `E`;
- Excluir mensagem — `BACKSPACE`;
- Fixar mensagem — `P`;
- Adicionar reação — `+`;
- Responder — `R`;
- Encaminhar a mensagem — `F`;
- Falar mensagem — `S`;
- Copiar texto — `CTRL` + `C`;
- Marcar como não lido — `ALT` + `ENTER`;
- Focalizar área de texto — `ESC`.

Voice/call actions visible in the reference:
- ativar/desativar áudio — `CTRL` + `SHIFT` + `D`;
- atender chamada — `CTRL` + `ENTER`;
- recusar chamada — `ESC`;
- iniciar chamada em DM/grupo — `CTRL` + `'`;
- alternar painel de som — `CTRL` + `SHIFT` + `B`.

Miscellaneous:
- obter ajuda — `CTRL` + `SHIFT` + `H`;
- buscar — `CTRL` + `F`;
- abrir menu contextual — `SHIFT` + `F10`;
- a playful ChronoCord-only easter-egg shortcut may replace the Discord/Wumpus reference; it must use ChronoCord branding.

### System — Atalhos personalizados
- CRUD local custom shortcuts;
- prevent duplicate binding conflicts inside the local catalog;
- reset-to-default action.

### System — Assistente do ChronoCord
- status (`Parado`, `Correndo`, or `Não instalado`);
- install/uninstall local simulation;
- short explanation that a true OS assistant/service is deferred to final integration.

### Developer
- `Modo desenvolvedor` toggle;
- `Modo de Teste de Aplicativos` toggle;
- app ID field becomes enabled when app-test mode is on;
- no external API application mutation in this phase.

## 4. Profile reference integration

### Profile summary card
The existing summary/profile popover should be upgraded to include the visual hierarchy shown in the reference:
- adaptive banner;
- large avatar overlapping the banner;
- status dot;
- display name, handle/pronouns/role chips where data exists;
- custom status card;
- mutual-friends/server summary;
- bio block with `Ver Biografia Completa`;
- member-since block;
- compact favorite-game collection;
- current activity/game card;
- wishlist strip;
- `Ver Perfil Completo` primary footer action.

No fake social data is generated for other users. Missing fields render an appropriate empty/hidden state.

### Full profile
Keep the current `ProfilePage.jsx` concept but align it with the summary card:
- same banner/avatar/accent source;
- tabs and widgets remain ChronoCord-specific;
- privacy audience can hide full-profile sections for viewers when the UI is exercising a restricted preference locally;
- current local posts/wishlist/game widgets remain available.

## Component architecture

Do not grow `src/ChronoCord.jsx` with another large inline settings implementation. Extract the new settings center.

Create:
- `src/settings/SettingsCenter.jsx` — modal shell, route/subroute state, search, scroll anchors.
- `src/settings/settingsDefaults.js` — schema v2 defaults and shortcut catalog.
- `src/settings/settingsStorage.js` — read/merge/migrate/debounced-save helpers.
- `src/settings/components/SettingsSidebar.jsx` — grouped nav and search.
- `src/settings/components/SettingControls.jsx` — reusable toggle, radio, select, row, key-chip and related-card components.
- `src/settings/pages/AccountSettings.jsx`.
- `src/settings/pages/PrivacySettings.jsx`.
- `src/settings/pages/MessagePermissionsSettings.jsx`.
- `src/settings/pages/NotificationSettings.jsx`.
- `src/settings/pages/SystemSettings.jsx`.
- `src/profile/ProfileSummaryCard.jsx` if the current summary remains too entangled in `ChronoCord.jsx` to evolve safely.

Modify:
- `src/ChronoCord.jsx` — replace the existing inline settings content with `SettingsCenter`, pass existing theme/profile/voice/application callbacks, and wire profile summary/full-profile entry points.
- `src/ProfilePage.jsx` — align full-profile behavior with privacy and summary data without moving its existing local social data yet.
- `src/styles.css` or existing global stylesheet — add responsive settings/profile classes rather than large repeated inline style blocks.

Server changes are explicitly out of scope for this phase.

## Interaction rules

- Settings modal is large and scrollable, with sticky/fixed sidebar behavior on desktop.
- Nested sidebar item selects the owning page and scrolls to the appropriate section.
- Search result selection navigates to the exact matching section.
- Toggles update immediately.
- Simulated destructive/security actions always use confirmation dialogs and explanatory copy.
- Browser/local preview must never claim MFA, encryption, email verification, account deletion or family supervision is active server-side.
- Keyboard navigation and visible focus states are required.
- All settings remain readable in the current supported theme modes.

## Testing and acceptance

### Storage tests
- defaults load with no stored state;
- partial old state merges without losing new defaults;
- invalid JSON falls back safely;
- writes are namespaced per user;
- no password/auth token is written by the settings store.

### Component tests or deterministic smoke checks
- every main navigation item renders;
- every reference subitem renders;
- nested navigation scrolls/selects correctly;
- each toggle changes state and persists;
- radio groups are exclusive;
- blocked-user local unblock removes the row;
- search finds nested labels;
- destructive simulated dialogs never call server account-delete APIs;
- profile summary opens full profile;
- privacy audience changes full-profile visibility behavior locally.

### Windows build gate
- `npm run build` passes;
- `npm run dist` passes on Windows Actions;
- existing installer smoke tests remain green;
- no regression to voice, screen share, Jukebox, Watch2Chronos or updater workflows.

## Release boundary

This feature set is suitable for the current pre-final ChronoCord release only as a UI/local-preference implementation. Backend-enforced account/security/privacy functionality is explicitly deferred to the final ChronoCord backend milestone and must not be represented as cryptographically or server-enforced before that milestone.
