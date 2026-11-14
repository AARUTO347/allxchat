# ALLXCHAT x WhatsApp Bridge

A small Node relay that pairs with a **real WhatsApp account** (QR scan) and posts incoming WhatsApp messages into ALLXCHAT chat (Realtime Database), plus `!` commands you can trigger from WhatsApp itself.

> ⚠️ Automating a real WhatsApp account can get that account **rate-limited or banned** by WhatsApp. Use a secondary/test number. This is a local hobby tool — you run it on your machine, it is not hosted on Netlify.

## Setup

1. **Create a bot account in ALLXCHAT** (free): open https://allxchat.netlify.app → Sign up with an email like `bridge@allxchat.local`, verify your email, and note the account's **uid** (Firebase Console → Authentication → Users).
2. Copy `.env.example` to `.env` and fill it in (Firebase API key = your `VITE_FIREBASE_API_KEY`, `ALLXCHAT_UID` = your uid from step 1).
3. Install + start:

   ```powershell
   cd whatsapp-bridge
   npm install
   npm start
   ```

4. Open `http://localhost:3000/qr?t=<BRIDGE_TOKEN>` and **scan the QR code** with WhatsApp on your phone (Linked Devices). The token is auto-generated and saved to `.env` on first run; the `?t=` form exists so a plain browser can reach the page without extensions.
5. WhatsApp messages you receive now get relayed into your ALLXCHAT conversation with the bridge bot. Commands from a WhatsApp chat:
   - `!help` — list commands
   - `!chat hola` — post `hola` to ALLXCHAT as the bridge
   - `!status` — bridge status
6. Optional outbound (token required): `POST http://localhost:3000/send` with header `Authorization: Bearer <BRIDGE_TOKEN>` and JSON `{"chatId":"<whatsapp-chat-id>","message":"hi"}`. Outbound sends are rate-capped at 30/minute.

## Security

- The API binds **127.0.0.1 only** (not reachable from your LAN or the internet).
- `/qr`, `/status`, `/send` all require the `BRIDGE_TOKEN` (header or `?t=`). Requests without it get `401`.
- `/status` returns only `{ ok, ready }` — no uids or token state leak.
- `.env` (bot password + token) is git-ignored; never commit it.

## How it fits together

- Incoming WhatsApp message → bridge → `conversations/direct_<botUid>_<yourUid>/messages` in RTDB (same shape as the web app).
- The web app's realtime listeners show it instantly in ALLXCHAT.
- Session QR pairing is stored in `.wwebjs_auth/` (git-ignored) — you only scan once.
