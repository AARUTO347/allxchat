import { useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { AlertTriangle, ArrowDown, Loader2, MessageCircle, RefreshCw } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { useChatStore } from '../../stores/chatStore';
import { buildChatRows, type ChatRow } from '../../lib/messageRows';
import { formatDateDivider } from '../../lib/time';
import type { ChatMessage, Conversation, Profile } from '../../types/chat';

const EMPTY_MESSAGES: ChatMessage[] = [];

interface MessageListProps {
  conversation: Conversation;
  profile: Profile;
  loadOlder: () => Promise<void>;
  onReload: () => void;
  onImageClick: (url: string, name: string) => void;
  onRetry: (message: ChatMessage) => void;
  onReact: (message: ChatMessage, emoji: string) => void;
  onDelete: (message: ChatMessage) => void;
}

export function MessageList({
  conversation,
  profile,
  loadOlder,
  onReload,
  onImageClick,
  onRetry,
  onReact,
  onDelete,
}: MessageListProps) {
  const messages = useChatStore(
    (state) => state.messages[conversation.id] || EMPTY_MESSAGES,
  );
  const loading = useChatStore(
    (state) => Boolean(state.loadingMessages[conversation.id]),
  );
  const messagesError = useChatStore(
    (state) => state.messagesError[conversation.id] || null,
  );
  const loadingOlder = useChatStore(
    (state) => Boolean(state.loadingOlder[conversation.id]),
  );
  const hasMore = useChatStore((state) => state.hasMore[conversation.id] !== false);
  const focusMessageId = useChatStore((state) => state.focusMessageId);
  const setFocusMessageId = useChatStore((state) => state.setFocusMessageId);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const initialScrollRef = useRef(false);
  const previousRowsRef = useRef<{ lastId: string; count: number }>({ lastId: '', count: 0 });
  const lastOwnMessageRef = useRef('');
  const [atBottom, setAtBottom] = useState(true);
  const [firstItemIndex, setFirstItemIndex] = useState(1_000_000);

  const rows = useMemo(
    () =>
      buildChatRows(messages, {
        isGroup: conversation.is_group,
        currentUserId: profile.id,
      }),
    [messages, conversation.is_group, profile.id],
  );

  useEffect(() => {
    initialScrollRef.current = false;
    previousRowsRef.current = { lastId: '', count: 0 };
    lastOwnMessageRef.current = '';
    setFirstItemIndex(1_000_000);
  }, [conversation.id]);

  useEffect(() => {
    if (loading || rows.length === 0 || initialScrollRef.current) return;
    initialScrollRef.current = true;
    const timer = window.setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({
        index: rows.length - 1,
        align: 'end',
        behavior: 'auto',
      });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [rows.length, loading]);

  useEffect(() => {
    if (rows.length === 0) return;
    const lastId = rows[rows.length - 1].key;
    const previous = previousRowsRef.current;
    if (previous.count > 0 && previous.lastId === lastId && rows.length > previous.count) {
      const added = rows.length - previous.count;
      setFirstItemIndex((current) => Math.max(0, current - added));
    }
    previousRowsRef.current = { lastId, count: rows.length };
  }, [rows]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.sender_id !== profile.id) return;
    if (last.id === lastOwnMessageRef.current) return;
    lastOwnMessageRef.current = last.id;
    if (!initialScrollRef.current) return;
    const timer = window.setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({
        index: rows.length - 1,
        align: 'end',
        behavior: 'smooth',
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [messages, profile.id, rows.length]);

  useEffect(() => {
    if (!focusMessageId) return;
    const index = rows.findIndex(
      (row) => row.kind === 'message' && row.message.id === focusMessageId,
    );
    if (index < 0) return;
    virtuosoRef.current?.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
    const timer = window.setTimeout(() => {
      if (useChatStore.getState().focusMessageId === focusMessageId) {
        setFocusMessageId(null);
      }
    }, 2600);
    return () => window.clearTimeout(timer);
  }, [focusMessageId, rows, setFocusMessageId]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex h-full flex-col justify-end gap-3 overflow-hidden px-4 py-6">
        {[0, 1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className={
              item % 2 === 0
                ? 'flex justify-start'
                : 'flex justify-end'
            }
          >
            <div
              className={`skeleton rounded-2xl ${
                item === 2 ? 'h-20 w-56' : item % 2 === 0 ? 'h-12 w-56' : 'h-12 w-44'
              }`}
            />
          </div>
        ))}
      </div>
    );
  }

  if (!loading && messages.length === 0 && messagesError) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
          <AlertTriangle size={24} />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
          Messages could not be loaded
        </h3>
        <p className="mt-1 max-w-xs text-xs leading-5 text-[#667781] dark:text-[#8696a0]">
          {messagesError}
        </p>
        <button type="button" onClick={onReload} className="btn-secondary mt-4">
          <RefreshCw size={15} />
          Try again
        </button>
      </div>
    );
  }

  if (!loading && messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-brand-600 shadow-sm dark:bg-[#202c33] dark:text-brand-300">
          <MessageCircle size={24} />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
          No messages yet
        </h3>
        <p className="mt-1 max-w-xs text-xs leading-5 text-[#667781] dark:text-[#8696a0]">
          Say hello, share a photo, or send a file. Your conversation starts here.
        </p>
      </div>
    );
  }

  const renderRow = (_index: number, row: ChatRow) => {
    if (row.kind === 'date') {
      return (
        <div className="my-3 flex justify-center px-4">
          <span className="rounded-lg bg-white/90 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-[#667781] shadow-sm backdrop-blur-sm dark:bg-[#182229]/95 dark:text-[#8696a0]">
            {formatDateDivider(row.date)}
          </span>
        </div>
      );
    }

    return (
      <MessageBubble
        message={row.message}
        profile={profile}
        isGroup={conversation.is_group}
        showSenderName={row.showSenderName}
        showAvatar={row.showAvatar}
        isFirstInGroup={row.isFirstInGroup}
        isLastInGroup={row.isLastInGroup}
        highlighted={focusMessageId === row.message.id}
        onImageClick={onImageClick}
        onRetry={onRetry}
        onReact={onReact}
        onDelete={onDelete}
      />
    );
  };

  return (
    <div className="relative h-full">
      <Virtuoso
        ref={virtuosoRef}
        key={conversation.id}
        data={rows}
        firstItemIndex={firstItemIndex}
        alignToBottom
        increaseViewportBy={{ top: 700, bottom: 450 }}
        followOutput={(isAtBottom) => (isAtBottom ? 'smooth' : false)}
        atBottomStateChange={setAtBottom}
        startReached={() => {
          if (hasMore && !loadingOlder) void loadOlder();
        }}
        itemContent={renderRow}
        className="scrollbar-thin"
        components={{
          Header: () =>
            loadingOlder ? (
              <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-[#667781] dark:text-[#8696a0]">
                <Loader2 size={13} className="animate-spin" />
                Loading earlier messages…
              </div>
            ) : hasMore ? (
              <div className="h-2" />
            ) : messages.length > 8 ? (
              <div className="py-3 text-center text-[10px] uppercase tracking-widest text-[#8696a0]/70">
                Start of conversation
              </div>
            ) : (
              <div className="h-2" />
            ),
        }}
      />

      {!atBottom && (
        <button
          type="button"
          onClick={() =>
            virtuosoRef.current?.scrollToIndex({
              index: rows.length - 1,
              align: 'end',
              behavior: 'smooth',
            })
          }
          className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-3 py-2 text-xs font-semibold text-[#54656f] shadow-lg transition hover:bg-[#f7f8fa] dark:border-white/[0.08] dark:bg-[#202c33] dark:text-[#d1d7db] dark:hover:bg-[#2a3942]"
        >
          <ArrowDown size={14} />
          Latest
        </button>
      )}
    </div>
  );
}
