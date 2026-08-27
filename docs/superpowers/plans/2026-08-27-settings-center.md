# Settings Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simplified inline settings pages with the complete ChronoCord settings center represented by the supplied references.

**Architecture:** Add focused renderer modules under `src/settings/`, preserve the monolithic app through a small product-transform integration point, and separate local desktop preferences from server-backed account/privacy preferences.

**Tech Stack:** React 18, Vite 6, Electron 38, localStorage, existing `serverFetch` bridge.

**Spec:** `docs/superpowers/specs/2026-08-27-chronocord-settings-profile-design.md`

## Global Constraints

- ChronoCord branding only.
- Settings migration must preserve old local preferences.
- Security controls are active only if server enforcement exists.
- Advertising controls are informational/inactive because ChronoCord 1.0.3 has no ad system.
- Voice persistent verification remains unavailable until identity-key verification exists.

---

### Task 1: Settings catalog and storage

**Files:**
- Create: `src/settings/settingsCatalog.js`
- Create: `src/settings/settingsStorage.js`
- Create: `tests/settings-v2-storage.test.mjs`

**Interfaces:**
- Produces `SETTINGS_SECTIONS`, `DEFAULT_LOCAL_SETTINGS`, `loadLocalSettings()`, `saveLocalSettings(next)`, `migrateLegacySettings()`.

- [ ] **Step 1: Write failing catalog/storage tests**

Assert all required groups/subpages exist and old preference keys migrate into `cc_settings_v2` without losing values.

- [ ] **Step 2: Run RED**

Run: `node --test tests/settings-v2-storage.test.mjs`
Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement minimal modules**

`SETTINGS_SECTIONS` must include Account, Data and privacy, Message permissions, Notifications, Voice/video, Camera, Streaming, Sounds, Soundboard, Advanced, Accessibility, System, Developer, Language/time, Appearance.

- [ ] **Step 4: Run GREEN**

Run: `npm run test:settings`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add versioned settings catalog"`

### Task 2: Account API client

**Files:**
- Create: `src/settings/accountApi.js`
- Create: `tests/settings-account-api.test.mjs`

**Interfaces:**
- Produces `createAccountApi(serverFetch, baseUrl, getToken)` with methods `getAccount`, `patchAccount`, `revealPrivate`, `changePassword`, `setupMfa`, `enableMfa`, `disableMfa`, `getSessions`, `revokeSession`, `revokeOtherSessions`, `getPreferences`, `patchPreferences`, `getBlocks`, `blockUser`, `unblockUser`, `requestDataExport`, `getDataExport`, `deactivate`, `deleteAccount`, `reactivate`.

- [ ] **Step 1: Write failing request-contract tests**

Use a fake fetch bridge and assert method, path, Authorization header and JSON body for each method.

- [ ] **Step 2: Run RED**

Run: `node --test tests/settings-account-api.test.mjs`
Expected: FAIL.

- [ ] **Step 3: Implement API client**

Use a single private request helper that throws an `Error` containing the server error field on non-2xx responses.

- [ ] **Step 4: Run GREEN**

Run: `npm run test:settings`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add account settings api client"`

### Task 3: Settings Center shell and complete navigation

**Files:**
- Create: `src/settings/SettingsCenter.jsx`
- Modify: `build/chronocord-product-transform.mjs`
- Modify: `tests/settings-product-transform.test.mjs`
- Create: `tests/settings-center.test.mjs`

**Interfaces:**
- `SettingsCenter` props: `{ open, onClose, theme, currentUser, localSettings, onLocalSettingsChange, accountApi, appVersion, onLogout }`.

- [ ] **Step 1: Write failing rendering/source-contract tests**

Assert every supplied heading/subpage label exists, ChronoCord replaces Discord branding, and product transform imports/renders `SettingsCenter` instead of the old inline branch.

- [ ] **Step 2: Run RED**

Run: `npm run test:settings`
Expected: FAIL.

- [ ] **Step 3: Implement shell and shared controls**

Provide reusable `SectionHeading`, `SettingRow`, `Toggle`, `RadioRow`, `SelectRow`, `ActionButton`, `InfoBanner`, `DangerCard` components inside the focused file or adjacent small files if size exceeds ~800 lines.

- [ ] **Step 4: Run GREEN**

Run: `npm run test:settings && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add complete settings center shell"`

### Task 4: Account/security/privacy/message-permission pages

**Files:**
- Modify: `src/settings/SettingsCenter.jsx`
- Modify: `src/settings/settingsCatalog.js`
- Create/modify: `tests/settings-center.test.mjs`

- [ ] **Step 1: Add failing contracts**

Cover account info, password/MFA/sessions/status/family, deactivate/delete, data usage, profile privacy, voice encryption copy, content filters, spam, DMs, friend requests, connected games and block list.

- [ ] **Step 2: Run RED**

Run: `npm run test:settings`
Expected: FAIL on missing sections/actions.

- [ ] **Step 3: Wire real actions**

Load account/preferences/blocks when settings opens; optimistic changes are prohibited for destructive/security actions. Show explicit loading/error/success states. Data export calls server and saves JSON through Electron if a save-file bridge exists; otherwise show copy/save fallback.

- [ ] **Step 4: Run GREEN**

Run: `npm run test:settings && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: wire account privacy and permission settings"`

### Task 5: Notification, System, Developer and shortcuts pages

**Files:**
- Create: `src/settings/keyboardShortcuts.js`
- Modify: `src/settings/SettingsCenter.jsx`
- Modify: `src/settings/settingsCatalog.js`
- Create: `tests/settings-shortcuts.test.mjs`

- [ ] **Step 1: Add failing shortcut/notification tests**

Assert reference shortcut labels/chords, notification subpages, sound-preview controls, Developer mode/test application ID and ChronoCord Assistant copy.

- [ ] **Step 2: Run RED**

Run: `npm run test:settings`
Expected: FAIL.

- [ ] **Step 3: Implement local behavior**

Keyboard listener must ignore editable inputs except Escape/context-menu actions. Only execute shortcuts backed by an existing ChronoCord action; mark unsupported reference actions disabled in the list. Desktop/taskbar notifications use Electron bridges when available and browser Notification fallback otherwise.

- [ ] **Step 4: Run GREEN**

Run: `npm run test:settings && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add notifications shortcuts and developer settings"`
