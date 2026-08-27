# ChronoCord 1.0.3 — Settings, Account, Privacy and Profile Design

**Status:** Approved for implementation
**Date:** 2026-08-27
**Desktop branch:** `integration/1.0.3-final`
**Server branch:** `integration/1.0.3-final`

## Goal

Bring the ChronoCord settings and profile experience to feature parity with the supplied references while keeping ChronoCord branding, preserving existing data across updates, and implementing real server-backed behavior for account/security/privacy controls wherever the product can truthfully support it.

## Product principles

- Use ChronoCord branding everywhere. Do not ship Discord/Wumpus names or copy that implies affiliation.
- Existing ChronoCord visual theme, accent-color tinting and desktop layout remain authoritative; reference screenshots define feature coverage and interaction hierarchy, not brand identity.
- Security-sensitive UI must never pretend a capability exists. A control is enabled only when its server-side enforcement exists.
- WebRTC transport encryption must not be described as verified end-to-end identity encryption. Persistent verification UI is shipped only if a verifiable identity-key mechanism exists; otherwise the section explains current call encryption and leaves persistent verification unavailable.
- Advertising-related privacy controls are displayed as inactive ChronoCord policy preferences because ChronoCord 1.0.3 has no sponsored-content system. They must not imply ads are currently served.
- Login, conversations, servers, DMs and preferences remain durable across app updates and server restarts.
- Release version is 1.0.3.

## Architecture

### Desktop

Introduce a focused settings subsystem instead of adding more branches to the large `ChronoCord.jsx` settings modal. The renderer owns presentation and local-only desktop preferences. Server-backed account/privacy/security data is accessed through a small account API client.

Primary files:

- `src/settings/SettingsCenter.jsx` — navigation, section routing, shared cards/rows/toggles.
- `src/settings/settingsCatalog.js` — complete ChronoCord settings taxonomy and default values.
- `src/settings/accountApi.js` — authenticated account/security/privacy requests.
- `src/settings/keyboardShortcuts.js` — shortcut catalog and renderer actions.
- `src/settings/settingsStorage.js` — versioned local preferences, migration and merge with server preferences.
- `src/ProfileSummaryCard.jsx` — rich compact profile card.
- Existing `src/ProfilePage.jsx` remains the full-profile page.
- `build/chronocord-product-transform.mjs` injects the new settings/profile components into the mature monolithic renderer without an unsafe large-scale rewrite.

### Server

Extend the durable JSON/PostgreSQL snapshot schema with user account state while retaining backwards-compatible loading. New data collections are arrays/objects inside the existing snapshot so PostgreSQL durability continues automatically.

New persisted structures:

- `sessions`: `{ id, userId, createdAt, lastSeenAt, userAgent, label, revokedAt }`
- `blocks`: `{ blockerId, blockedId, createdAt }`
- `accountPreferences`: `{ userId, data }`
- `dataExports`: `{ id, userId, requestedAt, completedAt, payload }`

User fields gain optional `email`, `phone`, `ageGroup`, `birthDate`, `mfa`, `disabledAt`, and `scheduledDeletionAt`. Existing users are migrated lazily by defaults.

JWTs gain `sid`; authentication rejects revoked sessions and disabled/deleted accounts. Socket authentication applies the same session checks.

## Account information

The Account navigation has four sections: Account information, Password and security, Account status, Family Center.

### Account information

- Username: editable with existing uniqueness validation.
- Email: editable; masked by default; reveal requires current-password confirmation. 1.0.3 stores the address but does not claim external email verification unless a provider is configured.
- Phone: editable; masked by default; reveal requires current-password confirmation. 1.0.3 does not claim SMS verification without an SMS provider.
- Age group: user can confirm a birth date; server derives `under_13`, `13_17`, or `18_plus`. Age-restricted settings are enabled only for `18_plus`.

### Password and security

- Password change requires current password and invalidates all other sessions.
- Multifactor authentication uses RFC 6238 TOTP with a server-generated secret, authenticator-app setup URI and single-use recovery codes. Enabling requires a valid TOTP code. Disabling requires password plus TOTP/recovery code.
- Connected devices shows real server sessions with creation/last-seen metadata and allows revoking individual sessions or all other sessions.

### Account status

Shows account state based on actual server flags. Active accounts show “Sua conta está toda em ordem”. Disabled and deletion-pending accounts show truthful recovery/deletion state.

### Family Center

1.0.3 provides the settings shell and privacy explanation but does not fabricate guardian linkage. The setup action is visibly unavailable with “Disponível em uma versão futura” until a real family relationship model exists.

### Destructive actions

- Deactivate account: password confirmation, `disabledAt` set, sessions revoked. Login reactivation requires password and clears `disabledAt`.
- Delete account: password confirmation, schedules deletion with a 14-day grace period and revokes sessions. Login during grace period offers reactivation/cancel deletion. Server permanently removes user-owned private account data after grace-period cleanup while preserving shared-message attribution as a deleted-user tombstone where necessary for conversation integrity.

## Data and privacy

Navigation contains:

- How ChronoCord uses my data
- Profile privacy
- Voice call encryption

Preferences persisted server-side:

- improve product analytics
- personalized experience
- sponsored-content activity preference (inactive because no sponsored system exists)
- third-party sponsored preference (inactive)
- allow voice recording in clips
- share full profile scope: `all_servers`, `friends_small_servers`, `friends_only`
- announce profile updates
- persistent voice verification preference, disabled until a verified identity-key mechanism exists

“Solicitar meus dados” creates a real server export snapshot containing the requesting user’s account/profile/preferences/friendships/DM metadata and authored message records. The desktop downloads/saves the generated JSON through Electron file-save APIs when available, or exposes the JSON payload to the renderer fallback.

## Message permissions

Sections:

- Content filters
- Spam filters
- Direct messages
- Friend requests
- Connected games
- Ignore and block

Server-backed preferences include sensitive-content blur policy, spam filter mode, server-member DM permission, unknown-member DM filtering, friend-request sources and connected-game DM display mode.

Blocking is enforced server-side. A blocked relationship prevents new friend requests and DMs in either direction and is surfaced in the block list. Unblocking is functional.

Age-restricted controls remain disabled unless age group is confirmed 18+.

## Notifications

Sections:

- Overview
- Sounds
- Badges
- Email
- Advanced

Desktop-local preferences:

- desktop notifications
- taskbar flash/badge
- friend online notices
- stream-start notices
- friendship anniversary notices
- server event notices
- reaction notification scope
- per-event sound toggles
- unread badge
- advanced quiet-hours / suppression controls

Email preference toggles are server-backed preference flags only; the UI explicitly states that messages are sent only when a ChronoCord email delivery service is configured. The product must not claim mail delivery where none exists.

Sound-preview buttons use renderer-generated/packaged ChronoCord sounds and do not alter notification state.

## System and Developer

System receives a nested “Default shortcuts” page with the supplied shortcuts adapted to ChronoCord. Keyboard actions are wired where corresponding app actions exist; reference-only shortcuts that depend on a feature unavailable in ChronoCord are shown disabled with explanation rather than silently doing nothing.

Developer receives:

- Developer mode toggle.
- Application test mode toggle.
- ChronoCord application ID input while test mode is enabled.

Developer settings are local desktop settings and do not weaken authentication or server authorization.

“Assistente do ChronoCord” is shown under System as a ChronoCord-specific helper status entry; there is no Discord branding.

## Profile summary card

The compact profile card becomes a rich, scrollable summary with:

- banner/decorative header
- avatar + presence
- custom status bubble
- display name, username/handle, pronouns if provided, badges
- mutual friends/server counts calculated from available relationship/server data
- biography with “Ver Biografia Completa”
- member-since date
- favorite/owned-game collection
- current activity and elapsed time when available
- rank/status fields when present
- optional external-game profile link only when the user explicitly saved one
- wishlist preview + “Ver tudo”
- “Ver Perfil Completo” action

Card tint is derived from avatar/banner dominant color when available and falls back to the current ChronoCord accent. Avatar and banner can be expanded. Full profile continues in `ProfilePage.jsx`.

## Voice encryption copy

ChronoCord 1.0.3 may say that calls use encrypted WebRTC transport. It must not state that persistent identity verification or verified E2EE is active until implemented and covered by tests. The persistent-verification toggle is disabled with explanatory copy in 1.0.3.

## Persistence and migration

Desktop preference storage uses a versioned `cc_settings_v2` document. Migration imports existing individual localStorage keys so no existing user preference is discarded.

Server loading merges missing snapshot collections with empty defaults. Existing users gain optional fields lazily. PostgreSQL snapshot persistence requires no table-per-feature migration because the current durable store persists the complete JSON snapshot.

## API contract

New authenticated endpoints:

- `GET /api/account`
- `PATCH /api/account`
- `POST /api/account/reveal`
- `POST /api/account/password`
- `POST /api/account/mfa/setup`
- `POST /api/account/mfa/enable`
- `POST /api/account/mfa/disable`
- `GET /api/account/sessions`
- `DELETE /api/account/sessions/:sid`
- `POST /api/account/sessions/revoke-others`
- `POST /api/account/deactivate`
- `POST /api/account/delete`
- `POST /api/account/reactivate`
- `GET /api/preferences`
- `PATCH /api/preferences`
- `GET /api/blocks`
- `POST /api/blocks/:userId`
- `DELETE /api/blocks/:userId`
- `POST /api/data-export`
- `GET /api/data-export/:id`

All sensitive mutations are rate-limited and validate current password and/or MFA where applicable.

## Acceptance criteria

1. Every supplied settings category/row is represented in the ChronoCord settings hierarchy, adapted to ChronoCord branding.
2. Account/security actions shown as active are backed by server enforcement and durable persistence.
3. Blocking is enforced for friend requests and DMs.
4. Preferences survive app restart and server restart/update.
5. Existing users can log in without migration errors.
6. Rich profile summary and full-profile navigation work from the profile card/right-click paths.
7. Watch2Chronos has local priority over Jukebox without pausing other users and without auto-resume when Watch2 closes.
8. Screen-share paused/unavailable/ended/error states remain distinct and regressions are covered by tests.
9. `npm run check` passes on desktop; server `npm run check` and `npm run self-test` pass.
10. Windows GitHub Actions build completes successfully, verifies NSIS payload, animated bootstrapper, updater packaging and SHA-256 artifacts.
11. No release is promoted to `main` or tagged until all required checks are green.
