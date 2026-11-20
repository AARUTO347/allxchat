// Netlify Function: Groq chat-completions proxy (hardened).
// Reads GROQ_API_KEY from Netlify server environment (never ships to browsers).
// CORS is restricted to ALLXCHAT origins only; requests are rate limited and
// payload-capped. Model is pinned server-side so callers cannot switch models.

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
const MAX_MESSAGES = 100;
const MAX_MESSAGE_CHARS = 50000;
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

exports.handler = async (event) => {
  // CORS: reflect origin only if allowlisted, never wildcard.
  const origin = (event.headers || {}).origin || '';
  const cors = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    cors['Access-Control-Allow-Origin'] = origin;
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method not allowed' };
  }
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Origin not allowed.' }) };
  }

  const ip = (event.headers || {})['x-forwarded-for'] || event.headers?.['client-ip'] || 'unknown';
  if (isRateLimited(String(ip).split(',')[0].trim())) {
    return { statusCode: 429, headers: cors, body: JSON.stringify({ error: 'Too many requests.' }) };
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'GROQ_API_KEY is not configured on the server.' }),
    };
  }

  const rawBody = event.body || '';
  if (rawBody.length > MAX_BODY_BYTES) {
    return { statusCode: 413, headers: cors, body: JSON.stringify({ error: 'Request body too large.' }) };
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
  }

  const incomingMessages = Array.isArray(payload.messages) ? payload.messages : [];
  if (incomingMessages.length === 0 || incomingMessages.length > MAX_MESSAGES) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'messages array is required (max 40).' }) };
  }
  for (const m of incomingMessages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant' && m.role !== 'system') || typeof m.content !== 'string' || m.content.length > MAX_MESSAGE_CHARS) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid message shape.' }) };
    }
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
    return { statusCode: 502, headers: cors, body: JSON.stringify({ error: `Unable to reach Groq: ${error.message}` }) };
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return {
      statusCode: upstream.status,
      headers: cors,
      body: JSON.stringify({ error: `Groq upstream error: ${detail || upstream.status}` }),
    };
  }

  // Buffer the upstream body (Netlify Lambda rejects raw streams).
  const bodyText = await upstream.text();

  return {
    statusCode: 200,
    headers: {
      ...cors,
      'Content-Type': payload.stream ? 'text/event-stream' : 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: bodyText,
  };
};
