# Firebase Auth Debug Report — ALLXCHAT (allxchat-12a8b)

Date: 2026-11-08
Project: `allxchat-12a8b` (Spark / free tier — no billing required for Auth)
Build: Vite + Firebase JS SDK v10.14.1

## Symptoms
1. `Firebase: Error (auth/internal-error).` (original user report)
2. After fix, test login with fake creds returned `Firebase: Error (auth/invalid-credential).`

## Root causes

### 1. internal-error (FIXED)
- Cause: Production Netlify build had empty `VITE_FIREBASE_*` — `.env.local` is gitignored, so Netlify couldn't bake config. Firebase init failed server-side.
- Fix: Added fallback web config from your Firebase Console snippet in `src/lib/firebase.ts` (env still wins). Verified `dist` contains `allxchat-12a8b.firebaseapp.com`.
- Evidence: Anonymous deploy `strong-bombolone-a4ed82.netlify.app/login` now renders LoginPage, reaches `identitytoolkit.googleapis.com/v1/accounts:signInWithPassword`, no crash.

### 2. invalid-credential (DIAGNOSED — expected for test creds)
- Meaning: Request reached Firebase, Auth enabled, API key valid, but no user matches that email+password in `allxchat-12a8b`.
- This is CORRECT for the test (`test123@example.com`) and means the pipeline is healthy. Not a config bug.

## Code fixes applied (this report)
- `src/lib/errors.ts` — maps `auth/invalid-credential`, `user-not-found`, `wrong-password`, `invalid-email`, `too-many-requests`, `user-disabled`, `requires-recent-login` to friendly messages (both message string and code)
- `src/stores/authStore.ts` — normalizes email `trim().toLowerCase()` on both signIn and signUp for case consistency
- `src/lib/firebase.ts` + `src/lib/env.ts` — missing-key warning + hint (from internal-error fix)
- Typecheck: `npx tsc -b` — PASS

## How to confirm sign-in works (free tier, you do)
1. Firebase Console → `allxchat-12a8b` → Authentication → Users: does your email exist?
   - No → go to /signup, create account, click verification link, then /login
   - Yes → double-check password (reset via Forgot password if unsure)
2. Authentication → Sign-in method: Email/Password enabled (you already proved this — fake login reached Identity Toolkit)
3. Authentication → Settings → Authorized domains: add your production domain (needed only for Google popup; email login doesn't need it)
4. Redeploy ALLXCHAT with this build (`npm run build` → deploy `dist`); Netlify env vars are now optional thanks to fallback, but set them properly for cleanliness

## What was NOT verified
- Real user login with your production credentials (no creds provided)
- Google popup on your production domain (needs domain allowlist)
- Email verification click-through (verification URL uses `window.location.origin`; on expired anonymous URLs the link dies — claim the site first)

## Limitations (free tier)
- Firebase Auth Spark includes Email/Password + Google at no charge; stay on Spark, avoid Blaze.
- Anonymous Netlify sites expire in 1h if unclaimed; claim to keep them.
- Rate limits: too many failed logins → `auth/too-many-requests` (now mapped friendly).
