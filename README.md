# ALLXCHAT

ALLXCHAT is a production-ready WhatsApp Web-style messaging SPA built with React, TypeScript, Tailwind CSS, and Firebase Auth, Firestore, Realtime Database presence/typing, and Firebase Storage. It supports direct messages, multi-user groups, realtime delivery/read receipts, typing indicators, presence, file uploads, browser notifications for hidden tabs, and a responsive desktop/mobile chat interface.

## Features

- Email/password sign-up, sign-in, verification, password recovery, protected routes, and secure sign-out
- Direct conversations and group chats with group info, admin actions, member management, and leaving groups
- Text, emoji, images, PDFs/documents, and audio attachments up to 25 MB
- Realtime messages, sent/delivered/read indicators, typing indicators, online/offline presence, and unread counters
- Presence backed by Firebase Realtime Database and Firestore profile heartbeats; sign-out and page-unload best-effort presence cleanup
- In-chat message search, conversation search, optimistic sending, retry for failed sends, and image lightbox
- Drag-and-drop uploads, paste-to-attach images, light/dark/system themes, and responsive dual-column/single-column layouts
- Browser notifications when ALLXCHAT is not visible and optional message sounds
- Loading, error, and empty states for conversations and messages
- PWA manifest and app icons for Netlify deployment

## Tech stack

- React 18, TypeScript, React Router
- Vite build tooling
- Tailwind CSS, Lucide icons, `emoji-picker-react`, `react-virtuoso`
- Zustand for client state
- Firebase Auth, Firestore, Realtime Database, and Storage

## Quick start

### Prerequisites

- Node.js 20 or newer
- npm
- A Firebase project with Email/Password authentication enabled

### 1) Configure Firebase

In the Firebase console:

1. Create a project (or use the project in your existing web config).
2. Enable **Authentication → Email/Password**.
3. Create **Firestore Database**.
4. Create **Realtime Database**.
5. Create **Storage**.
6. Deploy the security rules in this repository:
   - `firestore.rules`
   - `storage.rules`
   - `database.rules.json`

With the Firebase CLI, from this project directory:

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules,storage,database
```

### 2) Add your Firebase web config

Copy the example environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Fill in your web app config from Firebase Console → Project settings → General → Your apps → Web app:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3) Authorize your domains

In Firebase Console → Authentication → Settings → Authorized domains, add:

- `localhost`
- Your Netlify production domain

Firebase action URLs (`/auth/callback` and `/reset-password`) work with the default email templates when these domains are authorized.

### 4) Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`, create the first account, verify your email, then sign in and start a conversation.

## Scripts

```bash
npm run dev       # Start Vite development server
npm run build     # Typecheck and create the production bundle
npm run typecheck # Run TypeScript checks
npm test          # Run Vitest unit tests
npm run preview   # Preview the production build
```

## Deploy to Netlify

1. Push the project to your Git provider.
2. In Netlify, connect the repository.
3. Use these build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `20`
4. Add the same `VITE_FIREBASE_*` environment variables to Netlify.
5. Add your Netlify production and deploy-preview domains to Firebase Auth authorized domains.
6. Deploy the site.

`netlify.toml` already includes SPA rewrites, asset caching, and security headers. If you use a custom Firebase Storage domain, update the `connect-src`, `img-src`, and `media-src` entries in the Content-Security-Policy to include that domain.

## Data model and security notes

### Firestore collections

- `users/{uid}` — profile data, display name, username, avatar URL, about text, online status, and last seen.
- `usernames/{username}` — username reservation (`{ uid }`) used to enforce unique usernames.
- `conversations/{conversationId}` — direct or group metadata, participant IDs, roles, join/read/delivered timestamps, and last-message time.
- `conversations/{conversationId}/messages/{messageId}` — text and attachment messages with sender metadata and delivered/read maps.

### Realtime Database paths

- `presence/{uid}` — online status and display name for presence.
- `typing/{conversationId}/{uid}` — typing indicators.

### Storage paths

- `chat-attachments/{conversationId}/{userId}/{file}` — private attachments. Storage rules restrict reads/writes to conversation participants.
- `avatars/{userId}/...` and `avatars/groups/{groupId}/...` — public profile/group avatars.

### Rules

The included rules are defense-in-depth for the client implementation:

- Users can only write their own profile.
- Conversations and messages are restricted to participants.
- Message updates are limited to delivered/read receipt maps.
- Attachments are size-limited and restricted to conversation members.
- Presence and typing writes are restricted to the owning user.

## Operational notes

- Browser notifications require notification permission and only work while ALLXCHAT is open. A display-only service worker is included; closed-browser Web Push/VAPID is intentionally not part of this deployment.
- Read receipts are tracked per recipient. In groups, a message becomes read only when all recipients recorded at send time have read it.
- Presence is best-effort during page unload because browsers may terminate requests when a tab closes.
- App icons are generated from the source SVG design with:
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\generate-icons.ps1
  ```

## Verification checklist

After configuring Firebase:

1. Register and verify an account.
2. Sign in from two browsers or devices.
3. Create a direct conversation and send a text message.
4. Confirm delivered and read indicators update in realtime.
5. Test typing indicators and online/offline presence.
6. Create a group, add members, rename it, change the group avatar, and have a member leave.
7. Upload an image, PDF, document, and audio file.
8. Hide a tab and confirm a browser notification appears if notifications are enabled.
9. Reload both clients and confirm messages, unread counters, and conversation order are correct.
10. Run `npm run typecheck`, `npm test`, and `npm run build`.
