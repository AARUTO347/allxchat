# ALLXCHAT — Repository & Architecture Audit

**Date:** 2026-11-09 · **Branch:** `security/allxchat-hardening` · **Project:** ALLXCHAT (`allxchat-12a8b`)
**Auditor:** AARUCODE (OpenCode agent harness)

## 1. Stack & identity

| Layer | Technology |
|---|---|
| Frontend | React 18.3 + Vite 6 + TypeScript 5.7, React Router 6, Zustand 5, Tailwind 3, Lucide |
| Backend-as-a-service | Firebase Auth (email/password + Google popup), Realtime Database (Singapore region) |
| Media | Data URLs stored in RTDB (Firebase Storage never initialized) |
| AI | Groq (`openai/gpt-oss-120b`) via Netlify Edge/Functions proxy or Vite-dev fallback |
| Hosting | Firebase Hosting (`allxchat-12a8b.web.app`), Netlify (`allxchat.netlify.app`), GitHub Pages (`aaruto347.github.io/allxchat`), claimed Vercel temp deployment |
| Extra | WhatsApp bridge (`whatsapp-bridge/`, whatsapp-web.js, local Node service) |

## 2. Routes (src/App.tsx)

`/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`,
`/auth/callback`, `/chat`, `/chat/:conversationId`, `/ai`, `*` → NotFound.
Protected routes: session + emailVerified + profile hydration (ProtectedRoute).

## 3. Data model (Realtime Database)

- `users/{uid}` — UserDoc: `{ username, displayName, avatarUrl, about, isOnline, lastSeen, createdAt, updatedAt }`
- `usernames/{username}` — `{ uid }` (uniqueness registry, transaction-claimed)
- `userConversations/{uid}/{cid}` — reverse index of conversation memberships
- `conversations/{cid}` — ConversationDoc: `{ isGroup, title, avatarUrl, createdBy, directKey, participantIds{-map}, roles{uid: admin|member}, joinedAt{}, lastReadAt{}, lastDeliveredAt{}, lastMessageAt, createdAt, updatedAt }`
- `conversations/{cid}/messages/{msgId}` — MessageDoc: `{ clientId, senderId, content, messageType, filePath, fileName, fileMime, fileSize, recipientCount, createdAt, deliveredAtBy{}, readAtBy{}, reactions{emoji{uid:true}} }`
- `presence/{uid}` — `{ isOnline, displayName, lastSeen, updatedAt }`
- `typing/{cid}/{uid}` — `{ isTyping }`

No Firestore, no Storage bucket (deliberately removed; media is base64 ≤5 MB in RTDB).

## 4. Auth flow

`createUserWithEmailAndPassword`/`signInWithEmailAndPassword`/`signInWithPopup(Google)` →
email-verification gate → RTDB profile claim via transaction (`claimUsername`) →
Zustand stores (`authStore`, `chatStore`, `settingsStore`).
Exported helpers centralised in `src/lib/chatApi.ts` (identical signatures pre/post-migration).

## 5. Baseline verification (pre-hardening)

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ pass (1 known harmless warning: `env.ts` mixed import) |
| `npm run test` (Vitest) | ✅ 68/68 pass, 7 files |
| `npm run build` | ✅ pass |
| RTDB rules live smoke test | ✅ 7/7 checks (create/index/write/read + 2 forgery denials + cleanup) |

## 6. Existing security posture (pre-hardening)

- Conversation membership is enforced on **reads and writes** (fixed privilege-escalation from Firestore era).
- Role escalation blocked (self-promotion denied in rules).
- Message fields are immutable server-side after creation; receipts are limited to own uid.
- Username claims are transactional.
- Root `.env*` files via `.gitignore`; no credentials found in tracked files (audit `scripts/secret-scan.mjs`).
- Groq key proxied through Netlify function (env) when available.

## 7. Known gaps (see SECURITY_FINDINGS.md)

1. **Typing indicators globally readable** (any authed user). → Phase 1 fix.
2. **User documents unvalidated** (any field set on create; no type checks). → Phase 1 fix.
3. **Message content/type/size unenforced server-side** (4000-char client cap only). → Phase 1 partial fix.
4. **Missing `.indexOn` for `createdAt`** → query warning + full scans. → Phase 6 fix.
5. **Push notifications non-functional end-to-end** (subscription infra exists; no server sender secret). → documented.
6. **`whatsapp-bridge/debug-login.js` left tracked with an autologin credential** (pre-publication cleanup by user, not by me). → removed from tracking + password rotated.
