// Netlify Function: Groq chat-completions proxy.
// Reads GROQ_API_KEY from Netlify server environment (never ships to browsers).
// Supports streaming (stream: true) by passing Groq's SSE stream through.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

const SYSTEM_PROMPT =
  'You are the ALLXCHAT AI assistant. Keep answers concise, friendly, and useful. Format with markdown when it helps.';

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method not allowed' };
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'GROQ_API_KEY is not configured on the server.' }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
  }

  const incomingMessages = Array.isArray(payload.messages) ? payload.messages : [];
  if (incomingMessages.length === 0) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'messages array is required.' }) };
  }

  const upstream = await fetch(GROQ_URL, {
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
