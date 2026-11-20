# ALLXCHAT — Firebase Setup

Project: **allxchat-12a8b** (Spark, no billing). Region for RTDB: `asia-southeast1`.

## 1. Console basics (one-time clicks)

- **Authentication → Sign-in methods**: enable **Email/Password** ✓ and **Google** (needed for Google sign-in).
- **Authentication → Settings → Authorized domains**: add every hosting domain you serve, e.g.
  ```
  allxchat-12a8b.web.app
  allxchat.netlify.app
  aaruto347.github.io
  *.vercel.app
  ```
  Firebase auto-authorizes `*.web.app` and `*.firebaseapp.com` by default; custom domains (Netlify/GitHub/Vercel) must be added manually — missing entries surface as `auth/internal-error` in the app.
- **Web Push certificates**: optionally generate a VAPID keypair here (Cloud Messaging → Web Push certificates). The public half goes to `VITE_VAPID_PUBLIC_KEY`; the private half belongs in the bridge's `.env` (`WEB_PUSH_PRIVATE_KEY`) — never in the repo.
- **Realtime Database**: already provisioned. Lock mode default is fine; rules in `database.rules.json` are what matter.
- **Firebase Storage**: SKIP (app uses RTDB data URLs; there is **no Firestore** anywhere in this project — the backend is RTDB + Auth only). A secure `storage.rules` file ships with the repo for a future bucket, but `firebase.json` intentionally has **no `storage` target**: the Spark project has no bucket initialized (that requires a billing upgrade + a console click), so `firebase deploy --only storage` cannot work today. To enable storage later: upgrade the project, initialize the bucket (Console → Storage → Get started), then add `"storage": { "rules": "storage.rules" }` to `firebase.json` and deploy.

## 2. Client config (`.env.local`, gitignored)

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=allxchat-12a8b
VITE_FIREBASE_STORAGE_BUCKET=allxchat-12a8b.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=1:...:web:...
VITE_FIREBASE_MEASUREMENT_ID=G-...
VITE_GROQ_API_KEY=gsk_...        # dev-only fallback; production uses the serverless proxy
VITE_VAPID_PUBLIC_KEY=B...        # public key — safe to embed (enables push subscribe)
```

`VITE_`-prefixed Firebase web keys are **public by design**; protect the project with rules, not secrecy. Never put Admin SDK credentials or Groq server keys behind a `VITE_` prefix.

## 3. Rules deployment

```bash
npx firebase-tools deploy --only database --project allxchat-12a8b
```

Creates nothing new after initial setup; only edits `database.rules.json` live rules.

## 4. Limits you should know (Spark plan)

- RTDB 10 MB per value; our file cap is 5 MB (≈6.7 MB base64).
- No Cloud Functions on Spark → message-rate throttling, push delivery from background, and true attachment streaming are not available. `storage.rules` + bridge cover the practical needs.
- `.indexOn` on messages mitigates read amplification; message pages are capped at 50/200 reads per query.
