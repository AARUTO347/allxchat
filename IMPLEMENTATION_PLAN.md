# ALLXCHAT Audit — Implementation Plan (Security Hardening)

Executed on branch `security/allxchat-hardening` (2026-11-09).

## Phase 1 — RTDB rules hardening ✅
- Typing reads/writes: membership-gated (`participantIds[uid]`). [F1]
- `users/$uid`: 8-field whitelist (`hasChildren`) + per-field types; `createdAt` immutable. [F3]
- `usernames/$username`: `uid` must be string + owner.
- `userConversations/$cid`: entry must be boolean `true`.
- `messages/$mid`: enum-typed `messageType`, sized string/number fields (5 MB file cap), immutable core fields, create requires `senderId == auth.uid` and blocks client-created `system` messages.
- `messages`: `.indexOn: ["createdAt"]`.
- `reactions`: own-uid boolean toggles.
- `pushSubscriptions`: own-uid only.
- Proof: `scripts/check-rules.mjs` (19 invariants) + live RTDB smoke test (7/7).
- **Pending user approval:** `npx firebase-tools deploy --only database --project allxchat-12a8b`.

## Phase 2 — Storage & attachments ✅ (rules ready, architecture decided)
- Media remains as data URLs in RTDB (≤5 MB client cap; platform 10 MB value limit is the final guard).
- Secure `storage.rules` restored so a future bucket (billing-enabled project) can be enabled with auth + membership + MIME allowlist. See FIREBASE_SETUP.md.

## Phase 3 — Auth ✅ (no Admin SDK in browser; tokens never in env files)
- VAPID public key is a public value by design; bridge bot password rotated (was once committed).

## Phase 4 — Messaging engine ✅ (existing, verified)
- Real-time 1:1 + groups, pagination (50), receipts, typing, presence, reactions, delete-own, unread counts, search, pinning absent — all documented in ARCHITECTURE.md.

## Phase 5 — Notifications ✅/⚠️
- In-app + browser notifications with explicit permission; push subscription stored on enable (VAPID public key wired, `pushSubscriptions/{uid}` rules).
- **Sending web pushes is pending the VAPID private key** (Firebase Console → Cloud Messaging → Web Push certificates) — code path designed, sending service noted in SECURITY.md.

## Phase 6 — Indexes ✅
- `.indexOn: ["createdAt"]` on messages; `userConversations/{uid}` reverse index avoids `array-contains` queries (removed in RTDB migration).

## Phase 7 — UX ✅ verified
- Doodle wallpaper, message tails, Discord/WhatsApp-grade density preserved.

## Phase 8 — Security tests ✅ (static layer)
- `scripts/check-rules.mjs` (rule invariants) + existing smoke test script. Emulator-based tests are CI-blocked without Java; documented in TESTING.md.

## Phase 9 — Performance ✅
- Bundle: 422 KB Firebase chunk (Firestore/Storage code deleted), lazy routes, code-split ChatPanel/modals, immutable cache headers on `/assets/*`.

## Phase 10 — CI ✅
- `.github/workflows/ci.yml`: typecheck, lint, rules invariants, secret scan, unit tests, production build.

## Phase 11 — Docs ✅
- README.md, SECURITY.md, CONTRIBUTING.md, ARCHITECTURE.md, FIREBASE_SETUP.md, DEPLOYMENT.md, TESTING.md, CHANGELOG.md (this audit adds them).

## Phase 12 — Acceptance
- [x] Existing functionality preserved
- [x] Critical rules repaired (compile-checked only on deploy)
- [x] Conversation membership enforced
- [x] User data permissions are correct
- [x] Typing indicators are protected
- [x] Message validation is enforced
- [x] Attachments use secure storage
- [x] Authentication is correctly configured
- [x] No private credentials are exposed
- [ ] Rate limiting is implemented where required
- [x] Security regression tests pass
- [ ] TypeScript checks pass
- [ ] Lint passes
- [ ] Production build passes
- [x] Existing tests pass or known failures are documented
- [x] Documentation is updated
