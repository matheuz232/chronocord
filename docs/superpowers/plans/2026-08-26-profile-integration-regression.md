# Profile Integration and Regression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the profile summary/full profile from the reference images, integrate profile-privacy preferences, finish migration from the legacy settings modal, and run full desktop regression/build validation.

**Architecture:** Keep `ProfilePage.jsx` as the full-profile surface, extract the compact summary card into a focused component, and pass the same profile/banner/avatar/accent source into both surfaces. Privacy restrictions are client-preview rules only. After every new settings page is wired, remove only the now-unreachable legacy settings JSX and retain all underlying state/functions still used by voice, media, theme, and desktop behavior.

**Tech Stack:** React 18.3.1, Vite 6.3.5, existing profile state/API, v2 local settings, Electron 38, GitHub Actions Windows build.

**Spec:** `docs/superpowers/specs/2026-08-26-reference-settings-design.md`

## Global Constraints

- Do not invent fake mutual friends, servers, game activity, or social data for another user.
- Banner and avatar must adapt between compact and full-profile sizes without changing source asset.
- Full-profile privacy is a client preview in this release; never claim server enforcement.
- Preserve existing local mural/posts/widgets/wishlist behavior in `ProfilePage.jsx`.
- Do not delete underlying ChronoCord state merely because legacy settings JSX is removed.
- Final acceptance requires production build and Windows installer workflow validation.

---

### Task 1: Profile summary card extraction

**Files:**
- Create: `src/profile/ProfileSummaryCard.jsx`
- Create: `src/profile/profileViewModel.js`
- Modify: `src/ChronoCord.jsx`
- Create: `tests/profile-view-model.test.mjs`
- Modify: `package.json`

**Interfaces:**
- `buildProfileViewModel(profile, context)` returns normalized display fields without fabricating absent social data.
- `ProfileSummaryCard({ profile, viewer, privacy, T, themeColor, onOpenFullProfile, onClose })`.

- [ ] **Step 1: Add profile test script coverage**

Extend the test script to include profile tests:

```json
"test:settings": "node --test tests/settings-*.test.mjs tests/profile-*.test.mjs"
```

- [ ] **Step 2: Write failing view-model tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProfileViewModel } from '../src/profile/profileViewModel.js';

test('profile view model does not invent mutual data', () => {
  const vm = buildProfileViewModel({ id: 'u1', username: 'Luna' }, {});
  assert.equal(vm.name, 'Luna');
  assert.deepEqual(vm.mutualFriends, []);
  assert.deepEqual(vm.mutualServers, []);
  assert.equal(vm.currentActivity, null);
});

test('profile view model preserves banner/avatar/bio when supplied', () => {
  const vm = buildProfileViewModel({ username: 'Luna', avatar: 'a.png', banner: 'b.png', aboutMe: 'bio' }, {});
  assert.equal(vm.avatar, 'a.png');
  assert.equal(vm.banner, 'b.png');
  assert.equal(vm.bio, 'bio');
});
```

Run `npm run test:settings`; expected FAIL before the module exists.

- [ ] **Step 3: Implement normalized profile view model**

Normalize current ChronoCord field aliases (`name`/`username`, `imgSrc`/`avatar`, `about`/`aboutMe`) without injecting fake values. Use empty arrays/null for unavailable social/activity data.

- [ ] **Step 4: Implement compact reference hierarchy**

`ProfileSummaryCard.jsx` must support:

```text
adaptive banner
avatar overlap + status
name/handle/chips
custom status card
mutual summary when data exists
bio + Ver Biografia Completa
member since
favorite/collection strip when data exists
current activity card when data exists
wishlist strip when data exists
Ver Perfil Completo
```

Missing blocks are hidden or rendered as a restrained empty state; do not populate sample Discord data.

- [ ] **Step 5: Replace the existing profile popover rendering**

In `ChronoCord.jsx`, route existing profile-card openings through `ProfileSummaryCard`. Preserve current right-click/click entry points.

- [ ] **Step 6: Validate**

```bash
npm run test:settings
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json src/profile/ProfileSummaryCard.jsx src/profile/profileViewModel.js src/ChronoCord.jsx tests/profile-view-model.test.mjs
git commit -m "feat: add reference profile summary card"
```

---

### Task 2: Full profile visual alignment and privacy preview

**Files:**
- Modify: `src/ProfilePage.jsx`
- Modify: `src/profile/profileViewModel.js`
- Create: `tests/profile-privacy.test.mjs`

**Interfaces:**
- `canViewFullProfile({ audience, isFriend, sharesServer, serverMemberCount }) -> boolean`.
- Full profile continues receiving `profile`, `isMe`, `T`, `themeColor`, `onClose`, `onEditProfile` plus viewer/privacy context if needed.

- [ ] **Step 1: Write privacy-rule tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewFullProfile } from '../src/profile/profileViewModel.js';

test('friends_only rejects non-friends', () => {
  assert.equal(canViewFullProfile({ audience: 'friends_only', isFriend: false, sharesServer: true, serverMemberCount: 20 }), false);
});

test('friends_and_small_servers accepts a shared small server', () => {
  assert.equal(canViewFullProfile({ audience: 'friends_and_small_servers', isFriend: false, sharesServer: true, serverMemberCount: 120 }), true);
});

test('friends_and_servers accepts any shared server', () => {
  assert.equal(canViewFullProfile({ audience: 'friends_and_servers', isFriend: false, sharesServer: true, serverMemberCount: 1000 }), true);
});
```

- [ ] **Step 2: Implement privacy helper**

Small-server threshold is 200 members, matching the approved reference copy. `isMe` should bypass restrictions at the caller level.

- [ ] **Step 3: Align full profile visual identity**

Use the same view model as the summary card for banner/avatar/accent. Keep mural, activity, wishlist, favorite games, widgets, and posting behavior. Improve header scaling and responsive widths rather than cloning the reference pixel-for-pixel.

- [ ] **Step 4: Add restricted preview state**

When local privacy rules deny full-profile visibility, render a limited profile state with avatar/name/basic status and explanatory copy instead of exposing full bio/widgets/posts.

- [ ] **Step 5: Validate and commit**

```bash
npm run test:settings
npm run build
```

```bash
git add src/ProfilePage.jsx src/profile/profileViewModel.js tests/profile-privacy.test.mjs
git commit -m "feat: align full profile with privacy preview"
```

---

### Task 3: Finish settings migration and remove dead legacy UI

**Files:**
- Modify: `src/ChronoCord.jsx`
- Modify: `src/settings/SettingsCenter.jsx`

**Interfaces:**
- New Settings Center is the only visible settings modal.
- Existing state/functions for voice, camera, transmission, soundboard, appearance, accessibility, language/time, and system desktop behavior remain available either through new routes or legacy props until explicitly migrated.

- [ ] **Step 1: Inventory legacy settings state before deletion**

Search each legacy state setter referenced inside the old Settings JSX. For every state, classify it as:

```text
still used elsewhere -> keep
migrated to SettingsCenter -> keep or bridge until caller removed
dead after migration -> remove state and setter only after grep confirms zero consumers
```

- [ ] **Step 2: Preserve existing non-reference settings**

Keep `Voz e vídeo`, `Aparência`, `Acessibilidade`, `Idioma e horário`, camera/transmission, sounds/soundboard, and existing desktop/system behaviors reachable from the new navigation. Do not regress microphone device selection or screen-share settings while replacing the shell.

- [ ] **Step 3: Remove only unreachable legacy settings markup**

Delete the old giant modal rendering after every route has a replacement. Do not opportunistically refactor unrelated chat/voice code in this task.

- [ ] **Step 4: Run static/build checks**

```bash
npm run test:settings
npm run check
npm run build
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ChronoCord.jsx src/settings/SettingsCenter.jsx
git commit -m "refactor: complete settings center migration"
```

---

### Task 4: Full functional regression

**Files:**
- Modify only if failures are found: affected feature files.
- Record results in: `RELEASE-1.0.3.md`

**Interfaces:**
- No new interface; this task gates release readiness.

- [ ] **Step 1: Run local automated checks**

```bash
npm run test:settings
npm run check
npm run build
```

Expected: PASS.

- [ ] **Step 2: Exercise settings persistence manually**

Using two test accounts/users:

```text
change privacy + notifications for user A
logout
login as user B -> A settings must not appear
change B settings
return to A -> A settings restored
close/reopen app -> settings restored
```

- [ ] **Step 3: Exercise pre-existing critical paths**

Verify:

```text
login
chat send/receive
servers and channels
DM
voice join/leave
microphone device selection
mute/unmute
screen share
screen-share paused state
Watch2Chronos
Jukebox background behavior
profile summary/full profile
Updater launch behavior
```

- [ ] **Step 4: Build installers**

On Windows runner/local Windows:

```bash
npm run dist
```

Expected artifacts:

```text
release/ChronoCord-Setup-1.0.3.exe
release/ChronoCord-Installer-1.0.3.exe
```

- [ ] **Step 5: Trigger/observe GitHub Actions Windows workflow**

Require green steps for install dependencies, preflights, build installers, verify installers, NSIS smoke test, animated bootstrapper smoke test, SHA-256, and artifact upload.

- [ ] **Step 6: Update release notes with evidence**

Add a concise `Settings & Profile` section to `RELEASE-1.0.3.md` and record which automated checks/workflow run passed. Do not say a backend-heavy feature is real when it is local preview state.

- [ ] **Step 7: Commit**

```bash
git add RELEASE-1.0.3.md
git commit -m "docs: record settings and profile validation"
```

---

## Final acceptance gate

The feature set is complete only when all of the following are true:

- every reference settings group/subgroup is reachable;
- settings search and nested navigation work;
- local preferences are isolated per user and survive restart/update;
- profile summary and full-profile views share the same visual data source;
- simulated security/destructive controls are clearly labeled and never mutate server accounts;
- existing microphone/screen share/Watch2Chronos/Jukebox flows still work;
- `npm run test:settings`, `npm run check`, and `npm run build` pass;
- Windows `npm run dist` produces both installers;
- GitHub Actions Windows smoke-test workflow is green.