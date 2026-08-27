# Messaging and Notifications Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all reference Message Permissions and Notifications sections as working local ChronoCord preferences with consistent controls and no implied server enforcement.

**Architecture:** Keep the UI and state model local to the v2 settings store. Message policy controls are expressed as values the future backend can consume later, but this release does not change server filtering or friendship/block enforcement. Notification controls update client behavior only where ChronoCord already has a corresponding local capability; otherwise they persist and display correctly without false claims.

**Tech Stack:** React 18.3.1, shared settings controls, localStorage v2 settings model, existing ChronoCord sound/notification helpers where available.

**Spec:** `docs/superpowers/specs/2026-08-26-reference-settings-design.md`

## Global Constraints

- Do not claim server-side spam, sensitive-media, DM, friend-request, blocking, or age-rule enforcement in this release.
- Persist every exposed preference per authenticated user.
- Local unblock removes only the local blocked-list entry in this phase.
- Notification sound preview may use an existing ChronoCord sound or a short local Web Audio tone; it must never require network media.

---

### Task 1: Message permissions page

**Files:**
- Create: `src/settings/pages/MessagePermissionsSettings.jsx`
- Modify: `src/settings/SettingsCenter.jsx`
- Create: `tests/settings-messaging-model.test.mjs`

**Interfaces:**
- `MessagePermissionsSettings({ route, settings, patchSettings, onNavigate, T, themeColor })`.
- Routes: `messaging.content`, `messaging.spam`, `messaging.dms`, `messaging.friendRequests`, `messaging.games`, `messaging.blocking`.

- [ ] **Step 1: Write model tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSettings } from '../src/settings/settingsDefaults.js';

test('messaging defaults use supported enum values', () => {
  const m = createDefaultSettings().messaging;
  assert.ok(['show','blur','block'].includes(m.sensitiveMediaFriends));
  assert.ok(['all','unknown_only','none'].includes(m.spamFilter));
  assert.ok(['all','playing_only','none'].includes(m.gameDmDisplay));
  assert.ok(Array.isArray(m.blockedUsers));
});
```

If current defaults use equivalent names from the approved spec, normalize the test and UI to one canonical enum set and use it consistently everywhere.

- [ ] **Step 2: Implement Filtros de conteúdo**

Render sensitive-media controls for friend DMs, other-person DMs, and server channels with `Mostrar`, `Borrar`, `Bloquear`. Render age-restriction toggles and an Appearance related-settings card.

- [ ] **Step 3: Implement Filtros de spam**

Radio group values:

```text
all
unknown_only
none
```

Copy must describe these as ChronoCord preferences for the current preview, not server-enforced moderation.

- [ ] **Step 4: Implement Mensagens diretas**

Render server-scope select, allow-server-member-DMs toggle, and unknown-member filter toggle.

- [ ] **Step 5: Implement Pedidos de amizade**

Render independent toggles for everyone, friends-of-friends, and server members. Preserve all three values even if combinations would later be normalized by a backend.

- [ ] **Step 6: Implement Jogos conectados**

Render connected-game DM/Invite toggle and radio group for all / playing-only / none. Related card navigates to connected apps.

- [ ] **Step 7: Implement Ignorar e bloquear**

Render local `blockedUsers` rows with avatar fallback, username, optional handle, and `Desbloquear`. Unblock operation:

```js
patchSettings('messaging.blockedUsers', settings.messaging.blockedUsers.filter((x) => x.id !== userId));
```

Render a clear empty state when the list is empty.

- [ ] **Step 8: Wire routes and validate**

```bash
npm run test:settings
npm run build
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/settings/pages/MessagePermissionsSettings.jsx src/settings/SettingsCenter.jsx tests/settings-messaging-model.test.mjs
git commit -m "feat: add message permission settings"
```

---

### Task 2: Notification preferences page

**Files:**
- Create: `src/settings/pages/NotificationSettings.jsx`
- Create: `src/settings/notificationPreview.js`
- Modify: `src/settings/SettingsCenter.jsx`
- Create: `tests/settings-notification-model.test.mjs`

**Interfaces:**
- `NotificationSettings({ route, settings, patchSettings, onNavigate, T, themeColor })`.
- `playNotificationPreview(kind)` returns a Promise and never throws to the UI.
- Routes: `notifications.overview`, `notifications.sounds`, `notifications.badges`, `notifications.email`, `notifications.advanced`.

- [ ] **Step 1: Write notification model tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSettings } from '../src/settings/settingsDefaults.js';

test('notification defaults include the reference categories', () => {
  const n = createDefaultSettings().notifications;
  for (const key of [
    'desktopEnabled','taskbarFlash','notifySmallServerStreams','notifyFriendAnniversary',
    'notifyFriendsOnline','notifyUpcomingServerEvent','reactionNotifications',
    'soundNewMessage','soundCurrentChannelMessage','soundIncomingCall',
    'disableAllNotificationSounds','unreadBadge','emailCommunication','emailSocial',
    'emailProductUpdates','emailTips','emailRecommendations'
  ]) assert.ok(key in n, `missing ${key}`);
});
```

- [ ] **Step 2: Implement Visão geral**

Render desktop notifications, taskbar flash, stream, friendship anniversary, friends-online, future-event toggles, and reaction-notification select.

- [ ] **Step 3: Implement sound preview helper**

Prefer an existing local ChronoCord sound if exposed. Otherwise create a 100–180ms oscillator tone using `AudioContext`, with safe fallback when unavailable. `disableAllNotificationSounds` prevents preview playback and shows a disabled state.

- [ ] **Step 4: Implement Sons**

Rows: new message, current-channel message, incoming call, disable all. Each playable row has `Prévia do som`.

- [ ] **Step 5: Implement Insígnias**

Unread badge toggle. If Electron exposes a badge/taskbar indicator later, keep the component contract ready but do not invent an OS integration in this task.

- [ ] **Step 6: Implement E-mail**

Render communication, social, product updates, tips, recommendations toggles. `Cancelar inscrição` sets all five local email preferences false after confirmation.

- [ ] **Step 7: Implement Avançado**

Present ChronoCord-specific notification aggregation/platform behavior already represented by local state. If no existing advanced fields are available, render a concise informational section instead of inventing unapproved persisted fields.

- [ ] **Step 8: Wire routes and validate**

```bash
npm run test:settings
npm run build
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/settings/pages/NotificationSettings.jsx src/settings/notificationPreview.js src/settings/SettingsCenter.jsx tests/settings-notification-model.test.mjs
git commit -m "feat: add notification settings reference UI"
```

---

## Plan verification gate

Manual checks:

- every nested message route scrolls to the correct section;
- selects/radios restore after reopening the app;
- blocked list can remove rows locally and survives restart;
- notification master sound toggle disables previews;
- email unsubscribe clears all local email toggles;
- no setting falsely reports server enforcement;
- `npm run test:settings` and `npm run build` are green.