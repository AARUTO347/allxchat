# ALLXCHAT — Security Model & User Guide

**ALLXCHAT — Made by AARUTO.** Real-time chat for individuals and groups, powered by Firebase (Auth + Realtime Database) with AI assistance over Groq.

## What ALLXCHAT protects

- **Your account** — only you can read/write your own profile fields (`users/{uid}` is a strict 8-field whitelist, `createdAt` is immutable).
- **Your conversations** — only participants (by `participantIds`) can read or write them; creates require being a participant; deletes are creator-only; group membership/role changes are admin-only; self-promotion to admin is denied by rules.
- **Your typing/presence** — `typing/{cid}/{uid}` is readable/writable only by conversation members and the typing user themselves; `presence/{uid}` is readable by signed-in users but writable only by its owner.
- **Your messages** — senders are validated server-side, core fields are immutable after creation, file size is capped at 5 MB server-side, receipts/reactions can only be written for your own uid.
- **Your push subscriptions** — stored under `pushSubscriptions/{uid}`, strictly owner-scoped.

## Hard rules worth knowing (denials are silent and immediate)

- Client edit of `createdBy`, `isGroup`, `directKey`, `createdAt` → rejected.
- Reading any conversation you're not in → denied (no data returned).
- Client-created `system` messages → rejected.

## What ALLXCHAT does NOT do

- No admin dashboard, no moderator tooling — all roles are `admin` / `member`.
- Unverified-email users cannot sign in (enforced client-side; denormalization documented in `SECURITY_FINDINGS.md`).
- Push notifications: subscriptions are captured with a VAPID public key (client-side only); **sending** requires the VAPID **private** key, which is never committed. Rotate it if ever exposed; the app stays fully usable without push.

## Containment

Rate limiting is enforced where RTDB can express it (types, sizes, immutability, write scopes). Time-based throttling (message bursts, failed auth attempts) and path/file-size abuse are platform-account level and should be added via Firebase App Check + Cloud Functions (requires Blaze). See `IMPLEMENTATION_PLAN.md`.

## Reporting

Report suspected vulnerabilities privately to the owner (AARUTO) with:
1. Affected route/UID, 2. Reproduction steps, 3. Impact assessment.
Please do not post exploits publicly.
