# ALLXCHAT — Testing

## Local

```powershell
npm run typecheck   # tsc -b (strict)
npm run test        # Vitest unit tests (7 files / 68 tests)
npm run lint        # ESLint
npm run check:rules # static RTDB rules invariants
npm run secrets     # secret patterns in tracked files
npm run build       # production build
```

All six must pass. Known-noise: profile/store test files run in a jsdom env via `@vitest-environment jsdom` docblocks.

## Rules testing

- **Static invariants**: `node scripts/check-rules.mjs` asserts the hardening guarantees from the audit (typing membership, user whitelist, message enums, indexOn, reactions, push rules). Runs in CI.
- **Emulator suite** (`@firebase/rules-unit-testing` + Java) is **not set up in this environment** — Java is unavailable on the current machine. With Java installed, add `rules-test/` with the emulator harness and replicate `scripts/rtdb-smoke.py` scenarios against it.
- **Live smoke**: `python C:\Users\<you>\AppData\Local\Temp\opencode\rtdb-smoke.py` (temporary, not committed) — creates a throwaway user, exercises create/index/message/read + 2 forgery denials against production RTDB, then cleans up. The throwaway Auth user must be deleted manually in the Firebase Console afterwards.

## Manual acceptance checklist (post-deploy)

1. Sign up → verify email → profile hydrates.
2. Sign in on `allxchat-12a8b.web.app` (domain auto-authorized).
3. Create DM + group, send text/image/voice/file, reactions, delete own message, read receipts.
4. AI chat (`/ai`) streams; ✨ summary in a conversation works.
5. Voice recorder (mic button) sends an audio bubble.
6. Bridge: `npm start` → scan QR → WhatsApp message relays into the bot DM.

## CI

`.github/workflows/ci.yml` runs install → typecheck → lint → rules invariants → secret scan → tests → build on every push/PR to `main` and `security/**`.
