// Vercel Serverless Function: Groq chat-completions proxy.
// Reads GROQ_API_KEY from the Vercel environment (never ships to browsers).
// Supports streaming (stream: true) by returning Groq's SSE stream fully.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

const SYSTEM_PROMPT =
  'You are the ALLXCHAT AI assistant. Keep answers concise, friendly, and useful. Format with markdown when it helps.';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
    return;
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const incomingMessages = Array.isArray(payload.messages) ? payload.messages : [];
  if (incomingMessages.length === 0) {
    res.status(400).json({ error: 'messages array is required.' });
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
        model: payload.model || MODEL,
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
