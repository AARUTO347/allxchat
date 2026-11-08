require('dotenv').config();
const express = require('express');
const QRCode = require('qrcode');
const fetch = require('node-fetch');
const { Client, LocalAuth } = require('whatsapp-web.js');

const {
  FIREBASE_API_KEY,
  BRIDGE_EMAIL,
  BRIDGE_PASSWORD,
  ALLXCHAT_UID,
  RTDB_URL = 'https://allxchat-12a8b-default-rtdb.asia-southeast1.firebasedatabase.app',
  BRIDGE_NAME = 'WhatsApp Bridge',
  PORT = 3000,
  GROQ_API_KEY,
  AI_AUTO_REPLY = 'false',
} = process.env;

if (!FIREBASE_API_KEY || !BRIDGE_EMAIL || !BRIDGE_PASSWORD || !ALLXCHAT_UID) {
  console.error('Missing env vars. Copy .env.example to .env and fill in all values.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Firebase Auth (bot account) via Identity Toolkit REST
// ---------------------------------------------------------------------------
let botUid = null;
let idToken = null;

async function firebaseSignIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: BRIDGE_EMAIL, password: BRIDGE_PASSWORD, returnSecureToken: true }),
    },
  );
  if (!res.ok) {
    throw new Error(`Firebase sign-in failed (${res.status}). Check BRIDGE_EMAIL/BRIDGE_PASSWORD.`);
  }
  const data = await res.json();
  botUid = data.localId;
  idToken = data.idToken;
  console.log(`ALLXCHAT bot signed in as ${BRIDGE_EMAIL} (uid ${botUid})`);
}

function dbPath(path) {
  return `${RTDB_URL}/${path}.json?auth=${idToken}`;
}

async function rtdb(method, path, body) {
  const res = await fetch(dbPath(path), {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401 || res.status === 403) {
    await firebaseSignIn(); // token expired — re-auth and retry once
    const retry = await fetch(dbPath(path), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!retry.ok) throw new Error(`RTDB ${method} ${path} -> ${retry.status}`);
    return retry.json().catch(() => null);
  }
  if (!res.ok) throw new Error(`RTDB ${method} ${path} -> ${res.status}`);
  return res.json().catch(() => null);
}

function directConversationId(a, b) {
  return `direct_${[a, b].sort().join('_')}`;
}

async function ensureConversation() {
  const cid = directConversationId(botUid, ALLXCHAT_UID);
  const existing = await rtdb('GET', `conversations/${cid}`);
  if (existing) return cid;
  const now = new Date().toISOString();
  const participants = [botUid, ALLXCHAT_UID].sort();
  const participantIds = {};
  participants.forEach((id) => (participantIds[id] = true));
  await rtdb('PUT', `conversations/${cid}`, {
    isGroup: false,
    title: null,
    avatarUrl: null,
    createdBy: botUid,
    directKey: `direct:${[botUid, ALLXCHAT_UID].sort().join(':')}`,
    participantIds,
    roles: { [botUid]: 'admin', [ALLXCHAT_UID]: 'member' },
    joinedAt: { [botUid]: now, [ALLXCHAT_UID]: now },
    lastReadAt: { [botUid]: now, [ALLXCHAT_UID]: now },
    lastDeliveredAt: { [botUid]: now, [ALLXCHAT_UID]: now },
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await rtdb('PUT', `userConversations/${ALLXCHAT_UID}/${cid}`, true);
  await rtdb('PUT', `userConversations/${botUid}/${cid}`, true);
  return cid;
}

async function relayToAllxchat(text) {
  const cid = await ensureConversation();
  const now = new Date().toISOString();
  const msgId = `msg_bridge_${Date.now()}`;
  await rtdb('PUT', `conversations/${cid}/messages/${msgId}`, {
    clientId: msgId,
    senderId: botUid,
    content: text,
    messageType: 'text',
    filePath: null,
    fileName: null,
    fileMime: null,
    fileSize: null,
    recipientCount: 1,
    createdAt: now,
    deliveredAtBy: {},
    readAtBy: {},
  });
  await rtdb('PATCH', `conversations/${cid}`, { lastMessageAt: now, updatedAt: now });
}

// ---------------------------------------------------------------------------
// Groq AI (optional) — answers WhatsApp messages when no GROQ_API_KEY is set,
// the bridge simply relays without AI.
// ---------------------------------------------------------------------------
async function groqAnswer(prompt) {
  if (!GROQ_API_KEY) return null;
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content:
            'You are the ALLXCHAT AI assistant replying on WhatsApp. Keep answers short (under 100 words) and in the language of the user.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 512,
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

// ---------------------------------------------------------------------------
// WhatsApp client
// ---------------------------------------------------------------------------
const waClient = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

let latestQr = null;
let waReady = false;

waClient.on('qr', (qr) => {
  latestQr = qr;
  console.log('Scan the QR code at http://localhost:' + PORT + '/qr');
});

waClient.on('ready', () => {
  waReady = true;
  latestQr = null;
  console.log('WhatsApp bridge ready.');
});

waClient.on('message', async (msg) => {
  const body = (msg.body || '').trim();
  if (!body) return;
  const author = msg._data?.sender?.pushname || msg.author || 'WhatsApp';
  const text = body.startsWith('!') ? body : `[${author}] ${body}`;
  try {
    await relayToAllxchat(text);
  } catch (error) {
    console.error('Relay failed:', error.message);
  }

  // AI auto-answer every incoming message (set AI_AUTO_REPLY=true in .env)
  const autoReply = String(AI_AUTO_REPLY).toLowerCase() === 'true';
  const now = Date.now();
  const underThrottle = now - (waClient._lastAiAt || 0) > 6000;
  if (autoReply && GROQ_API_KEY && underThrottle && body && !body.startsWith('!')) {
    waClient._lastAiAt = now;
    const answer = await groqAnswer(body).catch(() => null);
    if (answer) {
      try {
        await msg.reply(answer);
      } catch (error) {
        console.error('AI reply failed:', error.message);
      }
    }
    return;
  }

  // Commands (send to your own WhatsApp number to use them)
  if (body.startsWith('!')) {
    const [cmd] = body.split(' ');
    if (cmd === '!help') {
      await msg.reply(
        `${BRIDGE_NAME}\n\nCommands:\n!help — show this list\n!ai <question> — ask the AI\n!chat <text> — post a message to ALLXCHAT\n!status — bridge status`,
      );
    } else if (cmd === '!ai') {
      const rest = body.slice('!ai'.length).trim();
      if (rest && GROQ_API_KEY) {
        try {
          const answer = await groqAnswer(rest);
          if (answer) await msg.reply(answer);
          else await msg.reply('AI returned an empty answer.');
        } catch (error) {
          await msg.reply(`AI error: ${error.message}`);
        }
      } else {
        await msg.reply('Usage: !ai <your question>');
      }
    } else if (cmd === '!chat') {
      const rest = body.slice('!chat'.length).trim();
      if (rest) {
        await relayToAllxchat(rest);
        await msg.reply('Posted to ALLXCHAT.');
      }
    } else if (cmd === '!status') {
      await msg.reply(`${BRIDGE_NAME} — online. ALLXCHAT user: ${ALLXCHAT_UID}`);
    }
  }
});

// ---------------------------------------------------------------------------
// HTTP: QR page + outbound send
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

app.get('/qr', async (req, res) => {
  if (waReady) {
    return res.send('<h1>Connected. The bridge is online.</h1>');
  }
  if (!latestQr) {
    return res.send('<p>Waiting for QR…</p><script>setTimeout(()=>location.reload(),3000)</script>');
  }
  const dataUrl = await QRCode.toDataURL(latestQr, { width: 320 });
  res.send(
    `<html><body style="font-family:sans-serif;text-align:center;margin-top:48px">
      <h2>Scan with WhatsApp on your phone</h2>
      <img src="${dataUrl}" alt="QR"/>
      <script>setTimeout(()=>location.reload(),15000)</script>
    </body></html>`,
  );
});

app.get('/status', (req, res) => res.json({ ready: waReady, botUid, paired: !!idToken }));
app.post('/send', async (req, res) => {
  const { chatId, message } = req.body || {};
  if (!waReady) return res.status(503).json({ error: 'WhatsApp not ready' });
  if (!chatId || !message) return res.status(400).json({ error: 'chatId and message required' });
  try {
    const sent = await waClient.sendMessage(chatId, message);
    res.json({ ok: true, id: sent.id?._serialized || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.listen(PORT, () => console.log(`Bridge API on http://localhost:${PORT}`));

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
(async () => {
  try {
    await firebaseSignIn();
    await waClient.initialize();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
