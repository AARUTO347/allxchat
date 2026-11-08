import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, Send, Sparkles, Square, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingScreen } from '../components/ui/Primitives';
import { getErrorMessage } from '../lib/errors';
import { groqChatStream, isGroqConfigured, type GroqMessage } from '../lib/groq';
import { formatMessageTime } from '../lib/time';
import { cn } from '../lib/utils';
import { useAuthStore } from '../stores/authStore';

interface AiItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  at: string;
}

const STORAGE_KEY = 'allxchat-ai-history';

const QUICK_PROMPTS = [
  'Write a professional email asking for a raise',
  'Explain quantum computing like I am 10',
  'Give me a 7-day plan to learn React',
  'Turn this idea into a business pitch',
];

function loadHistory(): AiItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AiItem[]) : [];
    return Array.isArray(parsed) ? parsed.slice(-50) : [];
  } catch {
    return [];
  }
}

function AiBubble({ item, isOwn }: { item: AiItem; isOwn: boolean }) {
  return (
    <div
      className={cn(
        'relative max-w-[85%] rounded-2xl px-3 py-2 sm:max-w-[68%]',
        isOwn ? 'bubble-out rounded-tr-md' : 'bubble-in rounded-tl-md',
      )}
    >
      <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[1.45]">
        {item.content}
      </p>
      <p
        className={cn(
          'mt-0.5 flex justify-end text-[10px]',
          isOwn ? 'text-[#667781] dark:text-[#c5d1d6]/70' : 'text-[#667781] dark:text-[#8696a0]',
        )}
      >
        {formatMessageTime(item.at)}
      </p>
    </div>
  );
}

export function AiPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const loading = useAuthStore((state) => state.loading);
  const [items, setItems] = useState<AiItem[]>(loadHistory);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-50)));
    } catch {
      // History persistence is best effort.
    }
  }, [items]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [items, streamingText, busy]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback(
    async (preset?: string) => {
      const text = (preset ?? draft).trim();
      if (!text || busy) return;
      setDraft('');
      setError(null);
      const userItem: AiItem = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: text,
        at: new Date().toISOString(),
      };
      setItems((current) => [...current, userItem]);
      setStreamingText('');
      setBusy(true);

      const abort = new AbortController();
      abortRef.current = abort;
      try {
        const history: GroqMessage[] = items
          .slice(-12)
          .map((item) => ({ role: item.role, content: item.content }));
        history.push({ role: 'user', content: text });
        const answer = await groqChatStream(
          history,
          (accumulated) => setStreamingText(accumulated),
          abort.signal,
        );
        if (answer) {
          setItems((current) => [
            ...current,
            {
              id: `a-${Date.now()}`,
              role: 'assistant',
              content: answer,
              at: new Date().toISOString(),
            },
          ]);
        }
      } catch (err) {
        if ((err as { name?: string })?.name !== 'AbortError') {
          setError(getErrorMessage(err, 'Unable to contact the AI.'));
        }
      } finally {
        setBusy(false);
        setStreamingText('');
        abortRef.current = null;
      }
    },
    [draft, busy, items],
  );

  const clearHistory = useCallback(() => {
    setItems([]);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };

  if (loading && !profile) return <LoadingScreen label="Opening ALLXCHAT…" />;

  return (
    <div className="flex h-full flex-col bg-[#f0f2f5] dark:bg-[#0b141a]">
      <header className="z-10 flex items-center gap-2 border-b border-black/[0.06] bg-[#f0f2f5] px-2 py-2 dark:border-white/[0.06] dark:bg-[#202c33] sm:px-3">
        <button
          type="button"
          onClick={() => navigate('/chat')}
          className="icon-button h-9 w-9"
          aria-label="Back to chats"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white">
          <Sparkles size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">
            AI Assistant
          </p>
          <p className="truncate text-xs text-[#667781] dark:text-[#8696a0]">
            {isGroqConfigured() ? 'online · powered by Groq' : 'not configured — add VITE_GROQ_API_KEY'}
          </p>
        </div>
      </header>

      <div className="chat-wallpaper min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto flex max-w-3xl flex-col gap-1.5 px-3 py-4 sm:px-6">
          {items.length === 0 && (
            <div className="mt-10 rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-[#202c33]">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                <Sparkles size={24} />
              </span>
              <h2 className="mt-3 text-base font-semibold text-[#111b21] dark:text-[#e9edef]">
                Ask anything
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-[13px] leading-5 text-[#667781] dark:text-[#8696a0]">
                Your questions are answered by a Groq-powered assistant. Chat history is
                stored only in this browser.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void send(prompt)}
                    disabled={busy}
                    className="rounded-full border border-black/[0.08] bg-[#f0f2f5] px-3 py-1.5 text-[11px] font-medium text-[#111b21] transition hover:bg-[#e4e8ec] disabled:opacity-50 dark:border-white/[0.1] dark:bg-[#2a3942] dark:text-[#e9edef] dark:hover:bg-[#36444e]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              className={cn('flex', item.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <AiBubble item={item} isOwn={item.role === 'user'} />
            </div>
          ))}

          {busy && streamingText && (
            <div className="flex justify-start">
              <div className="bubble-in relative max-w-[85%] rounded-2xl rounded-tl-md px-3 py-2 sm:max-w-[68%]">
                <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[1.45]">
                  {streamingText}
                  <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-[#00a884] align-text-bottom" />
                </p>
              </div>
            </div>
          )}
          {busy && !streamingText && (
            <div className="flex justify-start">
              <div className="bubble-in flex items-center gap-2 rounded-2xl rounded-tl-md px-3 py-2.5 text-xs text-[#667781] dark:text-[#8696a0]">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <span className="max-w-md rounded-full bg-red-50 px-3 py-1.5 text-center text-[11px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-black/[0.06] bg-[#f0f2f5] dark:border-white/[0.06] dark:bg-[#202c33]">
        <div className="flex items-end gap-2 px-2 py-2 sm:px-4">
          <textarea
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message AI…"
            aria-label="Message AI"
            disabled={busy}
            className="block max-h-[120px] min-h-[44px] w-full resize-none rounded-2xl border-0 bg-white px-4 py-3 text-[15px] leading-5 text-[#111b21] placeholder:text-[#8696a0] focus:outline-none focus:ring-2 focus:ring-brand-600/15 disabled:opacity-60 dark:bg-[#2a3942] dark:text-[#e9edef] dark:placeholder:text-[#8696a0]"
          />
          {busy ? (
            <button
              type="button"
              onClick={stop}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition hover:bg-red-600"
              aria-label="Stop generating"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void send()}
              disabled={!draft.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-[#8696a0]/40"
              aria-label="Send to AI"
            >
              <Send size={19} className="ml-0.5" />
            </button>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              disabled={busy}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#667781] transition hover:bg-black/[0.05] disabled:opacity-50 dark:text-[#8696a0] dark:hover:bg-white/[0.08]"
              aria-label="Clear history"
              title="Clear history"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
