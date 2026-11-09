# ALLXCHAT — Architecture

## Stack

| Concern | Implementation |
|---|---|
| Frontend | React 18 + Vite 6 + TypeScript, React Router 6, Zustand |
| Auth | Firebase Auth — email/password + Google popup; email-verification gate; profile hydration |
| Realtime | Firebase Realtime Database (Singapore, `asia-southeast1`) |
| Media | Base64 data URLs inside message docs (≤5 MB, images re-encoded to ≤1280px JPEG); Firebase Storage rules are shipped but the bucket is uninitialized (Spark) |
| AI | Groq (OpenAI-compatible) behind a serverless proxy — Netlify Function / Vercel Function; key in server env only |
| Hosting | Firebase Hosting (primary), Netlify (backup), GitHub Pages (mirror) |

## Data model

```
users/{uid}                 profile document (8 fields, whitelisted in rules)
usernames/{username}        { uid }  (uniqueness registry)
userConversations/{uid}/{cid}  true  (reverse index of conversation membership)
conversations/{cid}         conversation metadata + participants map + roles
conversations/{cid}/messages/{mid}  messages + readAtBy/deliveredAtBy/reactions
presence/{uid}              ephemeral presence snapshot
typing/{cid}/{uid}          ephemeral typing state
pushSubscriptions/{uid}/{endpoint}  Web Push subscription records
```

## Request flows

- **Sign up** — `claimUsername` (RTDB transaction) + `users/{uid}` write, then email verification.
- **Send message** — `insertMessage` (multi-path `update()` writes message + bumps `lastMessageAt`).
- **Realtime** — `useChatRealtime` listens on `userConversations/{uid}` (index change → refetch summaries) and per-conversation `messages` `onValue` (dedup by id, sound/notification, read/delivered acks).
- **Presence/typing** — `usePresence` heartbeat → `presence/{uid}`; `useTyping` → `typing/{cid}/{uid}`.
- **AI** — `AiPage` → `src/lib/groq.ts` → serverless proxy → Groq; SSE streaming parsed client-side.
- **Bridge** — `whatsapp-bridge/` (Node, whatsapp-web.js) relays real WhatsApp messages into the same RTDB model as a bot user.

## Security invariants

- Membership (`participantIds[uid]`) is the root security primitive (see `database.rules.json`).
- Field immutability + type validation at the tree leaf level; `.indexOn createdAt` for message queries.
- `scripts/check-rules.mjs` guards the invariants in CI.

## Bundle posture

Manual chunks: `firebase` (app/auth/database), `vendor` (React/router), `emoji` (emoji-picker-react), lazy routes. The AI key is never bundled (proxy-only; dev fallback is dead-code in production). Firebase chunk: 422 KB.
