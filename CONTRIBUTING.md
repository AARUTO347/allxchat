# Contributing to ALLXCHAT

## Flow

1. **Branch** — `main` is the production line. Create feature branches: `feat/<name>` or `security/<scope>`.
2. **Small, logical commits** — one concern per commit; never mix refactors with features.
3. **Checks must pass** before push:
   ```powershell
   npm run typecheck
   npm run test
   npm run lint
   npm run check:rules
   npm run secrets
   npm run build
   ```
4. **Never commit** `.env.local`, `whatsapp-bridge/.env`, `.wwebjs_auth/`, tokens, or service-account JSON. Public Firebase web keys are OK by design but prefer env placeholders in docs (`*.example`).
5. **Rules changes** require `npm run check:rules` and a manual production deploy (`firebase deploy --only database`). See DEPLOYMENT.md.

## Client conventions

- Async paths that can fail use `getErrorMessage(err, fallback)` and toast error text — no raw provider errors to the UI.
- Data layer lives in `src/lib/chatApi.ts`; components call it, never RTDB directly (exceptions: hooks are fine for subscriptions).
- Media is constrained by `validateFile()` (types + sizes). Never relax caps silently.
- The Groq key must never be bundled in production: serverless proxy paths are tried first; direct calls exist only for local development.

## Bridge

`whatsapp-bridge/` is a separate Node app. Run `npm install && npm start`, open http://localhost:3000/qr, scan. It signs into Firebase as the bot account (`BRIDGE_EMAIL`). Keep `whatsapp-bridge/.env` out of git.

## Review bar

- No PR without green checks.
- Security-relevant PRs link to `SECURITY_FINDINGS.md` entries.
- Update `CHANGELOG.md` on any user-visible change.
