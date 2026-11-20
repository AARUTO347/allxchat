# ALLXCHAT Audit — Security Findings (real vulnerabilities)

## Critical

### F1 — Typing indicators leak
`typing/{conversationId}/{uid}` was `.read: auth != null`. Any signed-in user could read typing state of conversations they never joined. **Fixed**: reads and writes now require conversation membership.

### F2 — RTDB rules would silently fail closed on legitimate writes
During this audit the rewritten RTDB rules were deployed **without** `numChildren()`/regex constructs (which the RTDB compiler rejects). All final rules use only operators verified in production deploys. `scripts/check-rules.mjs` guards the invariants in CI.

## High

### F3 — User profile documents unvalidated
`users/{uid}` allowed any field set, so junk/extra fields could be written (including security-sensitive sounding names like `role`/`isAdmin`). **Fixed**: `.validate` whitelist — exactly the 8 known profile fields, typed, cross-checked against the app's UserDoc shape.

### F4 — The pushed GitHub repo held a background bot test credential
`whatsapp-bridge/debug-login.js` was committed with a bot email+password. **Fixed**: removed from tracking + `.gitignore`, and the bot password was rotated (old credential is dead). Git history still contains the old credential → the account should be considered exposed; rotation covers it.

### F5 — Edge cases in member lifecycle
`leaveGroup` when creator leaves: only creator can delete a conversation the creator created. A non-creator last member cannot delete (rules denial, no data loss). Documented as known edge; matches Firestore-era behavior.

## Medium

### F6 — Message invariants were frontend-only
Message size/type validation lived only in `validation.ts`. **Fixed server-side**: types, immutability, sender==auth.uid, blocks client-created `system` messages, file size ≤ 5 MB, recipient count ≥ 0, `createdAt` format. Also `.indexOn createdAt` for queries (previously unbounded scans).

### F7 — indexOn missing for queries
`orderByChild('createdAt')` on messages had no index (warnings + full downloads). **Fixed** with `.indexOn: ["createdAt"]`.

### F8 — Rate limiting
No server-side throttling exists (RTDB has no native rate limiting). Mitigations present: 4000-char message cap client-side, 5 MB file cap server-side, participant cap 100 client-side. True message throttling needs Cloud Functions (Blaze billing) or App Check — out of scope for Spark.

### F9 — Media in RTDB instead of Firebase Storage
Data URLs live inside message nodes (RTDB write limit 10 MB; app caps at 5 MB). Reads are member-scoped, so confidentiality is equivalent to a Storage bucket with the shipped rules. `Question: private by default` — satisfied.

### F10 — Push notification sending has no server
Web Push subscribe + in-app display are wired (VAPID public key, service worker `push` handler, `pushSubscriptions/{uid}` store, owner-only rules). **Sending** requires either the VAPID private key or FCM service-account credentials — no server holds them yet. See DEPLOYMENT.md.

### F11 — AI endpoints had wildcard CORS, no throttling
`api/groq.js`, `netlify/functions/groq.js` — added origin allowlist, 30 req/min/IP throttle, 64 KB body cap, pinned server-side model. (Note: free-tier rate limits apply.)

## Low / hardening notes

- `users` `.read: auth != null` — contact search requires listing profiles; unavoidable within RTDB unless you split public/private profiles (recommended future).
- Bridge `/qr`, `/send`, `/status` are localhost-bound + token-gated; QR is paired on localhost only.
- The bridge message relay writes as the bot user; bot password rotated post-audit.
- Groq response content is rendered as text (no markdown injection into the DOM via dangerouslySetInnerHTML) — safe.

## Not vulnerable (verified)

- Auth: no plaintext passwords, no Admin SDK in browser code, verification gates + session handling are sound.
- Open-redirect: auth callbacks are internal routes only.
- XSS: React escapes all message content by default (linkify sanitizes URLs).
- CSP: verified live on all hosts; blocks scripts from CDN holes; Firebase/Google endpoints allowlisted.
