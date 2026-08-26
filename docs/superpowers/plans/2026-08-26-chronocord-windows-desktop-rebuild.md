# ChronoCord Windows Desktop Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild ChronoCord as a production-grade Windows desktop client with isolated feature modules, deterministic builds, resilient networking/media, safe updates, and measurable performance.

**Architecture:** Preserve the existing server protocol at the boundary while replacing the monolithic renderer and patch-driven build chain. Electron remains the native shell with a narrow preload API; React is reorganized by feature; HTTP/Socket.IO are centralized; WebRTC/media and updater state are isolated from chat/UI state.

**Tech Stack:** Electron 38.x initially pinned, React 18.3.1, Vite 6.3.5, Socket.IO 4.8.1, Electron Builder 26.x, Node.js 22 LTS in CI, npm with committed `package-lock.json`, Windows-first installer and updater.

**Spec:** `docs/superpowers/specs/2026-08-26-chronocord-windows-desktop-rebuild-design.md`

## Global Constraints

- Target platform is Windows desktop only for this rebuild.
- Source code is the single source of truth; build-time scripts must not rewrite application source.
- Preserve `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, and restricted navigation.
- Feature failures must degrade locally instead of crashing the entire application.
- Use `npm ci` from a committed `package-lock.json` in CI.
- Do not run `npm audit fix --force` automatically.
- Keep Electron/native toolchain versions pinned until an explicit upgrade is tested.
- Do not publish an installer unless existence, size, resources, and SHA-256 verification pass.
- Keep the existing server protocol compatible where practical; legacy behavior belongs in adapters.
- Android/Capacitor packaging is outside the rebuild.

---

### Task 1: Freeze the reference baseline and create the rebuild branch

**Files:**
- Create: `docs/superpowers/migration/2026-08-26-baseline.md`
- Modify: no application source files

**Interfaces:**
- Consumes: current `development/1.0.3-stability` baseline and approved architecture spec.
- Produces: a written baseline record naming the source commit, known working behaviors, known failures, and migration boundaries.

- [ ] **Step 1: Record the baseline commit and current build facts**

Document the reference commit, Node version, Electron version, known CI failures, and the current installer workflow. Explicitly record that the last observed release failure is `scripts/verify-release-config.mjs` rejecting `updates/latest.json` even though the manifest path is valid.

- [ ] **Step 2: Record feature acceptance scenarios**

Create a checklist covering login, server navigation, channels, messaging, DMs, voice, webcam, screen sharing, Jukebox, Watch2Chronos, profiles/avatar/banner, themes, stickers/GIFs, updater, install/uninstall and recovery after server failure.

- [ ] **Step 3: Create the dedicated rebuild branch**

Create `rebuild/windows-desktop-2` from the latest stability commit. Do not modify `main` or the stability branch while the migration is under construction.

- [ ] **Step 4: Commit the baseline only**

```bash
git add docs/superpowers/migration/2026-08-26-baseline.md
git commit -m "docs: freeze Windows desktop rebuild baseline"
```

---

### Task 2: Normalize the package/toolchain and make clean installs deterministic

**Files:**
- Modify: `package.json`
- Create: `package-lock.json`
- Modify: `.gitignore`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/release.yml`
- Create: `scripts/validate-toolchain.mjs`

**Interfaces:**
- Consumes: existing npm dependency graph and current Electron/Vite build scripts.
- Produces: `npm ci` compatible repository with a single pinned CI toolchain and a reusable toolchain validator.

- [ ] **Step 1: Generate and commit the lockfile from the current dependency graph**

Run `npm install --package-lock-only` on the rebuild branch, review peer/native dependency changes, then verify a clean `npm ci` in a fresh workspace before accepting the lockfile.

- [ ] **Step 2: Remove mobile-only production dependencies from the Windows desktop build**

Move Capacitor-specific packages/scripts out of the desktop production path. Do not delete server/client protocol code that is still shared; only remove packages that are unused after the Windows migration is complete.

- [ ] **Step 3: Add toolchain validation**

Create `scripts/validate-toolchain.mjs` that verifies Node major version 22, required Electron/Vite versions from `package.json`, Windows-only packaging expectations, and the existence of required native assets. It must exit non-zero with an actionable message when a requirement is violated.

- [ ] **Step 4: Change CI/release install commands to `npm ci`**

Replace `npm install` with `npm ci` in `.github/workflows/ci.yml` and `.github/workflows/release.yml`. Add dependency caching keyed by `package-lock.json`.

- [ ] **Step 5: Commit the deterministic toolchain**

```bash
git add package.json package-lock.json .gitignore scripts/validate-toolchain.mjs .github/workflows/ci.yml .github/workflows/release.yml
git commit -m "build: make Windows toolchain reproducible"
```

---

### Task 3: Replace the renderer monolith with the new application shell

**Files:**
- Create: `src/app/App.jsx`
- Create: `src/app/routes.js`
- Create: `src/app/providers/AppProviders.jsx`
- Create: `src/core/lifecycle/appLifecycle.js`
- Create: `src/core/errors/AppErrorBoundary.jsx`
- Create: `src/core/errors/errorReporter.js`
- Modify: `src/main.jsx`
- Modify: `vite.config.js`
- Migrate/remove: `src/ChronoCord.jsx` after feature migration is complete

**Interfaces:**
- Consumes: current UI behavior and existing CSS assets.
- Produces: an `App` root that owns providers/layout routing only; features render independently and can fail locally.

- [ ] **Step 1: Write unit tests for app error isolation**

Create a test that mounts a feature which throws during render and asserts the global shell remains mounted while the feature fallback appears.

- [ ] **Step 2: Build `AppErrorBoundary` and error reporting**

Create an error boundary that records a sanitized error object, provides retry/reload controls, and never renders stack traces to end users.

- [ ] **Step 3: Build `AppProviders` and lifecycle state**

Create providers for configuration, auth/session, network status, theme, notifications and feature registries. Keep provider state minimal and make cleanup explicit on logout/shutdown.

- [ ] **Step 4: Build `App.jsx` as a shell only**

Move window-level layout, routing, provider composition and global fallbacks into `App.jsx`. Do not move feature business logic into the shell.

- [ ] **Step 5: Wire `main.jsx` to the new shell**

Keep a single React root and verify the app starts without importing `ChronoCord.jsx` as its root container.

- [ ] **Step 6: Commit the new shell**

```bash
git add src/app src/core/errors src/core/lifecycle src/main.jsx vite.config.js
git commit -m "refactor: introduce modular Windows desktop app shell"
```

---

### Task 4: Centralize HTTP, Socket.IO, auth/session and protocol validation

**Files:**
- Create: `src/api/http/httpClient.js`
- Create: `src/api/http/requestPolicy.js`
- Create: `src/api/socket/socketSession.js`
- Create: `src/api/socket/socketEvents.js`
- Create: `src/api/protocol/validators.js`
- Create: `src/api/protocol/types.js`
- Create: `src/features/auth/sessionStore.js`
- Create: `src/features/auth/authService.js`
- Create: `tests/unit/network/requestPolicy.test.js`
- Create: `tests/unit/network/socketSession.test.js`
- Create: `tests/unit/auth/sessionStore.test.js`

**Interfaces:**
- Consumes: current `window.electronAPI.serverRequest`, Socket.IO events and existing authentication payloads.
- Produces: feature-safe service methods/events; feature components do not import Socket.IO directly.

- [ ] **Step 1: Write failing retry-policy tests**

Cover retries for GET/HEAD/OPTIONS, no automatic retries for mutating requests, timeout conversion to typed errors, and exponential backoff with jitter bounds.

- [ ] **Step 2: Implement `requestPolicy` and `httpClient`**

Centralize timeout, retry, allow-list and error normalization. Return typed results without leaking raw network errors into feature code.

- [ ] **Step 3: Write failing Socket.IO lifecycle tests**

Cover connect, connect_error, disconnect, reconnect, logout cleanup, duplicate-listener prevention and backoff.

- [ ] **Step 4: Implement `socketSession`**

Expose `connect`, `disconnect`, `emit`, `subscribe`, `getStatus`, and `resetAuth`. All listeners must be tracked and removed by owner.

- [ ] **Step 5: Add protocol validation**

Create validators for the core server payloads needed by auth, messaging, DMs, presence, voice signaling and media sync. Invalid payloads become typed protocol errors and never mutate feature state.

- [ ] **Step 6: Move auth persistence behind `sessionStore`**

Use the Electron credential bridge for sensitive data and keep renderer session state free of raw password persistence.

- [ ] **Step 7: Commit the network boundary**

```bash
git add src/api src/features/auth tests/unit/network tests/unit/auth
git commit -m "feat: add centralized network and session layer"
```

---

### Task 5: Minimize and version the Electron IPC boundary

**Files:**
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Create: `electron/services/networkService.cjs`
- Create: `electron/services/secureStorage.cjs`
- Create: `electron/services/windowService.cjs`
- Create: `electron/services/mediaCaptureService.cjs`
- Create: `src/platform/electron/electronApi.js`
- Create: `tests/unit/platform/electronApi.test.js`

**Interfaces:**
- Consumes: current native capabilities in `main.cjs`/`preload.cjs`.
- Produces: a narrow capability API with versioned, validated IPC commands.

- [ ] **Step 1: Write IPC contract tests**

Verify only declared operations exist, malformed payloads are rejected, and renderer code cannot access arbitrary Electron modules.

- [ ] **Step 2: Extract secure storage**

Move `safeStorage` handling to `electron/services/secureStorage.cjs`; define encrypted credential schema and atomic writes.

- [ ] **Step 3: Extract network bridge**

Move the allow-listed server bridge to `networkService.cjs`; require HTTPS origin equality and fixed timeout bounds.

- [ ] **Step 4: Extract window/native capture services**

Move window controls and screen/media capture into dedicated services. Permission denial must return a structured recoverable result.

- [ ] **Step 5: Replace broad preload exposure with grouped APIs**

Expose only `windowApi`, `networkApi`, `sessionApi`, `socketApi` and `mediaApi` methods actually used by the renderer.

- [ ] **Step 6: Commit the native boundary**

```bash
git add electron src/platform/electron tests/unit/platform
git commit -m "refactor: harden Electron IPC boundary"
```

---

### Task 6: Build the reusable UI system, themes and motion engine

**Files:**
- Create: `src/ui/components/Button.jsx`
- Create: `src/ui/components/Menu.jsx`
- Create: `src/ui/components/Dialog.jsx`
- Create: `src/ui/components/Avatar.jsx`
- Create: `src/ui/components/MessageRow.jsx`
- Create: `src/ui/components/MediaSurface.jsx`
- Create: `src/ui/components/LoadingState.jsx`
- Create: `src/ui/components/ErrorState.jsx`
- Create: `src/ui/theme/themeStore.js`
- Create: `src/ui/theme/themes.js`
- Create: `src/ui/motion/motion.js`
- Create: `src/ui/motion/MotionConfig.jsx`
- Migrate: theme/motion CSS files as needed

**Interfaces:**
- Consumes: current visual identity and the three existing themes.
- Produces: shared components and motion primitives used by all migrated features.

- [ ] **Step 1: Write theme utility tests**

Verify theme persistence, default theme selection and reduced-motion handling.

- [ ] **Step 2: Implement theme store**

Support Original, White and Black themes through CSS variables/data attributes rather than duplicating component styles.

- [ ] **Step 3: Implement motion primitives**

Standardize enter/exit, press, hover, panel and modal transitions. Honor `prefers-reduced-motion` and provide a global motion setting.

- [ ] **Step 4: Implement reusable UI primitives**

Build buttons, menus, dialogs, avatars, message rows, loading/error states and media surfaces with keyboard/focus behavior.

- [ ] **Step 5: Commit the design system**

```bash
git add src/ui
 git commit -m "feat: establish ChronoCord desktop design system"
```

---

### Task 7: Migrate servers, channels, messages, DMs, presence and notifications

**Files:**
- Create: `src/features/servers/serverStore.js`
- Create: `src/features/servers/ServerList.jsx`
- Create: `src/features/channels/channelStore.js`
- Create: `src/features/channels/ChannelView.jsx`
- Create: `src/features/messages/messageStore.js`
- Create: `src/features/messages/MessageView.jsx`
- Create: `src/features/dms/dmStore.js`
- Create: `src/features/dms/DMView.jsx`
- Create: `src/features/presence/presenceStore.js`
- Create: `src/features/notifications/notificationStore.js`
- Create integration tests under `tests/integration/messaging/`

**Interfaces:**
- Consumes: `httpClient`, `socketSession`, protocol validators and UI primitives.
- Produces: independently recoverable chat/navigation features.

- [ ] **Step 1: Write failing DM-open integration test**

Simulate DM list load failure and verify the app shell, server list and active channel remain mounted.

- [ ] **Step 2: Implement server/channel stores**

Keep selection state local to the navigation feature; derive visible items from validated server data.

- [ ] **Step 3: Implement message store/view**

Handle pagination, optimistic local state only where safe, socket updates and cleanup of per-channel listeners.

- [ ] **Step 4: Implement DM store/view**

Open DMs through a dedicated feature controller, with loading/error/empty states and no global side effects on failure.

- [ ] **Step 5: Implement presence/notifications**

Normalize presence updates and notification lifecycle without rerendering the entire app on every presence event.

- [ ] **Step 6: Commit messaging migration**

```bash
git add src/features/servers src/features/channels src/features/messages src/features/dms src/features/presence src/features/notifications tests/integration/messaging
git commit -m "feat: migrate desktop messaging features"
```

---

### Task 8: Isolate voice, webcam, screen sharing and WebRTC lifecycle

**Files:**
- Create: `src/features/voice/voiceStore.js`
- Create: `src/features/voice/voiceSession.js`
- Create: `src/features/voice/peerConnectionManager.js`
- Create: `src/features/voice/deviceManager.js`
- Create: `src/features/voice/VoicePanel.jsx`
- Create: `tests/unit/voice/peerConnectionManager.test.js`
- Create: `tests/integration/voice/voiceLifecycle.test.js`

**Interfaces:**
- Consumes: validated WebRTC signaling events and native media capture APIs.
- Produces: independent voice, webcam and screen-share state with deterministic cleanup.

- [ ] **Step 1: Write lifecycle tests**

Cover join, leave, reconnect, peer add/remove, device permission denied, track replacement and cleanup on logout/window close.

- [ ] **Step 2: Implement device manager**

Enumerate/select microphone/camera/screen sources and expose permission failures as recoverable states.

- [ ] **Step 3: Implement peer connection manager**

Own RTCPeerConnection objects, ICE state, sender/receiver tracks and complete cleanup.

- [ ] **Step 4: Implement voice session**

Coordinate socket signaling and peer lifecycle without mutating chat state.

- [ ] **Step 5: Implement independent webcam/screen-share controls**

Starting/stopping one medium must not destroy the other. Screen-share end events must update UI without crashing the call.

- [ ] **Step 6: Commit the media lifecycle**

```bash
git add src/features/voice tests/unit/voice tests/integration/voice
 git commit -m "feat: isolate voice and WebRTC lifecycles"
```

---

### Task 9: Rebuild Jukebox and Watch2Chronos as independent media controllers

**Files:**
- Create: `src/features/media/mediaStore.js`
- Create: `src/features/media/mediaController.js`
- Create: `src/features/media/Jukebox.jsx`
- Create: `src/features/media/Watch2Chronos.jsx`
- Create: `tests/unit/media/mediaController.test.js`
- Create: `tests/integration/media/mediaLoadFailure.test.js`

**Interfaces:**
- Consumes: current `jukebox-*` and `watch2-*` socket events plus remote media URLs.
- Produces: player state that can fail locally and recover independently from chat/voice.

- [ ] **Step 1: Write failing media-load failure tests**

Assert invalid/unreachable media leaves the feature in an error state while navigation and chat remain usable.

- [ ] **Step 2: Implement media controller**

Own media element lifecycle, load timeout, play/pause, seek, progress sync and cleanup.

- [ ] **Step 3: Implement Jukebox**

Move playlist and synchronized playback into a dedicated feature store/controller.

- [ ] **Step 4: Implement Watch2Chronos**

Keep playback synchronization separate from Jukebox and isolate embed/load failures.

- [ ] **Step 5: Commit media migration**

```bash
git add src/features/media tests/unit/media tests/integration/media
git commit -m "feat: rebuild desktop media subsystems"
```

---

### Task 10: Rebuild profiles, avatar/banner, themes, stickers and GIF workflows

**Files:**
- Create: `src/features/profile/profileStore.js`
- Create: `src/features/profile/ProfilePage.jsx`
- Create: `src/features/profile/ProfileEditor.jsx`
- Create: `src/features/settings/SettingsPage.jsx`
- Create: `src/features/settings/StickerEditor.jsx`
- Create: `src/features/settings/GifPicker.jsx`
- Create: `tests/unit/profile/profileStore.test.js`
- Create: `tests/integration/profile/profileMedia.test.js`

**Interfaces:**
- Consumes: existing profile data endpoints/events and the reusable UI/theme system.
- Produces: independent profile/media editing with separate avatar/banner uploads and recoverable validation errors.

- [ ] **Step 1: Write profile-media tests**

Cover independent avatar/banner updates, invalid media, cancellation, failed upload and reopening profile after failure.

- [ ] **Step 2: Implement profile store/editor**

Separate profile metadata from media state. Never use a single shared upload state for avatar and banner.

- [ ] **Step 3: Implement profile page**

Render profile header, avatar, banner, badges and editable sections using stable components.

- [ ] **Step 4: Implement stickers/GIF settings**

Create user-managed stickers and GIF import with local validation, size/type limits and optional GIPHY integration isolated behind a provider interface.

- [ ] **Step 5: Commit profile/settings migration**

```bash
git add src/features/profile src/features/settings tests/unit/profile tests/integration/profile
git commit -m "feat: rebuild profiles and personalization"
```

---

### Task 11: Replace updater validation and implement rollback-safe update lifecycle

**Files:**
- Create: `src/core/updates/updateManifest.js`
- Create: `src/core/updates/updateService.js`
- Create: `electron/services/updateService.cjs`
- Modify: `release-config.json`
- Modify/remove: `scripts/verify-release-config.mjs`
- Modify: `update-updater/main.cjs`
- Create: `tests/unit/updates/updateManifest.test.js`
- Create: `tests/integration/updates/updateFailure.test.js`

**Interfaces:**
- Consumes: GitHub release/manifest data and Windows updater executable.
- Produces: normalized manifests, integrity verification, staged update state and rollback/recovery hooks.

- [ ] **Step 1: Write manifest validation tests**

Accept valid relative paths such as `updates/latest.json`; reject absolute paths, traversal (`..`) and control characters. Validate version, URL, hash and size fields.

- [ ] **Step 2: Implement normalized manifest parser**

Replace the current single-segment regex with path normalization plus traversal checks.

- [ ] **Step 3: Implement update service state machine**

Use explicit states: `idle`, `checking`, `downloading`, `verifying`, `staging`, `ready`, `installing`, `failed`, `rolled_back`.

- [ ] **Step 4: Implement integrity verification**

Require SHA-256 match before staging/installing. Reject missing or mismatched hashes.

- [ ] **Step 5: Implement rollback confirmation**

Keep previous version usable until the new process confirms successful startup. On failed confirmation, relaunch the prior version.

- [ ] **Step 6: Commit updater migration**

```bash
git add src/core/updates electron/services/updateService.cjs update-updater/main.cjs release-config.json scripts/verify-release-config.mjs tests/unit/updates tests/integration/updates
git commit -m "feat: implement rollback-safe desktop updater"
```

---

### Task 12: Remove patch-driven build scripts and create deterministic release scripts

**Files:**
- Delete: obsolete `scripts/apply-*.mjs` patch scripts after source migration is complete
- Delete: obsolete `scripts/apply-all-patches-safe.mjs`
- Create: `scripts/validate.mjs`
- Create: `scripts/build.mjs`
- Create: `scripts/release.mjs`
- Modify: `package.json`
- Create: `tests/smoke/buildConfig.test.js`

**Interfaces:**
- Consumes: finalized source tree and package metadata.
- Produces: validation/build/release commands that never mutate source files.

- [ ] **Step 1: Write release-config tests**

Verify required assets, package version, Electron main/preload entries, updater resource, icon resources and output directory.

- [ ] **Step 2: Implement `scripts/validate.mjs`**

Run syntax checks, JSON validation, asset existence, forbidden Electron setting checks and protocol manifest validation. No source mutation is allowed.

- [ ] **Step 3: Implement `scripts/build.mjs`**

Run the production Vite build, build updater resources and prepare packaging inputs without modifying application source.

- [ ] **Step 4: Implement `scripts/release.mjs`**

Run validation, tests, build, electron-builder, artifact checks and SHA-256 generation. Exit non-zero on any missing or malformed artifact.

- [ ] **Step 5: Remove obsolete patch scripts**

Delete only scripts proven unused by code search and CI. Confirm no package script, workflow or source imports them.

- [ ] **Step 6: Commit the deterministic build**

```bash
git add package.json scripts tests/smoke
git commit -m "build: replace patch-driven release pipeline"
```

---

### Task 13: Add automated CI, Windows smoke tests and packaging verification

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/release.yml`
- Create: `tests/smoke/launch.test.mjs`
- Create: `tests/smoke/networkRecovery.test.mjs`
- Create: `tests/smoke/mediaRecovery.test.mjs`
- Create: `tests/packaging/installer.test.mjs`

**Interfaces:**
- Consumes: deterministic validation/build/release scripts.
- Produces: CI gates for source quality, Windows smoke behavior and installer integrity.

- [ ] **Step 1: Add dependency and static validation stage**

Run `npm ci`, toolchain validation, source validation and unit tests on every push/PR.

- [ ] **Step 2: Add Windows integration/smoke stage**

On Windows runners, launch the packaged app, verify initial window readiness, then exercise mocked/network-recovery scenarios without depending on the production server being continuously available.

- [ ] **Step 3: Add packaging verification**

After `npm run dist`, verify exactly one expected `.exe`, non-trivial file size, icon/resource presence, embedded updater and SHA-256.

- [ ] **Step 4: Restrict release publication**

Only tags such as `chronocord-vX.Y.Z` publish a GitHub Release. Branch builds upload artifacts but never masquerade as production releases.

- [ ] **Step 5: Commit CI/release gates**

```bash
git add .github/workflows tests/smoke tests/packaging
git commit -m "ci: add Windows smoke and packaging gates"
```

---

### Task 14: Measure startup, memory, render and connection performance

**Files:**
- Create: `src/core/performance/performanceBudget.js`
- Create: `src/core/performance/performanceReporter.js`
- Create: `tests/smoke/performance.test.mjs`
- Create: `docs/superpowers/migration/2026-08-26-performance-report.md`

**Interfaces:**
- Consumes: application lifecycle, network status and smoke-test hooks.
- Produces: measurable release-candidate metrics and regression checks.

- [ ] **Step 1: Instrument startup milestones**

Record process start, renderer start, first React render, first usable shell and first authenticated view. Fail smoke tests if the established cold-start budget is exceeded in the CI environment by the configured tolerance.

- [ ] **Step 2: Instrument network recovery**

Record connect time, reconnect count and recovery latency. Assert there is no unbounded retry storm.

- [ ] **Step 3: Instrument memory stability**

Run a 30-minute idle/chat/voice smoke test and record process working-set growth. Investigate listener/timer/track leaks when growth exceeds the agreed regression threshold.

- [ ] **Step 4: Instrument render hotspots**

Track broad app rerenders during high-frequency presence/socket events and refactor listeners/stores that trigger unnecessary root renders.

- [ ] **Step 5: Commit performance instrumentation**

```bash
git add src/core/performance tests/smoke/performance.test.mjs docs/superpowers/migration/2026-08-26-performance-report.md
git commit -m "perf: add desktop performance budgets"
```

---

### Task 15: Full Windows release-candidate migration and legacy cleanup

**Files:**
- Modify: `README.md`
- Create: `RELEASE-2.0.0-desktop.md`
- Delete: obsolete legacy documentation only after migration is complete
- Modify: `.gitignore`
- Modify: release metadata as required by final package version

**Interfaces:**
- Consumes: all migrated features and passing CI/package gates.
- Produces: documented production release candidate with no stale desktop build path.

- [ ] **Step 1: Run the full smoke matrix on a clean checkout**

Execute install, launch, login, server navigation, messaging, DM, voice, webcam, screen share, Jukebox, Watch2Chronos, profile editing, theme changes, stickers/GIFs, updater check and restart.

- [ ] **Step 2: Verify recovery cases**

Stop/restart the server, force socket disconnects, deny camera/screen permission, load unavailable media, fail a DM request and interrupt an update. Confirm each failure leaves unrelated features usable.

- [ ] **Step 3: Verify clean install/uninstall**

Install the NSIS package, launch it, close it, uninstall it, and verify expected persistent data behavior and shortcut removal.

- [ ] **Step 4: Remove dead legacy paths**

Delete only legacy source, scripts and documentation proven unused after the migration. Keep migration notes for any retained compatibility adapter.

- [ ] **Step 5: Update release documentation**

Document the Windows-only production target, supported update path, troubleshooting, performance expectations and release procedure.

- [ ] **Step 6: Commit the release candidate**

```bash
git add README.md RELEASE-2.0.0-desktop.md .gitignore
 git commit -m "release: prepare ChronoCord Windows desktop candidate"
```

---

## Final Verification Gate

- [ ] Clean checkout on a Windows runner.
- [ ] `npm ci` succeeds with the committed lockfile.
- [ ] All static/syntax/unit/integration/smoke tests pass.
- [ ] Vite production build completes without source mutation.
- [ ] Electron packaging completes without warnings that invalidate the release.
- [ ] Exactly one expected Windows installer is produced.
- [ ] Installer contains the expected icon/resources/updater.
- [ ] SHA-256 is generated and verified.
- [ ] Install/launch/uninstall smoke tests pass.
- [ ] Voice/webcam/screen share lifecycle smoke tests pass.
- [ ] Jukebox/Watch2Chronos failure recovery passes.
- [ ] DMs cannot crash the application shell.
- [ ] Profile avatar/banner updates are independent and recoverable.
- [ ] Updater manifest accepts `updates/latest.json` and rejects unsafe traversal/absolute paths.
- [ ] Update integrity and rollback tests pass.
- [ ] Startup/memory/reconnect performance budgets are measured and acceptable.
- [ ] Release workflow publishes only the verified installer.
