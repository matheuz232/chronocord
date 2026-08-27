# Voice, Appearance, Accessibility and System Delta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement only the settings behavior introduced by the final reference screenshots without duplicating the base settings plans.

**Architecture:** Reuse the Settings Foundation components and storage. Add focused page components for Voice & Video, Appearance and Accessibility and extend System General. All OS/backend-heavy capabilities remain locally represented preferences until final platform integration.

**Tech Stack:** React 18.3.1, Vite 6.3.5, Node 22 `node:test`, localStorage/Web Audio where available.

**Specs:** `docs/superpowers/specs/2026-08-26-reference-settings-design.md` and `docs/superpowers/specs/2026-08-26-settings-visual-delta-final.md`.

## Global Constraints

- Do not duplicate settings already defined in earlier plans.
- Do not fabricate Discord/Nitro/Wumpus branding or functionality.
- Preserve existing real voice, screen share, soundboard, theme, accessibility and Electron flows where already implemented.
- Any local-only preference must not claim OS/backend enforcement.
- `Redefinir Voz e vídeo` resets preferences only; it must not disconnect an active call.

---

### Task 1: Extend defaults and catalog for final reference routes

**Files:**
- Modify: `src/settings/settingsDefaults.js`
- Modify: `src/settings/settingsCatalog.js`
- Modify: `tests/settings-storage.test.mjs`
- Modify: `tests/settings-catalog.test.mjs`

**Interfaces:**
- Extends `createDefaultSettings()` with `voiceVideo`, `appearance`, `accessibility`, and system-general fields from the delta spec.
- Extends catalog with `voice.*`, `appearance.*`, `accessibility.*` stable route IDs.

- [ ] Add failing assertions for all new default subtrees and representative nested values.
- [ ] Add failing assertions for routes `voice.stream`, `voice.soundboard`, `appearance.messages`, `appearance.streamer`, `accessibility.readability`, `accessibility.screenReader`.
- [ ] Run `npm run test:settings` and verify RED.
- [ ] Implement defaults and catalog entries.
- [ ] Run `npm run test:settings` and verify GREEN.
- [ ] Commit `feat: extend settings catalog for visual references`.

---

### Task 2: Voice and video reference page

**Files:**
- Create: `src/settings/pages/VoiceVideoSettings.jsx`
- Modify: `src/settings/SettingsCenter.jsx`
- Modify: `src/settings/settings.css`

**Interfaces:**
- `VoiceVideoSettings({ settings, patch, resetSubtree, T, themeColor, legacy })`.
- `legacy` exposes existing real voice/camera/stream/soundboard values and callbacks without moving their business logic yet.

- [ ] Add a pure helper test for reset behavior if reset logic is not already covered by storage helpers.
- [ ] Implement sections: voice, camera, stream, sounds, soundboard, advanced.
- [ ] Bind existing real device/quality/soundboard callbacks through `legacy`.
- [ ] Implement local stream previews, event sound toggles, entrance sound selectors, diagnostics disclosure and preference-only reset.
- [ ] Build with `npm run build`.
- [ ] Commit `feat: expand voice and video settings`.

---

### Task 3: Appearance reference page

**Files:**
- Create: `src/settings/pages/AppearanceSettings.jsx`
- Modify: `src/settings/SettingsCenter.jsx`
- Modify: `src/settings/settings.css`

**Interfaces:**
- `AppearanceSettings({ settings, patch, T, themeColor, legacy })`.
- `legacy` provides the current theme mode/accent setters so the existing real theme continues to drive the app.

- [ ] Add helper tests for valid appearance enums and streamer preference merge behavior where appropriate.
- [ ] Implement theme preset gallery and current accent integration.
- [ ] Implement local app icon gallery using ChronoCord-owned variants only.
- [ ] Implement media/message, chat-box, DM search and streamer sections.
- [ ] Ensure no local-only setting claims to modify the installed EXE icon or enumerate OS processes.
- [ ] Run settings tests and `npm run build`.
- [ ] Commit `feat: expand appearance settings`.

---

### Task 4: Accessibility reference page

**Files:**
- Create: `src/settings/pages/AccessibilitySettings.jsx`
- Modify: `src/settings/SettingsCenter.jsx`
- Modify: `src/settings/settings.css`

**Interfaces:**
- `AccessibilitySettings({ settings, patch, T, themeColor, previewProfile })`.

- [ ] Add failing default tests for text size, density, saturation, motion and TTS rate.
- [ ] Implement persistent visual preview.
- [ ] Implement readability, visual density, color/contrast, reduced motion, and audio/screen-reader sections.
- [ ] TTS preview uses `speechSynthesis` when available and a no-op informative fallback otherwise.
- [ ] Use CSS state only for preview effects unless an existing global accessibility behavior already exists.
- [ ] Run tests and build.
- [ ] Commit `feat: expand accessibility settings`.

---

### Task 5: Extend System General and Developer layout

**Files:**
- Modify: `src/settings/pages/SystemSettings.jsx`
- Modify: `src/settings/settings.css`

**Interfaces:**
- Reuse existing system/shortcut/developer routes from the base system plan.

- [ ] Add `openOnStartup`, `startMinimized`, `minimizeToTray`, `hardwareAcceleration` rows.
- [ ] Disable `startMinimized` control while `openOnStartup` is false without deleting its stored value.
- [ ] Align Developer layout with the final reference and ensure all copy says ChronoCord/API do ChronoCord.
- [ ] Run settings tests and build.
- [ ] Commit `feat: complete system and developer reference settings`.

---

### Task 6: Profile summary final visual delta

**Files:**
- Create or Modify: `src/profile/ProfileSummaryCard.jsx`
- Modify: `src/ProfilePage.jsx`
- Modify: `src/ChronoCord.jsx`
- Modify: relevant profile CSS.

**Interfaces:**
- Profile card consumes only real available profile/social/activity/game data and callbacks supplied by ChronoCord.

- [ ] Implement full-width banner and overlapping avatar/presence.
- [ ] Implement status card, chips/badges, mutual summary, bio/member-since, games/activity/wishlist sections with conditional rendering.
- [ ] Show external service action only when a real URL exists.
- [ ] Implement `Ver Perfil Completo` and privacy-aware full-profile navigation.
- [ ] Ensure no fake data appears for missing fields.
- [ ] Run tests/build and manual profile smoke check.
- [ ] Commit `feat: complete profile summary reference design`.

---

## Verification gate

Run:

```bash
npm run test:settings
npm run check
npm run build
```

Then run the Windows workflow and require both installer smoke tests to pass before merging/promoting.
