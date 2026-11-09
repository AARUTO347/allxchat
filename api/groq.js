// Vercel Serverless Function: Groq chat-completions proxy (hardened).
// Reads GROQ_API_KEY from the Vercel environment (never ships to browsers).
// CORS is restricted to ALLXCHAT origins only; requests are rate limited and
// payload-capped. Model is pinned server-side.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

const SYSTEM_PROMPT =
  'You are the ALLXCHAT AI assistant. Keep answers concise, friendly, and useful. Format with markdown when it helps.';

const ALLOWED_ORIGINS = new Set([
  'https://allxchat.netlify.app',
  'https://allxchat-12a8b.web.app',
  'https://aaruto347.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

const MAX_BODY_BYTES = 64 * 1024;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 8000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30; // requests per minute per IP (best-effort, warm-instance scoped)

const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  const list = (hits.get(ip) || []).filter((t) => t > windowStart);
  if (list.length >= RATE_MAX) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

export default async function handler(req, res) {
  const origin = req.headers?.origin || '';
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    res.status(403).json({ error: 'Origin not allowed.' });
    return;
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
    return;
  }

  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  if (rawBody.length > MAX_BODY_BYTES) {
    res.status(413).json({ error: 'Request body too large.' });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const incomingMessages = Array.isArray(payload.messages) ? payload.messages : [];
  if (incomingMessages.length === 0 || incomingMessages.length > MAX_MESSAGES) {
    res.status(400).json({ error: 'messages array is required (max 40).' });
    return;
  }
  for (const m of incomingMessages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant' && m.role !== 'system') || typeof m.content !== 'string' || m.content.length > MAX_MESSAGE_CHARS) {
      res.status(400).json({ error: 'Invalid message shape.' });
      return;
    }
  }

  const ip = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(String(ip).split(',')[0].trim())) {
    res.status(429).json({ error: 'Too many requests.' });
    return;
  }

  let upstream;
  try {
    upstream = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...incomingMessages],
        temperature: payload.temperature ?? 0.7,
        max_tokens: payload.max_tokens ?? 1024,
        stream: Boolean(payload.stream),
      }),
    });
  } catch (error) {
    res.status(502).json({ error: `Unable to reach Groq: ${error.message}` });
    return;
  }

  const bodyText = await upstream.text();
  res.status(upstream.ok ? 200 : upstream.status);
  res.setHeader(
    'Content-Type',
    payload.stream ? 'text/event-stream' : 'application/json',
  );
  res.setHeader('Cache-Control', 'no-cache');
  res.end(bodyText);
}
