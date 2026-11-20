# ALLXCHAT

ALLXCHAT — Made by AARUTO. A WhatsApp-grade realtime chat app built with React, Firebase Realtime Database and Groq AI.

## Live

| Host | URL |
|---|---|
| Firebase Hosting (primary) | https://allxchat-12a8b.web.app |
| Netlify | https://allxchat.netlify.app |
| GitHub Pages | https://aaruto347.github.io/allxchat |

## Stack

- React 18 + Vite 6 + TypeScript
- Firebase Auth (email/password + Google)
- Firebase Realtime Database (Singapore, `asia-southeast1`)
- Groq AI via serverless proxy (Netlify Function / Vercel Function)
- Media stored as data URLs in RTDB (≤5 MB); Firebase Storage rules are provided for a future bucket
- WhatsApp bridge (`whatsapp-bridge/`) relays real WhatsApp messages into ALLXCHAT

## Quick start

```powershell
npm install
npm run dev
```

Env vars (never commit `.env.local`): see `.env.example`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run typecheck` | `tsc -b` strict check |
| `npm run test` | Vitest unit tests |
| `npm run lint` | ESLint |
| `npm run check:rules` | Static assertions over `database.rules.json` |
| `npm run secrets` | Secret scan over tracked files |
| `npm run build` | Production build (tsc + vite) |

## Docs

- `ARCHITECTURE.md` – data model and realtime flows
- `FIREBASE_SETUP.md` – project setup + authorized domains
- `SECURITY.md` – threat model + rules rationale
- `DEPLOYMENT.md` – hosts, rules deploys, Functions
- `TESTING.md` – how to test (unit, rules, live smoke)
- `CHANGELOG.md` – release notes
- `AUDIT.md`, `SECURITY_FINDINGS.md`, `IMPLEMENTATION_PLAN.md` – audit artifacts

## The WhatsApp bridge

```powershell
cd whatsapp-bridge
npm install
npm start
```
Then scan the QR at http://localhost:3000/qr with WhatsApp → Linked Devices.
Bot sign-in creds live in `whatsapp-bridge/.env` (gitignored). See `whatsapp-bridge/README.md`.

## Contributing

See `CONTRIBUTING.md`.
