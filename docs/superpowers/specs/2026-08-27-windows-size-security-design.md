# ChronoCord Windows Size & Security Design

## Goal

Reduce the total Windows delivery footprint for ChronoCord 1.0.3 to at most 285 MB across the primary downloadable artifacts, while preserving installer behavior, updater behavior, smoke-test coverage, and current application functionality. The optimized build must also make `npm audit` report zero known vulnerabilities for the dependency tree installed by CI.

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
- invoke the verified NSIS installer silently;
- relaunch the installed ChronoCord executable;
- abort safely on timeout, checksum mismatch, unsupported URL, failed download, or failed installer exit code;
- remain invisible unless an update is actually being applied.

The helper may be implemented using PowerShell compiled/wrapped into an executable only if the wrapper adds negligible size and the resulting binary can be smoke-tested in CI. Prefer a small compiled helper using tooling already available on the Windows runner if that gives a more deterministic artifact.

### 3. Lightweight installer experience

Remove Electron from the `ChronoCord-Installer-1.0.3.exe` bootstrapper. Preserve the intent of the current branded installer experience using NSIS/native Windows UI rather than another Chromium runtime.

The optimized delivery may use a single primary NSIS installer as the canonical download if it preserves:

- ChronoCord branding;
- install-directory selection;
- desktop and Start menu shortcuts;
- silent install support for CI and updater use;
- reliable uninstall behavior;
- non-destructive application-data handling;
- a clear install progress experience.

If a second installer executable remains, it must not duplicate the full Electron runtime and must keep the combined primary executable size under the target.

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
- if nested helper projects remain, their installs must also pass audit or be removed from the architecture.

### 6. CI and verification

The Windows workflow must fail unless all of the following pass:

- all existing Settings contract tests;
- `npm audit --audit-level=low` with zero vulnerabilities;
- syntax preflight;
- project preflight;
- build preflight;
- production Vite build;
- Windows packaging;
- installer existence and minimum-size sanity checks;
- silent NSIS installation smoke test;
- updater/helper smoke test;
- SHA-256 generation;
- primary artifact combined-size check <= 285 MB;
- artifact upload.

The workflow should print the exact byte sizes of the final primary executable(s) and their aggregate size.

## Compatibility constraints

- Work only on `integration/1.0.3-final` unless explicitly authorized otherwise.
- Do not modify `main`.
- Keep the application version at `1.0.3` during this optimization pass.
- Preserve existing functional contracts already green in run `33118191407`.
- Preserve local-only account/security behavior already approved for 1.0.3.
- Preserve screen-share, voice-stage, profile, Jukebox, Watch2Chronos, Settings Center, and updater behavior covered by tests.

## Size success criteria

Hard target:

- aggregate size of the primary downloadable Windows executable artifacts <= 285,000,000 bytes.

Preferred target:

- one canonical installer below 250 MB, with any updater/helper small enough that the total remains comfortably below 285 MB.

The size gate must be implemented in CI and measured from the exact files uploaded as release/download artifacts.

## Security success criteria

- root `npm audit --audit-level=low` returns exit code 0;
- CI reports 0 vulnerabilities after install;
- no security gate is bypassed with `continue-on-error`;
- checksum verification remains mandatory for downloaded updates.

## Rollback criteria

Reject an optimization if any of the following occurs:

- silent installation no longer succeeds;
- installed `ChronoCord.exe` is missing or invalid;
- updater no longer verifies checksum before installing;
- updater cannot relaunch the application reliably;
- a previously green Settings/product/media/screen-share/voice test fails;
- the optimized build reaches the size target only by removing a user-facing feature.

## Implementation order

1. Add security and size regression tests/gates that fail on the current baseline.
2. Upgrade the dependency/toolchain graph until audit is clean.
3. Replace the Electron updater helper with a lightweight Windows helper and update its tests.
4. Remove the Electron bootstrapper and converge on a lightweight/native installer flow.
5. Apply package-resource compression/exclusion optimizations.
6. Run the complete Windows workflow and compare exact byte sizes against the baseline.
7. Upload the optimized artifact only after all tests, audit, smoke tests, SHA-256, and size gates pass.
