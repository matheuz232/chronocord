# ChronoCord Windows Desktop Rebuild Design

## Status
Approved architectural direction; implementation begins only after this spec is reviewed.

## Goal
Rebuild the ChronoCord desktop client as a production-grade Windows-first application with a deterministic build, isolated subsystems, strong recovery behavior, low startup/resource cost, and a maintainable foundation for future features.

## Current Baseline
The current client is a React/Vite/Electron application with a large `src/ChronoCord.jsx`, Electron IPC in `electron/main.cjs`/`preload.cjs`, a legacy server compatibility wrapper, and numerous patch/build scripts. The repository also contains release-era documentation from 0.2.x through 1.0.x. The present build has reached Node/Electron preflight successfully but has repeatedly failed in auxiliary patch/release scripts, confirming that the build/maintenance layer is too fragile for production.

The current Electron shell already has useful security properties: context isolation, sandboxing, disabled Node integration, an allow-listed server origin, and restricted external navigation. The rebuild preserves these properties while reducing IPC surface and centralizing native capabilities.

## Scope

### In scope
- Windows desktop client.
- Electron main/preload/renderer boundaries.
- React UI and design system.
- HTTP and Socket.IO networking.
- Authentication/session persistence.
- Servers, channels, messaging, DMs, notifications and presence.
- Voice, webcam, screen sharing and WebRTC lifecycle.
- Jukebox and Watch2Chronos media subsystems.
- User profiles, avatar/banner, themes, animations, stickers and GIF workflows.
- Native Windows updater and rollback-safe update flow.
- Deterministic Windows installer build and release automation.
- Automated unit, integration, smoke and packaging tests.
- Performance instrumentation and regression budgets.

### Out of scope for this rebuild
- Android production client.
- Mobile-specific UI or Capacitor packaging.
- Unrelated server feature expansion unless required by the desktop protocol contract.

## Architectural Principles

1. **Source of truth is source code, not patch scripts.** Build-time scripts may validate or generate derived artifacts, but may not rewrite application source files.
2. **Subsystem isolation.** Voice/media, chat/DM, profile, updates and networking must not share crash-prone mutable state.
3. **Typed/explicit contracts.** IPC and network payloads use centralized schemas and validation instead of ad-hoc object shapes.
4. **Fail locally.** A failed optional subsystem becomes degraded functionality, not a process-wide crash.
5. **Deterministic builds.** Pin dependency resolution with `package-lock.json`, use reproducible installation, and verify outputs before release.
6. **Secure by default.** Keep `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, restricted navigation, allow-listed network destinations and minimal IPC exposure.
7. **Measure before optimizing.** Startup, render, network reconnect, memory and media performance get explicit budgets and smoke measurements.
8. **Backward compatibility at boundaries.** Preserve existing server protocols where practical; isolate legacy compatibility inside adapters instead of spreading legacy assumptions through the UI.

## Target Repository Structure

```text
src/
  app/
    App.jsx
    routes.js
    providers/
  core/
    config/
    errors/
    storage/
    lifecycle/
  api/
    http/
    socket/
    protocol/
  features/
    auth/
    servers/
    channels/
    messages/
    dms/
    presence/
    voice/
    media/
    profile/
    settings/
    notifications/
  ui/
    components/
    motion/
    theme/
    layout/
  platform/
    electron/

electron/
  main.cjs
  preload.cjs
  windows/
  services/

server/
  protocol.json
  compatibility/

scripts/
  validate.mjs
  build.mjs
  release.mjs

tests/
  unit/
  integration/
  smoke/
  packaging/

.github/workflows/
  ci.yml
  release.yml
```

The exact split may be adjusted after source mapping, but responsibilities must remain this explicit.

## Renderer Architecture

Replace the current monolithic `ChronoCord.jsx` as the primary application container. The root app owns providers and routing only. Each feature owns its state transitions and view components. Cross-feature state goes through a small set of providers/stores rather than direct mutation.

The UI system will standardize buttons, menus, dialogs, profile cards, message rows, media surfaces, loading states and error states. Motion will use a shared transition system with reduced-motion support and bounded layout work.

## Networking

Create one HTTP client and one Socket.IO session manager. They own:
- endpoint allow-listing;
- request timeout policy;
- retry policy for safe/idempotent requests;
- reconnect backoff with jitter;
- connection health state;
- auth token propagation;
- event subscription lifecycle;
- cleanup on logout and shutdown.

Feature modules consume typed service methods/events instead of importing Socket.IO directly.

## Voice and Media

WebRTC state will be isolated from chat state. Peer connections, media tracks, device permissions and cleanup will have explicit lifecycle managers. Screen sharing and webcam will be independently startable/stoppable. Jukebox and Watch2Chronos will use media controllers that can degrade independently when content cannot load.

## Electron Boundary

The preload layer exposes a narrow API grouped by capability. IPC messages are schema-validated and versioned internally. The main process owns native windows, secure storage, updater launch, desktop capture and network bridging where required.

The renderer never receives unrestricted Electron primitives.

## Storage

Preferences and non-sensitive state use versioned JSON/local storage with atomic writes. Credentials continue to use Windows-backed Electron `safeStorage`; raw credentials must never be written unencrypted.

## Updater

Updater metadata is validated as a normalized manifest. Paths such as `updates/latest.json` are valid relative repository paths and must not be rejected by a single-segment filename regex. Update packages require integrity verification before installation. Installation is staged and recoverable; the previous working version remains available until the new version is confirmed healthy.

## Build and Release

Replace the current patch-driven build chain with:

```text
npm ci
  -> static/syntax validation
  -> unit tests
  -> integration/smoke tests
  -> Vite production build
  -> updater/package generation
  -> electron-builder
  -> installer existence/size/hash verification
  -> artifact upload
  -> tagged release publication
```

`prebuild` must not mutate source code. Release configuration validation must validate semantics rather than over-restricting valid relative paths. The workflow must fail closed when required artifacts are missing and must never publish a partial installer.

## Dependency Policy

- Introduce `package-lock.json` and use `npm ci` in CI.
- Remove dependencies that are unused after migration.
- Avoid automatic `npm audit fix --force`.
- Review high/critical vulnerabilities before production release.
- Keep Electron and its native build toolchain on compatible pinned versions until an explicit upgrade is tested.

## Reliability Requirements

- App launch must survive server unavailability.
- Login/session restoration failure must not crash the renderer.
- Socket connection failure must expose a recoverable state and retry.
- DM loading failure must not crash the app shell.
- Media load failure must leave chat/navigation usable.
- Camera/screen permission denial must return recoverable UI state.
- Update failure must leave the previous installed version usable.

## Performance Budgets

Initial targets for release candidates:
- renderer first usable UI: <= 2.5 s on a typical modern Windows desktop after cold start;
- no unbounded retry loop in renderer or main process;
- no feature should register permanent Socket.IO listeners without cleanup;
- avoid eager loading of heavy media components on login;
- minimize unnecessary global React renders;
- keep idle CPU usage low enough that the client is not visibly active when idle;
- track memory growth during 30-minute idle/chat/voice smoke tests.

These are regression budgets, not claims about all hardware.

## Testing Strategy

### Unit
Network retry policy, storage, manifest validation, permission state, media lifecycle, reducers/state transitions, theme/motion utilities.

### Integration
Authentication/session restore, Socket.IO connect/reconnect, server/channel/message flows, DM opening, voice join/leave, media controller lifecycle, updater manifest validation.

### Smoke
Install, launch, login, open server, send message, open DM, join voice, start/stop webcam, start/stop screen share, load Jukebox/Watch2Chronos, change theme, close and reopen.

### Packaging
Generate Windows installer, verify expected file names, icon/resources, embedded updater, SHA-256 and clean installation/uninstallation.

## Migration Strategy

1. Freeze the current stability branch as a reference point.
2. Create a dedicated rebuild branch from the known stable desktop baseline.
3. Map existing feature behavior into feature modules.
4. Build the new shell/network/core foundations first.
5. Migrate feature-by-feature with tests after each migration.
6. Remove obsolete patch scripts only after no feature depends on them.
7. Enable the deterministic CI/release pipeline.
8. Run Windows smoke and packaging tests.
9. Merge only after the release candidate passes all gates.

## Definition of Done

The rebuild is considered production-ready only when:
- source no longer depends on build-time source rewriting;
- `npm ci` succeeds on CI from a clean checkout;
- all required checks/tests pass;
- installer is generated and verified;
- smoke scenarios complete without renderer/main-process crashes;
- updater validation and rollback behavior pass tests;
- performance budgets are measured and acceptable;
- the release workflow publishes only a verified installer.