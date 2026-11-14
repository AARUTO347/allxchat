# Changelog

## 1.1.0 — Security hardening (2026-11-09)

- RTDB rules rebuilt: typing indicators membership-gated, user-doc field whitelist (8 fields, typed), message type/size rules, `.indexOn(createdAt)`, `reactions` and `pushSubscriptions` subtrees, username claim `isString` hardening.
- secure `storage.rules` ships for a future bucket (unused while media stays in RTDB).
- Web Push subscription flow (VAPID public key) + service worker `push` event; sending needs the private key (documented).
- Groq key moved server-side: Netlify/Vercel functions hold `GROQ_API_KEY`; client calls proxy first, dev fallback is dev-gated out of production bundles.
- ESLint + CI quality gates (typecheck, lint, rules invariants, secret scan, tests, build).
- Docs: README, SECURITY, ARCHITECTURE, FIREBASE_SETUP, DEPLOYMENT, TESTING, CONTRIBUTING, SECURITY_FINDINGS, IMPLEMENTATION_PLAN, AUDIT.

## 1.0.0 — RTDB cutover

Firestore + Storage removed; RTDB-only backend (conversations/messages/receipts/reactions); media as data URLs with client-side resize; doodle wallpaper + bubble tails; streaming AI chat page; WhatsApp bridge.
