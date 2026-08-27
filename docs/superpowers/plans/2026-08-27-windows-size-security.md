# ChronoCord Windows Size & Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver ChronoCord 1.0.3 as one animated Windows installer <= 285,000,000 bytes with zero `npm audit` vulnerabilities and no auxiliary Electron runtimes.

**Architecture:** Keep Electron only for the ChronoCord desktop app. Compile the updater and animated installer launcher as small .NET Framework executables using the Windows runner's built-in C# compiler. The final animated launcher carries the internal NSIS setup as an appended SHA-256-protected payload, so the user downloads one executable and the updater downloads the same executable.

**Tech Stack:** Electron, React, Vite, electron-builder/NSIS, Node.js build scripts, C#/.NET Framework WinForms, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-27-windows-size-security-design.md`

## Global Constraints

- Work only on `integration/1.0.3-final`.
- Do not modify `main`.
- Keep application version `1.0.3`.
- Exactly one primary downloadable executable: `ChronoCord-Installer-1.0.3.exe`.
- Final installer size must be <= 285,000,000 bytes.
- Root `npm audit --audit-level=low` must exit 0 with zero vulnerabilities.
- Preserve all Settings/product/media/screen-share/voice contracts already green in run `33118191407`.
- Updater and installer must reject non-HTTPS downloads and verify SHA-256 before executing downloaded/appended payloads.

---

### Task 1: Security and single-artifact regression gates

**Files:**
- Modify: `.github/workflows/windows-build.yml`
- Create: `tests/windows-distribution.test.mjs`

**Interfaces:**
- Consumes: root `package.json`, workflow text.
- Produces: assertions for one public installer, audit gate, size gate, and native-helper build expectations.

- [ ] **Step 1: Write failing distribution tests**

Create `tests/windows-distribution.test.mjs` that reads `package.json`, `.github/workflows/windows-build.yml`, `scripts-build.mjs`, and `scripts-installer-bootstrapper.mjs` and asserts:

```js
assert.match(workflow, /npm audit --audit-level=low/);
assert.match(workflow, /ChronoCord-Installer-\*\.exe/);
assert.doesNotMatch(uploadBlock, /ChronoCord-Setup-\*\.exe/);
assert.match(workflow, /285000000/);
assert.match(buildUpdater, /csc\.exe|Framework64/);
assert.doesNotMatch(buildUpdater, /npm[^\n]+--prefix[^\n]+update-updater/);
assert.match(buildInstaller, /csc\.exe|Framework64/);
assert.doesNotMatch(buildInstaller, /electron-builder[^\n]+installer-bootstrapper/);
```

- [ ] **Step 2: Run the test and verify RED**

Run in CI/local Node:

```bash
node --test tests/windows-distribution.test.mjs
```

Expected: FAIL because the current workflow uploads both Setup and Installer and both helper build scripts package Electron.

- [ ] **Step 3: Add workflow security gate skeleton**

After `npm install --include=optional`, add:

```yaml
- name: Dependency security audit
  run: npm audit --audit-level=low
```

Do not bypass failures.

- [ ] **Step 4: Commit the regression test/gate**

Commit message:

```text
test: gate Windows size security and single installer
```

---

### Task 2: Upgrade root dependency/toolchain graph to zero audit findings

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify if required by compatibility: `preflight.mjs`, `build-preflight.mjs`

**Interfaces:**
- Consumes: current root dependency graph.
- Produces: a root install that passes `npm audit --audit-level=low` and still builds the Vite/Electron app.

- [ ] **Step 1: Capture the current audit JSON**

Run on Windows CI after install:

```bash
npm audit --json
```

Record every vulnerable package and its dependency path before changing versions.

- [ ] **Step 2: Upgrade direct build dependencies first**

Use actively supported versions compatible with Node 22.23+ and the project, preferring current stable releases. Candidate baseline to test:

```json
{
  "@esbuild/win32-x64": "0.28.2",
  "@vitejs/plugin-react": "6.1.0",
  "electron": "44.0.0",
  "electron-builder": "26.15.3",
  "esbuild": "0.28.2",
  "vite": "8.2.2"
}
```

If Vite 8/plugin-react 6 introduces a build incompatibility unrelated to security, use the newest secure compatible Vite 7/plugin pair rather than weakening the audit gate.

- [ ] **Step 3: Regenerate lockfile cleanly**

Run:

```bash
npm install --include=optional
npm audit --audit-level=low
```

Expected: audit exits 0. If a transitive advisory remains, upgrade its direct parent first; use a root `overrides` entry only when the parent cannot yet provide the patched transitive version.

- [ ] **Step 4: Verify app/build contracts**

Run:

```bash
node preflight.mjs
node build-preflight.mjs
npm run test:settings
npm run build
```

Expected: all exit 0.

- [ ] **Step 5: Commit dependency cleanup**

Commit message:

```text
build: update secure desktop toolchain
```

---

### Task 3: Replace Electron updater with native helper

**Files:**
- Create: `update-updater/Program.cs`
- Modify: `scripts-build.mjs`
- Modify: `tests/settings-updater.test.mjs`
- Delete after tests migrate: `update-updater/main.cjs`
- Delete after tests migrate: `update-updater/preload.cjs`
- Delete after tests migrate: `update-updater/ui.html`
- Delete after tests migrate: `update-updater/package.json`
- Delete if present: `update-updater/package-lock.json`

**Interfaces:**
- Consumes CLI args: `--current=<semver>`, `--pid=<pid>`, `--app-exe=<absolute path>`, optional `--smoke-test`.
- Produces: `build/updater/ChronoCordUpdater.exe`.
- Network contract: latest release asset `ChronoCord-Installer-<version>.exe` and matching `.sha256`, with manifest fallback.

- [ ] **Step 1: Rewrite updater contract tests for native source**

Tests must assert that `Program.cs` contains:

```text
https-only URL validation
MaxRedirects = 5
SHA256.Create()
WaitForExit timeout for old ChronoCord PID
--silent
--dir=
Process.Start to relaunch appExe
--smoke-test
ChronoCord-Installer- asset matching
```

Tests must assert `scripts-build.mjs` compiles with `.NET Framework64 ... csc.exe` and contains no nested `npm install` or `electron-builder` invocation for `update-updater`.

- [ ] **Step 2: Verify updater tests RED**

Run:

```bash
node --test tests/settings-updater.test.mjs
```

Expected: FAIL because native `Program.cs` does not exist yet.

- [ ] **Step 3: Implement `update-updater/Program.cs`**

Use .NET Framework APIs only. Required core constants and behavior:

```csharp
const int MaxRedirects = 5;
const int ExitWaitMilliseconds = 20000;
const string ManifestUrl = "__MANIFEST_URL__";
const string ReleaseRepo = "__RELEASE_REPO__";
```

Implement manual HTTPS redirect handling with `HttpWebRequest.AllowAutoRedirect = false`; reject every URL whose `Uri.Scheme != Uri.UriSchemeHttps`. Download the final installer to `%TEMP%`, compute SHA-256 using `SHA256.Create()`, compare lowercase hex, wait/terminate the prior app process, execute:

```text
ChronoCord-Installer-x.y.z.exe --silent --dir=<installed app directory>
```

Then relaunch `--app-exe`. In `--smoke-test`, validate configuration and exit without network access.

- [ ] **Step 4: Compile updater from `scripts-build.mjs`**

Resolve compiler:

```js
const csc = path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
```

Generate a patched temporary C# source replacing `__MANIFEST_URL__` and `__RELEASE_REPO__`, then invoke:

```text
/nologo /target:winexe /optimize+ /platform:x64 /out:build/updater/ChronoCordUpdater.exe /reference:System.dll /reference:System.Core.dll /reference:System.Web.Extensions.dll generated.cs
```

- [ ] **Step 5: Run updater tests and native smoke test**

Run:

```bash
node --test tests/settings-updater.test.mjs
node scripts-build.mjs
build\updater\ChronoCordUpdater.exe --smoke-test
```

Expected: all exit 0 and helper is far smaller than the old Electron updater.

- [ ] **Step 6: Remove obsolete Electron updater files and nested dependency tree**

Delete the listed JS/UI/package files only after the native tests pass.

- [ ] **Step 7: Commit native updater**

Commit message:

```text
refactor: replace Electron updater with native helper
```

---

### Task 4: Replace Electron installer bootstrapper with one native animated installer

**Files:**
- Create: `installer-bootstrapper/Program.cs`
- Modify: `scripts-installer-bootstrapper.mjs`
- Create or modify: `tests/settings-installer-native.test.mjs`
- Delete after migration: `installer-bootstrapper/main.cjs`
- Delete after migration: `installer-bootstrapper/preload.cjs`
- Delete after migration: `installer-bootstrapper/ui.html`
- Delete after migration: `installer-bootstrapper/package.json`
- Delete if present: `installer-bootstrapper/package-lock.json`

**Interfaces:**
- Consumes internal payload: `release/ChronoCord-Setup-1.0.3.exe`.
- Produces final public artifact: `release/ChronoCord-Installer-1.0.3.exe`.
- CLI: `--smoke-test`, `--silent`, optional `--dir=<absolute install directory>`.
- Appended payload trailer: 8-byte ASCII magic `CCP10301`, UInt64 little-endian payload length, 32 raw SHA-256 bytes. Trailer size = 48 bytes.

- [ ] **Step 1: Write native installer tests**

Assert `Program.cs` defines:

```text
CCP10301
SHA256.Create()
--smoke-test
--silent
--dir=
FolderBrowserDialog
System.Windows.Forms.Timer
```

Assert `scripts-installer-bootstrapper.mjs` compiles with Framework64 `csc.exe`, appends the Setup bytes plus 48-byte trailer, and does not invoke electron-builder for `installer-bootstrapper`.

- [ ] **Step 2: Verify installer tests RED**

Run:

```bash
node --test tests/settings-installer-native.test.mjs
```

Expected: FAIL before native implementation exists.

- [ ] **Step 3: Implement native animated WinForms launcher**

`Program.cs` must:

1. Open its own executable and parse the 48-byte trailer.
2. Copy exactly the appended Setup payload to a temporary `.exe` while computing SHA-256.
3. Refuse to execute if hash mismatches.
4. In `--smoke-test`, validate payload and return 0 without installing.
5. In `--silent`, run payload with `/S` and optional `/D=<dir>` and return its exit code.
6. In normal mode, show a branded borderless WinForms window with animated progress/pulse, install-folder field + `FolderBrowserDialog`, Install/Cancel buttons, and status text.
7. After successful install, launch `<selectedDir>\ChronoCord.exe` if present and close.

Use only .NET Framework built-in assemblies (`System`, `System.Core`, `System.Drawing`, `System.Windows.Forms`) so the launcher itself stays small.

- [ ] **Step 4: Build launcher then append NSIS payload**

Compile `installer-bootstrapper/Program.cs` to a temporary base executable with `csc.exe`, using `/win32icon:assets/chronocord.ico`. In Node:

```js
const payload = fs.readFileSync(sourceSetup);
const hash = createHash('sha256').update(payload).digest();
const length = Buffer.alloc(8);
length.writeBigUInt64LE(BigInt(payload.length));
const trailer = Buffer.concat([Buffer.from('CCP10301', 'ascii'), length, hash]);
fs.writeFileSync(finalTarget, Buffer.concat([baseExe, payload, trailer]));
```

Then delete the internal `ChronoCord-Setup-1.0.3.exe` and its `.blockmap` from `release/` so they cannot be uploaded accidentally.

- [ ] **Step 5: Verify native installer and actual installation**

Run:

```powershell
release\ChronoCord-Installer-1.0.3.exe --smoke-test
release\ChronoCord-Installer-1.0.3.exe --silent --dir=$env:RUNNER_TEMP\ChronoCord-Smoke
```

Assert `$env:RUNNER_TEMP\ChronoCord-Smoke\ChronoCord.exe` exists and is > 1 MB.

- [ ] **Step 6: Commit native installer**

Commit message:

```text
refactor: ship one native animated installer
```

---

### Task 5: Optimize app package and enforce final distribution

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/windows-build.yml`
- Modify: `tests/settings-packaging.test.mjs`
- Modify: `tests/windows-distribution.test.mjs`

**Interfaces:**
- Consumes: final native installer from Task 4.
- Produces: one uploaded `.exe` plus `.sha256`, size-gated at 285,000,000 bytes.

- [ ] **Step 1: Enable maximum installer compression**

Add electron-builder settings compatible with NSIS:

```json
"compression": "maximum",
"nsis": {
  "oneClick": false,
  "allowToChangeInstallationDirectory": true,
  "createDesktopShortcut": true,
  "createStartMenuShortcut": true,
  "runAfterFinish": false,
  "deleteAppDataOnUninstall": false
}
```

Do not remove runtime resources unless an actual build proves they are unused.

- [ ] **Step 2: Change workflow verification to one artifact**

The final verification must require:

```powershell
$installer = Get-Item "release/ChronoCord-Installer-$version.exe" -ErrorAction Stop
if ($installer.Length -gt 285000000) { throw "Installer exceeds 285 MB hard limit" }
if (Test-Path "release/ChronoCord-Setup-$version.exe") { throw "Internal Setup leaked into final artifacts" }
```

- [ ] **Step 3: Run silent smoke test through final installer**

Replace the direct Setup smoke install with:

```powershell
$proc = Start-Process -FilePath $installer -ArgumentList @('--silent', "--dir=$target") -Wait -PassThru
```

Then validate `ChronoCord.exe`.

- [ ] **Step 4: Upload only final installer and checksum**

Artifact/release paths must contain only:

```yaml
release/ChronoCord-Installer-*.exe
release/ChronoCord-Installer-*.exe.sha256
```

- [ ] **Step 5: Run distribution tests**

Run:

```bash
node --test tests/settings-packaging.test.mjs tests/windows-distribution.test.mjs tests/settings-installer-native.test.mjs
```

Expected: all pass.

- [ ] **Step 6: Commit distribution optimization**

Commit message:

```text
build: enforce single Windows installer under 285 MB
```

---

### Task 6: Full Windows verification and artifact validation

**Files:**
- No production changes unless a verification failure identifies a root cause.

**Interfaces:**
- Consumes: branch HEAD after Tasks 1-5.
- Produces: fresh green Windows workflow, exact final installer size, zero audit findings, SHA-256, uploaded artifact.

- [ ] **Step 1: Run all Settings tests**

```bash
npm run test:settings
```

Expected: zero failures.

- [ ] **Step 2: Run audit and build preflights**

```bash
npm audit --audit-level=low
node preflight.mjs
node build-preflight.mjs
```

Expected: all exit 0.

- [ ] **Step 3: Run the complete Windows workflow**

Required green steps include dependency audit, syntax/preflight, build installers, one-installer verification, native updater smoke test, final installer smoke test, silent install test, SHA-256 generation, and artifact upload.

- [ ] **Step 4: Verify final size and artifact contents**

Hard requirements:

```text
ChronoCord-Installer-1.0.3.exe <= 285,000,000 bytes
exactly one primary .exe in uploaded artifact
matching .sha256 exists
```

- [ ] **Step 5: Compare against baseline**

Report byte and percentage reduction from 569,418,913-byte previous combined delivery and from the old 325,138,209-byte animated installer.

- [ ] **Step 6: Do not merge/tag automatically**

Keep the successful result on `integration/1.0.3-final`. Promotion/tagging remains a separate explicit decision.
