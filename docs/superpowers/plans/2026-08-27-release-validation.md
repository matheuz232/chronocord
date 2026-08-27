# Release Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove ChronoCord 1.0.3 is releasable on Windows without regressing persistence, updater, installer, media or settings contracts.

**Architecture:** Expand the existing Node contract suite and Windows GitHub Actions workflow so every feature block gates packaging. Promote nothing to `main` until both desktop and server integration branches pass.

**Tech Stack:** Node test runner, Vite, Electron Builder/NSIS, GitHub Actions Windows runner.

**Spec:** `docs/superpowers/specs/2026-08-27-chronocord-settings-profile-design.md`

## Global Constraints

- `package.json` and transformed renderer must report 1.0.3.
- Windows workflow must run `npm run check` before packaging.
- Final artifacts include setup EXE, animated installer EXE, updater payload and SHA-256 manifest/checks.
- No main-branch promotion or release tag on red CI.

---

### Task 1: Complete desktop verification command

**Files:**
- Modify: `package.json` only if needed
- Modify: `.github/workflows/windows-build.yml`
- Verify: `tests/settings-*.test.mjs`

- [ ] **Step 1: Add failing workflow contract if `npm run check` is missing**

Update `tests/settings-packaging.test.mjs` to require the workflow to execute `npm run check` before `npm run dist`.

- [ ] **Step 2: Run RED**

Run: `node --test tests/settings-packaging.test.mjs`
Expected: FAIL only if workflow is missing the full gate.

- [ ] **Step 3: Wire full gate**

The workflow order is dependency install → syntax/preflight → `npm run check` → `npm run dist` → artifact existence/smoke checks → SHA-256 → upload.

- [ ] **Step 4: Run GREEN**

Run: `npm run check && npm run build`
Expected: PASS.

### Task 2: Server integration verification

**Files:**
- Verify branch: `matheuz232/chronocord-server:integration/1.0.3-final`

- [ ] **Step 1: Run server CI/self-test**

Run: `npm run check && npm run self-test`
Expected: PASS with persistence/session/account tests.

- [ ] **Step 2: Review diff against main**

Ensure no persistence wrapper or PostgreSQL snapshot behavior regressed.

### Task 3: Windows package proof

**Files:**
- `.github/workflows/windows-build.yml`

- [ ] **Step 1: Push final integration commit**

Trigger Windows Build on `integration/1.0.3-final`.

- [ ] **Step 2: Inspect every workflow step**

Required green steps: install dependencies, preflight, settings suite, Vite build, updater build, electron-builder/NSIS, animated bootstrapper, smoke tests, SHA-256, artifact upload.

- [ ] **Step 3: Verify artifacts**

Confirm expected 1.0.3 filenames and non-zero sizes. Download the workflow artifact ZIP and confirm the setup/bootstrapper/hash files are present.

### Task 4: Finish branch

- [ ] **Step 1: Run fresh final verification**

Desktop: `npm run check && npm run build`.
Server: `npm run check && npm run self-test`.
Windows: latest integration run green.

- [ ] **Step 2: Record exact commit SHAs and workflow run id**

Do not report completion without these fresh values.

- [ ] **Step 3: Promote only after verification**

Merge/promote server integration to `main`, then desktop integration to `main`, preserving tested SHAs. Tag/release only if the user’s release process calls for it and the main-branch build remains green.
