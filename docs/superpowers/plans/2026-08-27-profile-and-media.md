# Profile and Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the rich profile summary/full-profile flow and preserve the approved Watch2Chronos/Jukebox/screen-share behavior.

**Architecture:** Keep `ProfilePage.jsx` as the full profile, add a focused rich `ProfileSummaryCard.jsx`, and integrate it through the existing product transform. Media behavior remains in product-transform contracts until the renderer can safely be decomposed further.

**Tech Stack:** React 18, Vite 6, Electron 38, existing WebRTC/Jukebox renderer code.

**Spec:** `docs/superpowers/specs/2026-08-27-chronocord-settings-profile-design.md`

## Global Constraints

- Profile tint derives from avatar/banner when possible and falls back to ChronoCord accent.
- External game/Steam links appear only when explicitly supplied by the user profile.
- Watch2 opening pauses Jukebox only for the local client; no global pause event.
- Closing Watch2 does not auto-resume Jukebox.
- Screen-share paused, ended, capture-error and WebRTC-error states remain distinct.

---

### Task 1: Rich profile summary card

**Files:**
- Create: `src/ProfileSummaryCard.jsx`
- Modify: `build/chronocord-product-transform.mjs`
- Modify: `tests/settings-profile-summary.test.mjs`
- Modify: `tests/settings-profile-transform.test.mjs`

**Interfaces:**
- `ProfileSummaryCard({ user, profile, mutualFriends, mutualServers, activity, games, wishlist, theme, onOpenFullProfile, onExpandAvatar, onExpandBanner })`.

- [ ] **Step 1: Expand failing profile contracts**

Assert banner/avatar/presence/status/name/handle/pronouns/badges/mutual counts/bio/member-since/games/activity/wishlist/full-profile labels and callback integration.

- [ ] **Step 2: Run RED**

Run: `node --test tests/settings-profile-summary.test.mjs tests/settings-profile-transform.test.mjs`
Expected: FAIL on missing rich card.

- [ ] **Step 3: Implement card**

Use a scrollable card with compact sections and safe empty states. Do not fabricate game rank, Steam URL, pronouns or badges; hide missing optional fields.

- [ ] **Step 4: Run GREEN**

Run: `npm run test:settings && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add rich profile summary card"`

### Task 2: Full-profile consistency

**Files:**
- Modify: `src/ProfilePage.jsx`
- Modify: `tests/settings-profile-page.test.mjs`

- [ ] **Step 1: Add failing tests**

Assert avatar/banner expansion hooks, biography completeness, member-since, activity/game/wishlist sections and safe optional external link rendering.

- [ ] **Step 2: Run RED**

Run: `node --test tests/settings-profile-page.test.mjs`
Expected: FAIL on missing consistency points.

- [ ] **Step 3: Implement minimal consistency changes**

Keep existing Facebook-like layout; reuse optional profile data rather than introducing a second incompatible local storage schema.

- [ ] **Step 4: Run GREEN**

Run: `npm run test:settings && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: align full profile with rich summary"`

### Task 3: Watch2Chronos/Jukebox priority regression closure

**Files:**
- Modify: `build/chronocord-product-transform.mjs`
- Modify: `tests/settings-media-priority.test.mjs`

- [ ] **Step 1: Keep the existing RED contract exact**

The test must verify local audio pause without shared `jukebox-state` pause emission, queue preservation, no auto-resume, manual resume, selectable queue items, artwork background and mini-player.

- [ ] **Step 2: Run RED/GREEN loop**

Run: `node --test tests/settings-media-priority.test.mjs`
Expected: PASS only when the transform output satisfies all behavior contracts.

- [ ] **Step 3: Run integration build**

Run: `npm run test:settings && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

`git commit -m "fix: finalize Watch2 and Jukebox priority"`

### Task 4: Screen-share regression suite

**Files:**
- Modify only if required: `build/chronocord-product-transform.mjs`, renderer/electron screen-share code
- Verify: `tests/settings-screen-share.test.mjs`

- [ ] **Step 1: Run existing screen-share tests**

Run: `node --test tests/settings-screen-share.test.mjs`
Expected: PASS.

- [ ] **Step 2: If RED, fix root cause only**

Preserve exact user copy for paused stream and automatic recovery when frames resume. Do not merge paused/unavailable, ended, capture-error or WebRTC-error states.

- [ ] **Step 3: Re-run suite**

Run: `npm run test:settings && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit only if code changed**

`git commit -m "fix: preserve screen share recovery states"`
