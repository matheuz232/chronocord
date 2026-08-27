# Server Account Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add durable account/security/privacy/block/export behavior required by ChronoCord 1.0.3.

**Architecture:** Extend the existing JSON snapshot model in `chronocord-server/server.legacy.js`. Keep persistence compatibility by adding default collections and optional user fields; issue JWTs with a session id and enforce session revocation in HTTP and Socket.IO authentication.

**Tech Stack:** Node.js 20+, Express 4, bcryptjs, jsonwebtoken, nanoid, node:crypto, PostgreSQL snapshot persistence.

**Spec:** `docs/superpowers/specs/2026-08-27-chronocord-settings-profile-design.md`

## Global Constraints

- Release version is 1.0.3.
- Do not claim external email/SMS verification without a configured provider.
- MFA is RFC 6238 TOTP plus single-use recovery codes.
- Blocking must be enforced on server-side friend-request and DM mutations.
- Existing JSON/PostgreSQL snapshots and existing users must remain readable.

---

### Task 1: Schema, sessions and auth

**Files:**
- Modify: `chronocord-server/server.legacy.js`
- Modify: `chronocord-server/scripts/self-test.mjs`

**Interfaces:**
- Produces `createSession(user, req)`, `tokenFor(user, session)`, `activeSession(sid, userId)`, and snapshot collections `sessions`, `blocks`, `accountPreferences`, `dataExports`.

- [ ] **Step 1: Write failing self-test cases**

Add checks that login returns a token containing a durable session, `GET /api/account/sessions` returns the current session, and a revoked session receives HTTP 401.

- [ ] **Step 2: Run RED**

Run: `npm run self-test`
Expected: FAIL because session endpoints and `sid` validation do not exist.

- [ ] **Step 3: Implement minimal session model**

Use objects shaped as:

```js
{ id:nanoid(16), userId:user.id, createdAt:now(), lastSeenAt:now(), userAgent:cleanString(req.headers['user-agent'],180), label:'ChronoCord', revokedAt:null }
```

Sign JWT payload `{ id:user.id, username:user.username, sid:session.id }`. HTTP and socket auth must reject missing/revoked sessions; legacy tokens without `sid` may be accepted only long enough to create a replacement session through normal login, not for new sensitive endpoints.

- [ ] **Step 4: Run GREEN**

Run: `npm run check && npm run self-test`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add durable account sessions"`

### Task 2: Account information, password and MFA

**Files:**
- Modify: `chronocord-server/server.legacy.js`
- Modify: `chronocord-server/scripts/self-test.mjs`

**Interfaces:**
- Produces endpoints `/api/account`, `/api/account/reveal`, `/api/account/password`, `/api/account/mfa/setup`, `/api/account/mfa/enable`, `/api/account/mfa/disable`.

- [ ] **Step 1: Add failing API tests**

Cover masked email/phone, password-confirmed reveal, password change invalidating other sessions, TOTP setup URI, invalid-code rejection, valid-code enable, and recovery-code one-time use.

- [ ] **Step 2: Run RED**

Run: `npm run self-test`
Expected: FAIL on missing account/MFA endpoints.

- [ ] **Step 3: Implement account helpers**

Implement RFC 6238 with `node:crypto` HMAC-SHA1, 30-second period, 6 digits, ±1 time-step tolerance. Store only encrypted-at-rest semantics are unavailable in the current snapshot store, so store the TOTP secret in server persistence and never return it after enablement. Hash recovery codes with bcrypt.

Account response shape:

```js
{ username, emailMasked, phoneMasked, ageGroup, emailVerified:false, phoneVerified:false, mfaEnabled, status, createdAt }
```

- [ ] **Step 4: Run GREEN**

Run: `npm run check && npm run self-test`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add account security and totp mfa"`

### Task 3: Preferences, age group and data export

**Files:**
- Modify: `chronocord-server/server.legacy.js`
- Modify: `chronocord-server/scripts/self-test.mjs`

**Interfaces:**
- Produces `GET/PATCH /api/preferences`, `POST /api/data-export`, `GET /api/data-export/:id`.

- [ ] **Step 1: Add failing tests**

Verify per-user preference persistence, server-derived age group from birth date, and export ownership/isolation.

- [ ] **Step 2: Run RED**

Run: `npm run self-test`
Expected: FAIL.

- [ ] **Step 3: Implement preferences/export**

Use one `accountPreferences` record per user. Whitelist all preference keys from the spec. Data export payload must include the requesting user’s account/profile/preferences/friendships/DM metadata and authored messages only.

- [ ] **Step 4: Run GREEN**

Run: `npm run check && npm run self-test`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add privacy preferences and data export"`

### Task 4: Blocks and account lifecycle

**Files:**
- Modify: `chronocord-server/server.legacy.js`
- Modify: `chronocord-server/scripts/self-test.mjs`

**Interfaces:**
- Produces `GET/POST/DELETE /api/blocks`, `/api/account/deactivate`, `/api/account/delete`, `/api/account/reactivate`.

- [ ] **Step 1: Add failing tests**

Verify block prevents friend requests and DM creation/sending in both directions, unblock restores eligibility, deactivation revokes sessions, deletion schedules 14-day grace state, and reactivation clears the state.

- [ ] **Step 2: Run RED**

Run: `npm run self-test`
Expected: FAIL.

- [ ] **Step 3: Implement lifecycle and block enforcement**

Add helper:

```js
function usersBlocked(a,b){ return db.blocks.some(x => (x.blockerId===a&&x.blockedId===b)||(x.blockerId===b&&x.blockedId===a)); }
```

Call it from friend-request and DM mutation paths before creating/sending content.

- [ ] **Step 4: Run GREEN**

Run: `npm run check && npm run self-test`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: enforce blocking and account lifecycle"`
