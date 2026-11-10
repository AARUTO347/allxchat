# Acani Chats — Code Review (from `Chats-master.zip`)

**Source:** `Chats-master.zip` (Acani Chats, unmaintained open-source iOS messaging app, Heroku + PostgreSQL + AWS Lambda)
**Reviewed for:** ALLXCHAT hardening project
**Date:** 2026-11-11

---

## What's in the ZIP

The zip is a **meta-repository**. The actual app code (iOS client, Android client, Web client, REST server, Chat server) are git submodules that are **not included** in the archive. What ships inside:

| Path | Contents |
|---|---|
| `Clients/{Android,iPhone,Web}` | Empty (submodule stubs) |
| `Servers/Chat`, `Servers/REST` | Empty (submodule stubs) |
| `Servers/Database/` | PostgreSQL schema + SQL functions (the only real code) |
| `Servers/AWSLambda/resizePNG/` | Node.js image-resize Lambda (GraphicsMagick) |
| `Documents/` | Screenshots + signup/login flow diagrams |
| `README.md`, `CREDITS.md` | Project overview and credits |

---

## Database schema review

### Tables
- `users` — `id, first_name, last_name, email` (unique email index)
- `signup` — pending signups with 4-digit code, 10-min expiry
- `login` — login codes (passwordless auth via email code)
- `sessions` — one session per user (`user_id PK`, `uuid`, `created_at`)
- `email` — pending email-change codes (10-min expiry)

### Patterns worth noting
1. **Passwordless auth via 4-digit email codes** — signup and login both use short-lived 4-digit codes sent by email. ALLXCHAT uses Firebase Auth (email+password + Google OAuth) which is more robust; no change needed.
2. **One session per user** — `sessions.user_id` is the primary key, so a user can only have one active session at a time. ALLXCHAT uses Firebase Auth sessions (multi-device by default), which is better for a modern chat app.
3. **10-minute code expiry** — `age(now(), created_at) < '10 minutes'`. ALLXCHAT relies on Firebase's built-in verification; no change needed.
4. **Email change flow** — request code → verify code → update email. ALLXCHAT's Firebase Auth handles this via `updateEmail()`; no change needed.
5. **User deletion cascades** — `ON DELETE CASCADE` on all foreign keys. ALLXCHAT's RTDB rules don't have cascading deletes (by design — data is immutable once written except by sender).

### SQL function quality
- Clean CTE-based upsert patterns (`UPDATE ... WHERE NOT EXISTS ... INSERT ... WHERE NOT EXISTS`)
- Proper authentication checks (`sessions` table lookup before mutations)
- Code freshness validation before accepting
- **No rate limiting** — codes can be regenerated infinitely (same gap as ALLXCHAT's RTDB, which has no native rate limiting)

---

## AWS Lambda image resizer review

**File:** `Servers/AWSLambda/resizePNG/index.js`

### Approach
- Uses GraphicsMagick (ImageMagick) to resize images to 100×100
- Triggered by S3 `putObject` events
- Outputs to a separate `resized-` bucket
- Uses `async.waterfall` for download → transform → upload

### Comparison with ALLXCHAT's approach
| Aspect | Acani (Lambda) | ALLXCHAT (client-side) |
|---|---|---|
| Where resize happens | Server (AWS Lambda) | Client (Canvas API) |
| Max dimensions | 100×100 | 1280×1280 (messages), 512×512 (avatars) |
| Output format | JPEG (hardcoded) | JPEG (quality 0.75) |
| Storage | S3 buckets | RTDB data URLs (≤5 MB) |
| Cost | AWS Lambda (paid) | Free (client-side) |

### Actionable improvements for ALLXCHAT
1. **Aspect-ratio preservation** — ALLXCHAT already uses `Math.min(1, maxDim / Math.max(w, h))` which is correct. No change needed.
2. **Quality setting** — Acani doesn't specify quality; ALLXCHAT uses 0.75 which is reasonable. Could lower to 0.7 for smaller payloads, but 0.75 is fine for chat images.
3. **No image metadata stripping** — Neither Acani nor ALLXCHAT strips EXIF. ALLXCHAT's `toDataURL('image/jpeg')` naturally drops EXIF (Canvas re-encodes without metadata), so this is already handled.

---

## Patterns NOT applicable to ALLXCHAT

| Acani pattern | Why not applicable |
|---|---|
| PostgreSQL + REST API | ALLXCHAT uses Firebase RTDB (real-time, no backend server) |
| Passwordless 4-digit codes | Firebase Auth handles verification more securely |
| AWS Lambda image resize | ALLXCHAT resizes client-side (free, no server needed) |
| One session per user | Firebase Auth supports multi-device sessions |
| Heroku hosting | ALLXCHAT uses Firebase Hosting (free Spark) |
| iOS/Android native clients | ALLXCHAT is a web app (PWA) |

---

## Conclusion

The Acani Chats project is an **educational reference** for building messaging apps with a traditional backend (PostgreSQL + REST + native clients). It is **not directly applicable** to ALLXCHAT, which uses a modern serverless stack (Firebase RTDB + Auth + PWA).

### Useful takeaways
1. **Email verification patterns** — confirm that ALLXCHAT's Firebase Auth email verification is sufficient (it is).
2. **Image resize quality** — ALLXCHAT's 0.75 JPEG quality at 1280px is reasonable for chat; no change needed.
3. **User profile fields** — Acani uses `first_name, last_name, email`; ALLXCHAT uses `username, displayName, about, avatarUrl` which is richer. No change needed.

### No code changes required
ALLXCHAT's architecture (RTDB + Firebase Auth + client-side image resize + PWA) is more modern and cost-effective than Acani's (PostgreSQL + REST + AWS Lambda + native clients). No logic from the Acani Chats zip needs to be ported.

---

## Files reviewed
- `Servers/Database/init.sql`
- `Servers/Database/tables/{email,login,sessions,signup,users}.sql`
- `Servers/Database/functions/{email,helpers,login,me,sessions,signup,users}.sql`
- `Servers/AWSLambda/resizePNG/index.js`
- `README.md`, `CREDITS.md`, `.gitmodules`
- `Documents/` (screenshots only)
