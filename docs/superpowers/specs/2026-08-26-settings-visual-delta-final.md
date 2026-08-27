# ChronoCord Settings Final Visual Delta

**Base spec:** `docs/superpowers/specs/2026-08-26-reference-settings-design.md`

## Purpose

This document contains only requirements introduced by the final reference screenshots. Requirements already present in the base spec are not duplicated. The approved implementation remains UI-first and locally persisted; OS/backend-heavy behavior is deferred to the final platform phase.

## Voice and video additions

Extend the existing `Voz e vídeo` group with the following nested sections and locally persisted behavior:

- `Voz`
- `Câmera`
- `Transmissão`
- `Sons`
- `Painel de efeitos sonoros`
- `Avançado`

### Transmissão

- `Mostrar prévias da transmissão` toggle.
- expandable advanced-stream settings card.
- keep existing stream quality, system-audio and screen-share feature logic intact.

### Sons

- independent local toggles for mute/unmute/deafen/undeafen event sounds.
- expandable `Mostrar mais sons` region.
- sound-preview action where a playable sound exists; otherwise a short Web Audio preview tone.
- related navigation card to Notifications.

### Painel de efeitos sonoros

- soundboard volume slider.
- entrance-sound server scope select.
- entrance-sound select and preview action.
- preserve the existing soundboard playback flow.

### Avançado

- diagnostics disclosure.
- `Redefinir todas as configurações de Voz e vídeo` resets only the `voiceVideo` settings subtree to defaults and never disconnects a live call.

## Appearance additions

Extend `Aparência` with:

- `Tema`
- `Ícone do aplicativo`
- `Mensagens`
- `Caixa de chat`
- `Buscar`
- `Modo streamer`

### Tema

- retain current ChronoCord theme modes and accent-color picker.
- add a preset gallery and colored theme tiles using ChronoCord branding.
- local custom-theme draft/preview state.
- `Sincronizar tema em meus dispositivos` preference (local-only in this phase).
- `Aplicar tema aos perfis de outros usuários` preference.
- server-theme default selector.

### Ícone do aplicativo

- local icon-choice gallery using ChronoCord-owned icon variants/assets only.
- selected icon affects settings/app preview surfaces only in this phase.
- installed EXE, Start Menu and installer keep the official transparent ChronoCord icon until final OS integration.

### Mensagens

Toggles/selects:
- show linked images/videos/memes;
- show directly uploaded media;
- show attachments/link previews;
- show emoji reactions;
- spoiler display mode;
- open threads in split view;
- show user avatars.

### Caixa de chat

Toggles:
- preview emoji/mentions/Markdown while typing;
- convert emoticons to emoji;
- stickers in autocomplete;
- games in autocomplete;
- show send-message button.

### Buscar

Default DM search scope radio:
- selected DM only;
- all DMs.

### Modo streamer

Preferences:
- manual streamer mode;
- auto-detect OBS/XSplit-like apps (preference only until OS process integration exists);
- hide personal data;
- hide invite links;
- disable sound effects;
- disable notifications;
- hide ChronoCord window from capture (preference only until Electron capture exclusion is wired in final integration).

## Accessibility additions

Extend `Acessibilidade` with a persistent preview and nested sections:

- `Legibilidade do texto`
- `Densidade visual`
- `Cor e contraste`
- `Movimento Reduzido`
- `Áudio e leitor de tela`

### Legibilidade do texto

- chat text size 12–24 px.
- always underline links.
- display-name styles enabled.

### Densidade visual

- interface density: compact/default/spacious.
- chat message display: default/compact.
- message-group spacing slider.
- zoom preference.

### Cor e contraste

- saturation slider 0–100%.
- apply saturation to custom colors.
- high-contrast preference.
- sync contrast with computer preference.
- role-color display select.
- official-message color display select.

### Movimento Reduzido

- reduced-motion preference.
- sync motion with computer preference.
- foreground GIF animation.
- animated emoji.
- sticker animation mode: always/on interaction/never.

### Áudio e leitor de tela

- text-to-speech rate slider and preview button.
- image-description preference.
- standard screen-reader chat-input preference.

No setting in this phase claims to enable an OS accessibility capability that ChronoCord has not actually integrated yet.

## System additions

Extend existing `Sistema > Geral` with:

- open ChronoCord on computer startup;
- start minimized (disabled unless startup is enabled);
- minimize to system tray;
- hardware acceleration preference.

The approved shortcut catalog, custom shortcuts and ChronoCord Assistant remain defined by the base spec and are not duplicated here.

## Developer visual confirmation

Keep the previously approved Developer route and align its final layout with the reference:

- Developer Mode toggle.
- App Test Mode toggle.
- ChronoCord App ID input enabled only while App Test Mode is active.
- all copy says ChronoCord/API do ChronoCord, never Discord API.

## Profile summary visual confirmation

The final summary-card implementation must additionally preserve:

- full-width adaptive banner;
- overlapping large avatar and presence ring;
- banner action buttons;
- custom-status card visually over/near the banner;
- name style/accent, handle and available chips/badges;
- mutual friend/server summary from real available data;
- short bio + `Ver Biografia Completa`;
- member-since block;
- compact game collection with `+N` overflow;
- current-game card with elapsed duration where real activity data exists;
- external game-service button only when a real URL exists;
- horizontal wishlist strip + `Ver tudo`;
- primary `Ver Perfil Completo` footer action;
- optional profile-border decoration only when the profile has decoration data;
- color adaptation based on profile/banner/avatar while preserving readable contrast.

Never fabricate social, game, badge, Steam or server data.

## Persistence delta

Add these subtrees to `chronocord.settings.v2.<userId>` defaults:

```js
voiceVideo: {
  streamPreviews: true,
  advancedStreamExpanded: false,
  soundEvents: { mute: true, unmute: true, deafen: true, undeafen: true },
  soundboardVolume: 100,
  entranceSoundServer: 'all',
  entranceSound: null,
  diagnosticsExpanded: false
},
appearance: {
  themePreset: 'chronocord',
  customTheme: null,
  syncTheme: true,
  applyThemeToProfiles: false,
  serverThemeMode: 'server',
  appIcon: 'default',
  media: {
    linkedMedia: true,
    uploadedMedia: true,
    linkPreviews: true,
    emojiReactions: true,
    spoilers: 'click',
    splitThreads: true,
    showAvatars: true
  },
  chatBox: {
    liveMarkdownPreview: true,
    emoticonsToEmoji: true,
    autocompleteStickers: false,
    autocompleteGames: true,
    showSendButton: false
  },
  dmSearchScope: 'selected',
  streamer: {
    enabled: false,
    autoDetectStreamingApps: true,
    hidePersonalData: true,
    hideInviteLinks: true,
    disableSounds: true,
    disableNotifications: true,
    hideWindowFromCapture: false
  }
},
accessibility: {
  chatFontSize: 16,
  underlineLinks: false,
  displayNameStyles: true,
  interfaceDensity: 'default',
  messageDensity: 'default',
  messageGroupSpacing: 16,
  zoom: 100,
  saturation: 100,
  saturationAffectsCustomColors: false,
  highContrast: false,
  syncContrastWithSystem: true,
  roleColorDisplay: 'names',
  officialMessageColor: 'none',
  reducedMotion: false,
  syncMotionWithSystem: true,
  foregroundGifs: true,
  animatedEmoji: true,
  stickerAnimation: 'always',
  ttsRate: 1,
  imageDescriptions: true,
  standardScreenReaderChatInput: false
}
```

Extend `system` defaults with `openOnStartup`, `startMinimized`, `minimizeToTray`, and `hardwareAcceleration` while preserving all previously approved fields.
