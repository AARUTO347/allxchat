import { getErrorMessage } from './errors';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';
const FUNCTION_URLS = [
  '/.netlify/functions/groq',
  '/api/groq',
  'https://allxchat.netlify.app/.netlify/functions/groq',
];

function devKey(): string | null {
  return (import.meta.env.VITE_GROQ_API_KEY as string | undefined) || null;
}

export function isGroqConfigured(): boolean {
  return Boolean(devKey()) || true; // Production path uses the serverless proxy.
}

async function requestUpstream(
  messages: GroqMessage[],
  stream: boolean,
  signal?: AbortSignal,
): Promise<Response> {
  const body = JSON.stringify({
    messages,
    stream,
    model: MODEL,
    temperature: 0.7,
    max_tokens: stream ? 2048 : 1024,
  });
  const headers = { 'Content-Type': 'application/json' };

  // Try serverless proxies first (key never ships to browsers in production).
  // A 200 with text/html means the SPA fallback answered (no function on this host).
  for (const url of FUNCTION_URLS) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body, signal });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json') || contentType.includes('text/event-stream')) {
        return res;
      }
    } catch (error) {
      if ((error as { name?: string })?.name === 'AbortError') throw error;
      continue;
    }
  }

  // Local development only (tree-shaken from production builds): the Netlify
  // proxy 404s under `vite dev`, so call Groq directly with the dev key.
  if (import.meta.env.DEV) {
    const key = devKey();
    if (!key) throw new Error('Groq API key is not set. Add VITE_GROQ_API_KEY and redeploy.');
    return fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: stream ? 2048 : 1024,
        stream,
      }),
      signal,
    });
  }

  throw new Error('Unable to reach the AI service.');
}

async function assertOk(response: Response): Promise<void> {
  if (response.ok) return;
  const body = await response.text().catch(() => '');
  let detail = body;
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } | string };
    detail =
      typeof parsed.error === 'string'
        ? parsed.error
        : parsed.error?.message || body;
  } catch {
    // keep raw body
  }
  throw new Error(`AI service error (${response.status}): ${detail || 'request failed'}`);
}

export async function groqChat(messages: GroqMessage[]): Promise<string> {
  let response: Response;
  try {
    response = await requestUpstream(messages, false);
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') throw error;
    throw new Error(getErrorMessage(error, 'Unable to reach the AI service.'));
  }
  await assertOk(response);
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('The AI returned an empty response.');
  return content;
}

export async function groqChatStream(
  messages: GroqMessage[],
  onDelta: (accumulated: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  let response: Response;
  try {
    response = await requestUpstream(messages, true, signal);
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') throw error;
    throw new Error(getErrorMessage(error, 'Unable to reach the AI service.'));
  }
  await assertOk(response);

  if (!response.body) {
    // Fallback: non-streaming JSON despite asking for a stream.
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    onDelta(content);
    return content;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  const consumeLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('data:')) return;
    const payload = trimmed.slice(5).trim();
    if (payload === '[DONE]') return;
    try {
      const parsed = JSON.parse(payload) as {
        choices?: Array<{ delta?: { content?: string } }>;
      };
      const chunk = parsed.choices?.[0]?.delta?.content;
      if (chunk) {
        accumulated += chunk;
        onDelta(accumulated);
      }
    } catch {
      // Ignore malformed chunks; keep the stream alive.
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      lines.forEach(consumeLine);
    }
    if (buffer.trim()) consumeLine(buffer);
  } catch (error) {
    if ((error as { name?: string })?.name === 'AbortError') throw error;
    throw new Error(getErrorMessage(error, 'Stream interrupted.'));
  }

  return accumulated;
}
