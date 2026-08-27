# Settings Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reusable settings shell, navigation catalog, versioned per-user local persistence, search, and shared controls used by every reference settings page.

**Architecture:** Extract settings infrastructure out of the monolithic `ChronoCord.jsx` into focused files under `src/settings/`. Keep the existing ChronoCord theme as an injected dependency instead of creating a second theme system. Pure route/default/storage helpers are covered with Node's built-in test runner; JSX integration is verified by `vite build`.

**Tech Stack:** React 18.3.1, Vite 6.3.5, Node 22 built-in `node:test`, localStorage.

**Spec:** `docs/superpowers/specs/2026-08-26-reference-settings-design.md`

## Global Constraints

- This release is UI-first; backend-heavy account/security operations remain local/simulated.
- Persist per authenticated user at `chronocord.settings.v2.<userId>`.
- Never store passwords, authentication tokens, MFA secrets, or raw security credentials in the settings object.
- Preserve ChronoCord theme colors, typography, rounded panels, and existing dark/light modes.
- Missing stored fields must be merged from defaults so future schema additions remain backward compatible.
- Existing voice, screen share, Watch2Chronos, Jukebox, updater, and installer flows must remain unchanged by this subsystem.

---

### Task 1: Versioned settings defaults and storage

**Files:**
- Create: `src/settings/settingsDefaults.js`
- Create: `src/settings/settingsStorage.js`
- Create: `tests/settings-storage.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `SETTINGS_SCHEMA_VERSION`, `createDefaultSettings()`, `settingsStorageKey(userId)`, `loadSettings(userId, storage)`, `saveSettings(userId, value, storage)`, `mergeSettings(defaults, stored)`.
- Consumers: every later settings page and `SettingsCenter.jsx`.

- [ ] **Step 1: Write the failing storage tests**

Create `tests/settings-storage.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSettings } from '../src/settings/settingsDefaults.js';
import { loadSettings, saveSettings, settingsStorageKey } from '../src/settings/settingsStorage.js';

function fakeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

test('settings key is namespaced per user', () => {
  assert.equal(settingsStorageKey('abc'), 'chronocord.settings.v2.abc');
  assert.notEqual(settingsStorageKey('abc'), settingsStorageKey('xyz'));
});

test('loadSettings fills missing nested defaults', () => {
  const storage = fakeStorage({
    'chronocord.settings.v2.abc': JSON.stringify({ schemaVersion: 2, privacy: { improveProduct: true } }),
  });
  const loaded = loadSettings('abc', storage);
  assert.equal(loaded.privacy.improveProduct, true);
  assert.equal(loaded.notifications.desktopEnabled, createDefaultSettings().notifications.desktopEnabled);
  assert.equal(loaded.system.developerMode, false);
});

test('invalid persisted JSON falls back to defaults', () => {
  const storage = fakeStorage({ 'chronocord.settings.v2.abc': '{bad json' });
  assert.deepEqual(loadSettings('abc', storage), createDefaultSettings());
});

test('saveSettings never changes the namespace of another user', () => {
  const storage = fakeStorage();
  saveSettings('abc', createDefaultSettings(), storage);
  assert.ok(storage.getItem('chronocord.settings.v2.abc'));
  assert.equal(storage.getItem('chronocord.settings.v2.xyz'), null);
});
```

- [ ] **Step 2: Add a test script and run the failing test**

Add to `package.json` scripts:

```json
"test:settings": "node --test tests/settings-*.test.mjs"
```

Run:

```bash
npm run test:settings
```

Expected: FAIL because the settings modules do not exist yet.

- [ ] **Step 3: Implement the complete version-2 defaults**

`src/settings/settingsDefaults.js` must export the exact schema from the approved spec, including `account`, `privacy`, `messaging`, `notifications`, `system`, and `ui`, and return a fresh object on every `createDefaultSettings()` call.

- [ ] **Step 4: Implement deep merge and storage helpers**

`src/settings/settingsStorage.js`:

```js
import { createDefaultSettings } from './settingsDefaults.js';

export function settingsStorageKey(userId) {
  return `chronocord.settings.v2.${String(userId || 'guest')}`;
}

export function mergeSettings(defaults, stored) {
  if (Array.isArray(defaults)) return Array.isArray(stored) ? stored : defaults;
  if (!defaults || typeof defaults !== 'object') return stored === undefined ? defaults : stored;
  const source = stored && typeof stored === 'object' ? stored : {};
  return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, mergeSettings(value, source[key])]));
}

export function loadSettings(userId, storage = globalThis.localStorage) {
  const defaults = createDefaultSettings();
  try {
    const raw = storage?.getItem?.(settingsStorageKey(userId));
    return raw ? mergeSettings(defaults, JSON.parse(raw)) : defaults;
  } catch {
    return defaults;
  }
}

export function saveSettings(userId, value, storage = globalThis.localStorage) {
  storage?.setItem?.(settingsStorageKey(userId), JSON.stringify(value));
}
```

- [ ] **Step 5: Run tests**

```bash
npm run test:settings
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json src/settings/settingsDefaults.js src/settings/settingsStorage.js tests/settings-storage.test.mjs
git commit -m "feat: add versioned settings persistence"
```

---

### Task 2: Settings catalog and navigation search

**Files:**
- Create: `src/settings/settingsCatalog.js`
- Create: `tests/settings-catalog.test.mjs`

**Interfaces:**
- Produces: `SETTINGS_GROUPS`, `DEFAULT_SHORTCUTS`, `flattenSettingsRoutes()`, `filterSettingsRoutes(query)`.
- Consumers: `SettingsSidebar.jsx`, `SystemSettings.jsx`, settings search.

- [ ] **Step 1: Write failing catalog tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { filterSettingsRoutes, flattenSettingsRoutes, DEFAULT_SHORTCUTS } from '../src/settings/settingsCatalog.js';

test('catalog contains all approved top-level groups', () => {
  const ids = new Set(flattenSettingsRoutes().map((x) => x.id));
  for (const id of ['account.info','privacy.data','messaging.content','notifications.overview','system.general','developer']) {
    assert.ok(ids.has(id), `missing ${id}`);
  }
});

test('search matches nested labels case-insensitively', () => {
  const result = filterSettingsRoutes('atalhos padrão');
  assert.ok(result.some((x) => x.id === 'system.defaultShortcuts'));
});

test('default shortcut catalog includes voice and message actions', () => {
  const ids = new Set(DEFAULT_SHORTCUTS.map((x) => x.id));
  assert.ok(ids.has('message.edit'));
  assert.ok(ids.has('voice.toggleMute'));
  assert.ok(ids.has('misc.search'));
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm run test:settings
```

Expected: FAIL because `settingsCatalog.js` does not exist.

- [ ] **Step 3: Implement catalog**

Define the approved groups and nested routes, keeping route IDs stable. Define the shortcut objects as:

```js
{
  id: 'message.edit',
  section: 'Mensagens',
  label: 'Editar mensagem',
  keys: ['E'],
}
```

Implement search over both main group labels and nested labels with accent-insensitive comparison using `normalize('NFD')`.

- [ ] **Step 4: Run tests**

```bash
npm run test:settings
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/settings/settingsCatalog.js tests/settings-catalog.test.mjs
git commit -m "feat: add settings navigation catalog"
```

---

### Task 3: Shared setting controls

**Files:**
- Create: `src/settings/components/SettingControls.jsx`
- Create: `src/settings/settings.css`

**Interfaces:**
- Produces React components: `SettingSection`, `SettingRow`, `SettingToggle`, `SettingRadio`, `SettingSelect`, `SettingCard`, `RelatedSettingCard`, `ShortcutChip`, `DangerAction`, `SettingsNotice`.
- Consumers: all settings pages.

- [ ] **Step 1: Implement components with controlled props**

Each interactive component must receive `value/checked`, `onChange`, `disabled`, and accessible label text. No component owns business state.

Example toggle contract:

```jsx
<SettingToggle
  checked={settings.notifications.desktopEnabled}
  onChange={(checked) => patch('notifications.desktopEnabled', checked)}
  ariaLabel="Ativar notificações na área de trabalho"
/>
```

- [ ] **Step 2: Implement ChronoCord-native styling**

Use CSS variables supplied by the parent shell (`--cc-bg-*`, `--cc-border`, `--cc-text-*`, `--cc-accent`) so the component set works in dark, light, and colored themes without hard-coded Discord colors.

- [ ] **Step 3: Verify production compilation**

```bash
npm run build
```

Expected: PASS with no JSX/esbuild errors.

- [ ] **Step 4: Commit**

```bash
git add src/settings/components/SettingControls.jsx src/settings/settings.css
git commit -m "feat: add reusable settings controls"
```

---

### Task 4: Settings sidebar and shell

**Files:**
- Create: `src/settings/components/SettingsSidebar.jsx`
- Create: `src/settings/SettingsCenter.jsx`
- Modify: `src/ChronoCord.jsx`

**Interfaces:**
- `SettingsCenter({ user, profile, T, themeColor, onClose, onLogout, legacySettings })`.
- `SettingsSidebar({ route, onRouteChange, query, onQueryChange })`.
- Later page plans plug into `SettingsCenter` using stable route IDs.

- [ ] **Step 1: Build the sidebar from `SETTINGS_GROUPS`**

Render profile header, search field, main groups, nested children, separators, and `Sair`. Search filters both groups and nested items.

- [ ] **Step 2: Build route-aware scrolling**

`SettingsCenter` owns `route` initialized from `settings.ui.lastSettingsRoute`. Selecting a nested route scrolls to a matching section `data-settings-route="..."` using `scrollIntoView({ block: 'start' })`.

- [ ] **Step 3: Add debounced persistence**

Load with `loadSettings(user.id)`. On state changes, persist after 150–250 ms and clear the timer on unmount. Update `ui.lastSettingsRoute` when route changes.

- [ ] **Step 4: Replace only the outer legacy settings modal entry point**

In `ChronoCord.jsx`, keep existing state setters and feature logic that later pages still need, but replace the visible settings modal shell with `SettingsCenter`. Do not delete legacy implementations until all later page plans have migrated their routes.

- [ ] **Step 5: Run tests and build**

```bash
npm run test:settings
npm run build
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/settings/SettingsCenter.jsx src/settings/components/SettingsSidebar.jsx src/ChronoCord.jsx
git commit -m "feat: add settings center shell"
```

---

## Plan verification gate

Before starting the next plan:

```bash
npm run test:settings
npm run build
```

Both must pass. Manually open Settings and verify: search works, route selection changes the active nested item, last route survives close/reopen, and theme colors still follow ChronoCord.