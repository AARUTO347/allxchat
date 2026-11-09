# ALLXCHAT — Deployment

## Environments

| Host | URL | Status |
|---|---|---|
| Firebase Hosting (primary) | https://allxchat-12a8b.web.app | live; free on Spark |
| Netlify | https://allxchat.netlify.app | live; deploys blocked by account credits |
| GitHub Pages | https://aaruto347.github.io/allxchat | live (project site) |
| Vercel (claimed temp) | fleet-teal-udgox2k.tmp.now | needs `vercel login` for permanent deploys |

## App deploys

```bash
# Firebase Hosting (free, recommended)
npx firebase-tools deploy --only hosting --project allxchat-12a8b

# Netlify (when credits are available)
python C:\Users\<you>\AppData\Local\Temp\opencode\netlify-deploy.py
# (or: netlify deploy --prod --dir dist --functions netlify/functions)

# GitHub Pages — rebuild with the subpath base, then push dist to gh-pages branch
$env:VITE_BASE = "/allxchat/"; npm run build
```

## Rules deploy

```bash
npx firebase-tools deploy --only database --project allxchat-12a8b
```

Rules are production data access policy: **confirm with the owner before running this.** It is safe post-hardening (all writes covered by the smoke test + `check:rules`), but review the diff first:

```bash
git diff HEAD -- database.rules.json
npm run check:rules
```

## Serverless AI proxy

- Netlify: `netlify/functions/groq.js` — Groq reads `GROQ_API_KEY` from Netlify **Site environment variables** (Production). The function caches env per container; redeploy after key changes.
- Vercel: `api/groq.js` — add `GROQ_API_KEY` in Vercel project → Settings → Environment Variables (Production).
- Both return OpenAI-compatible JSON + pass through SSE when `stream: true`.

## WhatsApp bridge

```bash
cd whatsapp-bridge
npm install
npm start
```

- Open http://localhost:3000/qr and scan with WhatsApp → Linked Devices.
- Commands in WhatsApp: `!help`, `!ai <question>`, `!chat <text>`, `!status`.
- `AI_AUTO_REPLY=true` (optional) makes the bridge answer every message via Groq (throttled, 6 s between replies) — WhatsApp can rate-limit bots; keep off for personal numbers.
- `WEB_PUSH_PRIVATE_KEY` (with `VITE_VAPID_PUBLIC_KEY` client-side) enables bridge-side push sending; without it, subscription capture works but nothing is delivered.

## Env summary

| Var | Where | Notes |
|---|---|---|
| `VITE_FIREBASE_*` | `.env.local` (gitignored) | public by design |
| `VITE_GROQ_API_KEY` | dev fallback only | production: never ship; proxy instead |
| `VITE_VAPID_PUBLIC_KEY` | build env | public |
| `GROQ_API_KEY` | Netlify/Vercel server env | never commit |
| `BRIDGE_EMAIL`, `BRIDGE_PASSWORD`, `ALLXCHAT_UID`, `FIREBASE_API_KEY` | `whatsapp-bridge/.env` | gitignored |
