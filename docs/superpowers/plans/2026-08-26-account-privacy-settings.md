# Account and Privacy Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Account and Data & Privacy reference pages as functional ChronoCord UI with local persistence and no destructive backend mutation.

**Architecture:** Build two page components that consume the shared settings shell and controlled components from the foundation plan. Real profile username editing continues to use the existing ChronoCord profile patch flow where already supported; email, phone, age group, MFA, device list, family center, data requests, profile audience, and E2EE preference stay local/simulated in this release.

**Tech Stack:** React 18.3.1, shared settings components, localStorage v2 settings model, existing ChronoCord profile API.

**Spec:** `docs/superpowers/specs/2026-08-26-reference-settings-design.md`

## Global Constraints

- No simulated destructive action may call an account-delete/deactivate backend endpoint.
- Never persist raw passwords, MFA secrets, or authentication tokens.
- Email and phone values are display/local placeholders only in this release.
- Real username changes may keep using the existing `saveProfilePatch` flow.
- Every setting except immutable informational text must restore after app restart.

---

### Task 1: Account page structure and local dialogs

**Files:**
- Create: `src/settings/pages/AccountSettings.jsx`
- Modify: `src/settings/SettingsCenter.jsx`
- Create: `tests/settings-account-model.test.mjs`

**Interfaces:**
- `AccountSettings({ route, settings, patchSettings, profile, onPatchProfile, T, themeColor })`.
- Consumes route IDs: `account.info`, `account.security`, `account.status`, `account.family`.

- [ ] **Step 1: Write failing account-model tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSettings } from '../src/settings/settingsDefaults.js';

test('account defaults are non-destructive and unverified', () => {
  const account = createDefaultSettings().account;
  assert.equal(account.ageGroupStatus, 'unconfirmed');
  assert.equal(account.mfaEnabled, false);
  assert.equal(account.familyCenterConfigured, false);
  assert.deepEqual(account.connectedDevices, []);
});
```

Run `npm run test:settings`; expected PASS only after foundation defaults match the approved schema.

- [ ] **Step 2: Implement account information section**

Render rows for username, masked email, masked phone, and age group. Username uses the real profile value. `Editar` for email/phone opens a local dialog whose submitted value is stored only as a masked display value. `Mostrar` reveals the locally entered placeholder for the current session only.

- [ ] **Step 3: Implement password and security section**

Render Password, MFA, and Connected Devices. Password edit opens an explanatory modal saying the secure server-side change is deferred. MFA toggles local state after confirmation. Connected Devices shows at least the current device row generated from the running platform label plus any persisted local placeholders.

- [ ] **Step 4: Implement status and family sections**

Status card shows `Sua conta está toda em ordem`. Family Center provides a local configured/unconfigured state and explanatory copy without exposing message contents.

- [ ] **Step 5: Implement non-destructive danger actions**

`Desativar conta` requires confirmation. `Excluir conta` requires typing `EXCLUIR`. Completion must explicitly say the preview did not destroy the server account. Neither action may invoke a server mutation.

- [ ] **Step 6: Wire Account routes into `SettingsCenter`**

Render `AccountSettings` for all `account.*` routes and preserve anchor scrolling.

- [ ] **Step 7: Run validation**

```bash
npm run test:settings
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/settings/pages/AccountSettings.jsx src/settings/SettingsCenter.jsx tests/settings-account-model.test.mjs
git commit -m "feat: add account settings reference UI"
```

---

### Task 2: Data usage and request controls

**Files:**
- Create: `src/settings/pages/PrivacySettings.jsx`
- Modify: `src/settings/SettingsCenter.jsx`
- Create: `tests/settings-privacy-model.test.mjs`

**Interfaces:**
- `PrivacySettings({ route, settings, patchSettings, onNavigate, T, themeColor })`.
- Consumes route IDs: `privacy.data`, `privacy.profile`, `privacy.voiceEncryption`.

- [ ] **Step 1: Write privacy defaults test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSettings } from '../src/settings/settingsDefaults.js';

test('privacy defaults preserve the approved audience model', () => {
  const privacy = createDefaultSettings().privacy;
  assert.equal(privacy.fullProfileAudience, 'friends_and_servers');
  assert.equal(privacy.shareProfileUpdates, true);
  assert.equal(privacy.persistentVoiceVerificationCodes, false);
});
```

Run `npm run test:settings`; expected PASS after defaults are correct.

- [ ] **Step 2: Implement `Como o ChronoCord usa meus dados`**

Render immutable core-service explanation plus toggles for product improvement, experience personalization, sponsored-content activity personalization, sponsored third-party personalization, and voice-in-clips preference.

- [ ] **Step 3: Implement local data request state**

`Solicitar meus dados` records a local timestamp such as `privacy.lastLocalDataRequestAt` only if that field exists in defaults; if the approved defaults remain unchanged, keep request status in component state and do not silently expand persisted schema. Display `Solicitação registrada localmente` without claiming a server export exists.

- [ ] **Step 4: Implement profile privacy section**

Radio values:

```text
friends_and_servers
friends_and_small_servers
friends_only
```

Add `Compartilhar quando eu atualizar meu perfil` toggle and a related-settings card that navigates to activity privacy if that route exists, otherwise to the nearest ChronoCord activity settings route.

- [ ] **Step 5: Implement voice-encryption preference section**

Render `Habilitar códigos de verificação persistentes`. Copy must explicitly state this release stores the preference only and does not claim cryptographic enforcement.

- [ ] **Step 6: Wire Privacy routes into `SettingsCenter`**

Render `PrivacySettings` for `privacy.*` routes.

- [ ] **Step 7: Run validation**

```bash
npm run test:settings
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/settings/pages/PrivacySettings.jsx src/settings/SettingsCenter.jsx tests/settings-privacy-model.test.mjs
git commit -m "feat: add privacy settings reference UI"
```

---

## Plan verification gate

Manual checks before proceeding:

- username row still reflects the real profile;
- local email/phone survive closing/reopening Settings;
- MFA and family toggles survive restart;
- destructive buttons never log the user out or mutate server data;
- privacy audience persists per user;
- switching users does not leak another user's settings;
- build remains green.