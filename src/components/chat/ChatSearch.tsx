import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FileText, Loader2, MessageSquare, Search, X } from 'lucide-react';
import { searchMessages } from '../../lib/chatApi';
import { formatConversationTime } from '../../lib/time';
import type { SearchResult } from '../../types/chat';

interface ChatSearchProps {
  conversationId: string;
  onSelect: (result: SearchResult) => Promise<void>;
  onClose: () => void;
}

function highlighted(content: string | null, query: string, fileType: string): ReactNode {
  if (!content) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[#667781] dark:text-[#8696a0]">
        <FileText size={13} />
        {fileType === 'image' ? 'Photo' : fileType === 'audio' ? 'Voice message' : 'Attachment'}
      </span>
    );
  }
  const needle = query.trim();
  if (!needle) return content;
  const index = content.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return content;
  return (
    <>
      {content.slice(0, index)}
      <mark className="rounded bg-brand-200/70 px-0.5 text-inherit dark:bg-brand-500/30">
        {content.slice(index, index + needle.length)}
      </mark>
      {content.slice(index + needle.length)}
    </>
  );
}

export function ChatSearch({ conversationId, onSelect, onClose }: ChatSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jumpingId, setJumpingId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let active = true;
    const cleaned = query.trim();
    if (cleaned.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      setSearched(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      void searchMessages(conversationId, cleaned)
        .then((found) => {
          if (!active) return;
          setResults(found);
          setError(null);
          setSearched(true);
        })
        .catch(() => {
          if (!active) return;
          setError('Unable to search right now.');
          setSearched(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, conversationId]);

  const select = async (result: SearchResult) => {
    setJumpingId(result.message_id);
    try {
      await onSelect(result);
    } finally {
      setJumpingId(null);
    }
  };

  return (
    <div className="border-b border-black/[0.06] bg-white px-3 py-3 dark:border-white/[0.06] dark:bg-[#111b21]">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search messages in this conversation"
          className="h-10 w-full rounded-xl border border-transparent bg-[#f0f2f5] pl-9 pr-10 text-sm text-[#111b21] placeholder:text-[#8696a0] focus:border-brand-600/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/10 dark:bg-[#202c33] dark:text-[#e9edef] dark:focus:bg-[#202c33]"
          aria-label="Search messages"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#667781] hover:bg-black/[0.05] dark:text-[#8696a0] dark:hover:bg-white/[0.08]"
          aria-label="Close search"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-2 max-h-[38vh] overflow-y-auto scrollbar-thin">
        {query.trim().length < 2 ? (
          <p className="px-2 py-4 text-center text-xs text-[#8696a0]">
            Type at least two characters to search your message history.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-[#667781] dark:text-[#8696a0]">
            <Loader2 size={15} className="animate-spin" />
            Searching…
          </div>
        ) : error ? (
          <p className="px-2 py-4 text-center text-xs text-red-500">{error}</p>
        ) : searched && results.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-6 text-center">
            <MessageSquare size={20} className="text-[#8696a0]" />
            <p className="text-xs font-medium text-[#667781] dark:text-[#8696a0]">
              No messages match “{query.trim()}”
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5 pb-1">
            {results.map((result) => (
              <li key={result.message_id}>
                <button
                  type="button"
                  onClick={() => void select(result)}
                  disabled={Boolean(jumpingId)}
                  className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-[#f5f6f6] disabled:opacity-60 dark:hover:bg-[#202c33]"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-[#667781] dark:bg-white/[0.07] dark:text-[#8696a0]">
                    {jumpingId === result.message_id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <MessageSquare size={13} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="truncate text-[11px] font-semibold text-[#111b21] dark:text-[#e9edef]">
                        {result.sender_name || 'Unknown'}
                      </span>
                      <span className="shrink-0 text-[10px] text-[#8696a0]">
                        {formatConversationTime(result.created_at)}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#667781] dark:text-[#aebac1]">
                      {highlighted(result.content, query, result.message_type)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
