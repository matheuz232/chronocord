# ChronoCord Windows Size & Security Design

## Goal

Reduce the Windows delivery footprint for ChronoCord 1.0.3 to one canonical downloadable installer of at most 285 MB, while preserving the requested animated/branded installer experience, updater behavior, smoke-test coverage, and current application functionality. The optimized build must also make `npm audit` report zero known vulnerabilities for the dependency tree installed by CI.

## Current baseline

The validated Windows build at commit `5e38475dc498755f1d40ae64ea5e49dd4332f8f4` produced:

- `ChronoCord-Setup-1.0.3.exe`: 244,280,704 bytes.
- `ChronoCord-Installer-1.0.3.exe`: 325,138,209 bytes.
- Combined primary executable footprint: 569,418,913 bytes.
- CI dependency install reported 15 vulnerabilities: 14 high and 1 critical.

The current architecture duplicates Electron runtimes:

1. Main ChronoCord desktop app is Electron.
2. The updater is a separately packaged Electron portable executable embedded into the app.
3. The animated installer is another separately packaged Electron portable executable and embeds the full NSIS setup payload.

This runtime duplication is the primary size driver.

## Approved architecture

### 1. Keep Electron only where the product requires it

The ChronoCord desktop application remains Electron. Auxiliary distribution helpers must not carry a second or third Chromium/Electron runtime unless a measurable requirement proves it unavoidable.

### 2. Lightweight updater helper

Replace the Electron-based updater with a small Windows-native helper that preserves the existing updater contract:

- accept the installed ChronoCord executable/application path;
- fetch only HTTPS URLs;
- follow a bounded number of redirects;
- verify SHA-256 before installation;
- wait for the running ChronoCord process to exit;
- invoke the verified installer silently;
- relaunch the installed ChronoCord executable;
- abort safely on timeout, checksum mismatch, unsupported URL, failed download, or failed installer exit code;
- remain invisible unless a newer update is actually being applied.

Prefer a small compiled .NET Framework helper because the Windows runner already provides the compiler/framework and Windows 10/11 provide the framework runtime without bundling another Chromium runtime.

### 3. One lightweight animated installer

The public Windows delivery contains exactly one primary executable:

- `ChronoCord-Installer-1.0.3.exe`.

The existing `ChronoCord-Setup-1.0.3.exe` may still be generated temporarily by electron-builder/NSIS as an internal payload because it already owns installation-directory handling, shortcuts, uninstall registration, silent installation, and app-data behavior. It must not be uploaded or published as a second user-facing installer.

Replace the Electron bootstrapper with a small Windows-native animated launcher. The launcher may append the NSIS setup payload to its own executable and extract/verify it at runtime. It must preserve:

- ChronoCord branding;
- animated progress UI;
- install-directory selection;
- desktop and Start menu shortcuts through the internal NSIS payload;
- silent/smoke-test support for CI and updater use;
- reliable uninstall behavior;
- non-destructive application-data handling;
- launch-after-install behavior;
- payload SHA-256 validation before execution.

The final `ChronoCord-Installer-1.0.3.exe` should be close to the compressed NSIS payload size rather than adding another Electron runtime.

### 4. Packaging optimization

Use maximum practical installer compression and exclude non-runtime files from the packaged application. Review Electron locales/resources and `extraResources` for unnecessary duplication. Any exclusion must be covered by build/smoke tests so required runtime files are not removed accidentally.

### 5. Dependency security

The CI dependency graph must be upgraded until `npm audit --audit-level=low` exits successfully with zero vulnerabilities for the root install used to build the application.

Rules:

- prefer direct dependency upgrades over `overrides` when compatible versions exist;
- use `overrides` only for transitive packages where the parent dependency cannot yet be upgraded without unnecessary product risk;
- do not use `--force` blindly;
- keep Electron and electron-builder on actively supported/stable versions compatible with the project;
- add an explicit CI audit gate after dependency installation;
- native helper projects must not require separate npm dependency trees.

### 6. CI and verification

The Windows workflow must fail unless all of the following pass:

- all existing Settings contract tests;
- `npm audit --audit-level=low` with zero vulnerabilities;
- syntax preflight;
- project preflight;
- build preflight;
- production Vite build;
- Windows packaging;
- internal NSIS payload existence and minimum-size sanity check;
- final animated installer existence and minimum-size sanity check;
- final artifact count check proving exactly one primary downloadable `.exe`;
- silent installation smoke test through the final installer;
- animated/native installer smoke test;
- updater/helper smoke test;
- SHA-256 generation for the final installer;
- final installer size check <= 285,000,000 bytes;
- artifact upload containing only the final installer and its `.sha256` file.

The workflow must print the exact byte size of the final downloadable installer.

## Compatibility constraints

- Work only on `integration/1.0.3-final` unless explicitly authorized otherwise.
- Do not modify `main`.
- Keep the application version at `1.0.3` during this optimization pass.
- Preserve existing functional contracts already green in run `33118191407`.
- Preserve local-only account/security behavior already approved for 1.0.3.
- Preserve screen-share, voice-stage, profile, Jukebox, Watch2Chronos, Settings Center, and updater behavior covered by tests.

## Size success criteria

Hard target:

- exactly one primary downloadable Windows executable;
- `ChronoCord-Installer-1.0.3.exe` <= 285,000,000 bytes.

Preferred target:

- `ChronoCord-Installer-1.0.3.exe` below 250 MB;
- native updater/helper sufficiently small that embedding it does not materially change the application payload size.

The size gate must be implemented in CI and measured from the exact file uploaded as the release/download artifact.

## Security success criteria

- root `npm audit --audit-level=low` returns exit code 0;
- CI reports 0 vulnerabilities after install;
- no security gate is bypassed with `continue-on-error`;
- checksum verification remains mandatory for downloaded updates and for the final installer's embedded NSIS payload;
- helper projects do not introduce separate npm installs.

## Rollback criteria

Reject an optimization if any of the following occurs:

- silent installation no longer succeeds;
- installed `ChronoCord.exe` is missing or invalid;
- final animated installer no longer validates its embedded payload before execution;
- updater no longer verifies checksum before installing;
- updater cannot relaunch the application reliably;
- a previously green Settings/product/media/screen-share/voice test fails;
- the optimized build reaches the size target only by removing a user-facing feature.

## Implementation order

1. Add security, single-artifact, and size regression tests/gates that fail on the current baseline.
2. Upgrade the dependency/toolchain graph until audit is clean.
3. Replace the Electron updater helper with a lightweight Windows-native helper and update its tests.
4. Replace the Electron installer bootstrapper with a lightweight Windows-native animated launcher that carries the NSIS setup as a verified embedded/appended payload.
5. Remove the internal Setup from the uploaded/release artifact set and apply package-resource compression/exclusion optimizations.
6. Run the complete Windows workflow and compare the exact final installer byte size against the baseline.
7. Upload the optimized single-installer artifact only after all tests, audit, smoke tests, SHA-256, and size gates pass.
