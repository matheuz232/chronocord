# System and Developer Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the System, shortcut catalog/custom shortcuts, ChronoCord Assistant, language/time adjacency, and Developer reference UI with local functional state.

**Architecture:** Put stable shortcut definitions in the shared catalog and keep custom bindings in the per-user v2 settings model. The Assistant and App Test modes are intentionally local simulations with explicit status text; no background OS service or external developer API is installed in this release.

**Tech Stack:** React 18.3.1, shared settings controls, Node `node:test`, localStorage v2 settings model.

**Spec:** `docs/superpowers/specs/2026-08-26-reference-settings-design.md`

## Global Constraints

- Default shortcut bindings are display catalog data; custom shortcuts are local preferences.
- Duplicate custom bindings must be rejected before persistence.
- Assistant install/uninstall is local simulation only.
- Developer mode and app-test mode must never mutate an external application or Discord API.
- Preserve existing ChronoCord system preferences (`openOnStartup`, `minimizeToTray`, `startMinimized`) by exposing or bridging them instead of deleting them.

---

### Task 1: Default shortcut catalog UI

**Files:**
- Create: `src/settings/pages/SystemSettings.jsx`
- Modify: `src/settings/SettingsCenter.jsx`
- Modify: `src/settings/settingsCatalog.js`
- Create: `tests/settings-shortcuts.test.mjs`

**Interfaces:**
- `SystemSettings({ route, settings, patchSettings, legacySystemPrefs, onLegacySystemPrefChange, T, themeColor })`.
- Uses `DEFAULT_SHORTCUTS` grouped by `section`.
- Routes: `system.general`, `system.customShortcuts`, `system.defaultShortcuts`, `system.assistant`.

- [ ] **Step 1: Write shortcut coverage test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SHORTCUTS } from '../src/settings/settingsCatalog.js';

test('reference shortcut catalog contains required visible bindings', () => {
  const byId = new Map(DEFAULT_SHORTCUTS.map((x) => [x.id, x]));
  assert.deepEqual(byId.get('shortcuts.list').keys, ['CTRL', '/']);
  assert.deepEqual(byId.get('message.copy').keys, ['CTRL', 'C']);
  assert.deepEqual(byId.get('voice.toggleMute').keys, ['CTRL', 'SHIFT', 'D']);
  assert.deepEqual(byId.get('call.answer').keys, ['CTRL', 'ENTER']);
  assert.deepEqual(byId.get('misc.contextMenu').keys, ['SHIFT', 'F10']);
});
```

Run `npm run test:settings`; expected FAIL until all bindings are defined.

- [ ] **Step 2: Complete `DEFAULT_SHORTCUTS`**

Include every approved message, voice/call, and miscellaneous action. Group labels must be ChronoCord wording. Replace the Discord/Wumpus easter egg with a ChronoCord-branded optional row rather than copying the external reference.

- [ ] **Step 3: Render Atalhos padrão**

Render section headings and rows with `ShortcutChip` for each key. Long keys such as `BACKSPACE` and `ENTER` must not overflow on small settings widths.

- [ ] **Step 4: Render Sistema > Geral**

Bridge existing ChronoCord `openOnStartup`, `minimizeToTray`, and `startMinimized` state into the new page. If the existing values are already persisted elsewhere, do not duplicate them in v2 unless a migration is explicitly added.

- [ ] **Step 5: Validate and commit**

```bash
npm run test:settings
npm run build
```

Expected: PASS.

```bash
git add src/settings/pages/SystemSettings.jsx src/settings/SettingsCenter.jsx src/settings/settingsCatalog.js tests/settings-shortcuts.test.mjs
git commit -m "feat: add system and default shortcut settings"
```

---

### Task 2: Custom shortcut CRUD and conflict validation

**Files:**
- Modify: `src/settings/pages/SystemSettings.jsx`
- Create: `src/settings/shortcutBindings.js`
- Create: `tests/settings-custom-shortcuts.test.mjs`

**Interfaces:**
- `normalizeBinding(keys: string[]): string[]`.
- `bindingId(keys: string[]): string`.
- `findBindingConflict(candidate, customShortcuts, defaultShortcuts): { type, shortcut } | null`.

- [ ] **Step 1: Write failing conflict tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { bindingId, findBindingConflict } from '../src/settings/shortcutBindings.js';

test('binding order normalizes modifiers before key', () => {
  assert.equal(bindingId(['D','CTRL','SHIFT']), 'CTRL+SHIFT+D');
});

test('duplicate custom binding is rejected', () => {
  const existing = [{ id: 'x', keys: ['CTRL','SHIFT','D'], action: 'example' }];
  assert.ok(findBindingConflict(['D','SHIFT','CTRL'], existing, []));
});
```

Run `npm run test:settings`; expected FAIL until helper exists.

- [ ] **Step 2: Implement binding normalization**

Use modifier order `CTRL`, `ALT`, `SHIFT`, `META`, then the non-modifier key. Uppercase all key labels for comparison while preserving a presentational label at render time.

- [ ] **Step 3: Implement custom shortcut editor UI**

Support add, edit, remove, and reset-to-default. Capture a binding using keyboard events inside a focused capture box, not global listeners that interfere with chat shortcuts.

- [ ] **Step 4: Reject conflicts**

Before saving, compare against custom bindings and the default catalog. Show the conflicting action label inline. Do not silently overwrite another shortcut.

- [ ] **Step 5: Run tests/build and commit**

```bash
npm run test:settings
npm run build
```

```bash
git add src/settings/pages/SystemSettings.jsx src/settings/shortcutBindings.js tests/settings-custom-shortcuts.test.mjs
git commit -m "feat: add custom shortcut editor"
```

---

### Task 3: ChronoCord Assistant local simulation

**Files:**
- Modify: `src/settings/pages/SystemSettings.jsx`

**Interfaces:**
- Uses `settings.system.assistantInstalled` and `settings.system.assistantRunning`.

- [ ] **Step 1: Render assistant status**

Status mapping:

```text
assistantInstalled=false -> Não instalado
assistantInstalled=true, assistantRunning=false -> Parado
assistantInstalled=true, assistantRunning=true -> Correndo
```

- [ ] **Step 2: Implement local install/uninstall actions**

Install sets installed=true and running=true after a short UI progress state. Uninstall sets both false. Copy explicitly says the true OS companion/service is deferred to final integration.

- [ ] **Step 3: Validate build**

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/settings/pages/SystemSettings.jsx
git commit -m "feat: add ChronoCord assistant preview settings"
```

---

### Task 4: Developer page

**Files:**
- Create: `src/settings/pages/DeveloperSettings.jsx`
- Modify: `src/settings/SettingsCenter.jsx`
- Create: `tests/settings-developer-model.test.mjs`

**Interfaces:**
- `DeveloperSettings({ settings, patchSettings, T, themeColor })`.
- Route: `developer`.

- [ ] **Step 1: Write developer-state test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultSettings } from '../src/settings/settingsDefaults.js';

test('developer features are off by default', () => {
  const s = createDefaultSettings().system;
  assert.equal(s.developerMode, false);
  assert.equal(s.appTestMode, false);
  assert.equal(s.appTestId, '');
});
```

- [ ] **Step 2: Implement page**

Render `Modo desenvolvedor` and `Modo de Teste de Aplicativos` toggles. App ID input is disabled unless `appTestMode` is true. Turning app-test mode off does not have to erase the saved local ID unless product design explicitly requests it.

- [ ] **Step 3: Wire route and validate**

```bash
npm run test:settings
npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/settings/pages/DeveloperSettings.jsx src/settings/SettingsCenter.jsx tests/settings-developer-model.test.mjs
git commit -m "feat: add developer settings reference UI"
```

---

## Plan verification gate

Manual checks:

- system general still changes existing desktop preferences;
- every default shortcut from the screenshots renders with correct chips;
- duplicate custom shortcut produces visible conflict instead of saving;
- Assistant state persists per user and is clearly labeled as preview/local;
- Developer/App Test state persists and app ID field enables/disables correctly;
- tests and production build stay green.