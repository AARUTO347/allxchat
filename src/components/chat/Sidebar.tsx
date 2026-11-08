import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/Primitives';
import { ConversationItem } from './ConversationItem';
import { useChatStore } from '../../stores/chatStore';
import { cn } from '../../lib/utils';
import type { Conversation, Profile } from '../../types/chat';

interface SidebarProps {
  profile: Profile;
  conversations: Conversation[];
  activeId: string | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelect: (conversationId: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onSettings: () => void;
}

export function Sidebar({
  profile,
  conversations,
  activeId,
  loading,
  error,
  onRetry,
  onSelect,
  onNewChat,
  onNewGroup,
  onSettings,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const realtimeStatus = useChatStore((state) => state.realtimeStatus);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return conversations;
    return conversations.filter((conversation) => {
      const title = conversation.is_group
        ? conversation.title || ''
        : conversation.other_user?.display_name || conversation.other_user?.username || '';
      const preview = conversation.last_message?.content || '';
      return `${title} ${preview}`.toLowerCase().includes(value);
    });
  }, [conversations, query]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-black/[0.08] bg-white dark:border-white/[0.08] dark:bg-[#111b21] md:w-[360px] md:shrink-0 lg:w-[400px]">
      <header className="flex items-center justify-between px-3 pb-2 pt-3">
        <button
          type="button"
          onClick={onSettings}
          className="flex min-w-0 items-center gap-2.5 rounded-xl px-1 py-1 text-left transition hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
          aria-label="Open settings"
        >
          <Avatar
            name={profile.display_name}
            src={profile.avatar_url}
            id={profile.id}
            size={42}
            online
            showOnline
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
              {profile.display_name}
            </span>
            <span className="block truncate text-[11px] text-[#667781] dark:text-[#8696a0]">
              @{profile.username}
            </span>
          </span>
        </button>

        <div className="flex items-center">
          <IconButton label="AI Assistant" onClick={() => navigate('/ai')} className="h-9 w-9">
            <Sparkles size={19} />
          </IconButton>
          <IconButton label="New group" onClick={onNewGroup} className="h-9 w-9">
            <UsersRound size={19} />
          </IconButton>
          <IconButton label="New chat" onClick={onNewChat} className="h-9 w-9">
            <MessageSquarePlus size={19} />
          </IconButton>
          <IconButton label="Settings" onClick={onSettings} className="h-9 w-9">
            <Settings size={19} />
          </IconButton>
        </div>
      </header>

      {realtimeStatus === 'disconnected' && (
        <div className="mx-3 mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Reconnecting… messages will sync automatically.
        </div>
      )}

      <div className="px-3 pb-2">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="h-10 w-full rounded-xl border border-transparent bg-[#f0f2f5] pl-9 pr-9 text-sm text-[#111b21] placeholder:text-[#8696a0] focus:border-brand-600/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/10 dark:bg-[#202c33] dark:text-[#e9edef] dark:focus:bg-[#202c33]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[#667781] hover:bg-black/5 dark:text-[#8696a0] dark:hover:bg-white/10"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="space-y-1 px-2 py-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl px-2 py-3">
                <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-2/3" />
                  <div className="skeleton h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error && conversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
              <AlertTriangle size={24} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
              Conversations could not be loaded
            </h3>
            <p className="mt-1.5 max-w-xs text-xs leading-5 text-[#667781] dark:text-[#8696a0]">
              {error}
            </p>
            <button type="button" onClick={onRetry} className="btn-secondary mt-4">
              <RefreshCw size={15} />
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              <MessageSquarePlus size={24} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
              {query ? 'No conversations found' : 'No conversations yet'}
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-[#667781] dark:text-[#8696a0]">
              {query
                ? 'Try a different name or message.'
                : 'Start a private chat or create a group to get going.'}
            </p>
            {!query && (
              <button type="button" onClick={onNewChat} className="btn-primary mt-4">
                Start a chat
              </button>
            )}
          </div>
        ) : (
          <div className="pb-4">
            {filtered.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                profile={profile}
                active={activeId === conversation.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-black/[0.06] px-4 py-2 text-[10px] text-[#8696a0] dark:border-white/[0.06]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              realtimeStatus === 'connected'
                ? 'bg-brand-500'
                : realtimeStatus === 'connecting'
                  ? 'animate-pulse bg-amber-400'
                  : 'bg-red-400',
            )}
          />
          {realtimeStatus === 'connected'
            ? 'Live'
            : realtimeStatus === 'connecting'
              ? 'Connecting'
              : 'Offline'}
        </span>
        <span>{conversations.length} conversation{conversations.length === 1 ? '' : 's'}</span>
      </div>
    </aside>
  );
}
