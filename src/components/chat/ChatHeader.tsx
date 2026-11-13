import {
  ArrowLeft,
  Info,
  Phone,
  Search,
  Sparkles,
  Users,
  Video,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/Primitives';
import { useChatStore } from '../../stores/chatStore';
import { formatLastSeen, isRecentlyOnline } from '../../lib/time';
import type { Conversation } from '../../types/chat';

interface ChatHeaderProps {
  conversation: Conversation;
  typingNames: string[];
  searchOpen: boolean;
  onBack: () => void;
  onOpenInfo: () => void;
  onToggleSearch: () => void;
  onSummarize: () => void;
  onVoiceCall?: () => void;
  onVideoCall?: () => void;
}

export function ChatHeader({
  conversation,
  typingNames,
  searchOpen,
  onBack,
  onOpenInfo,
  onToggleSearch,
  onSummarize,
  onVoiceCall,
  onVideoCall,
}: ChatHeaderProps) {
  const otherUser = conversation.other_user;
  const presence = useChatStore((state) =>
    otherUser ? state.presence[otherUser.id] : undefined,
  );
  const online = Boolean(
    presence || (otherUser?.is_online && isRecentlyOnline(otherUser.last_seen)),
  );
  const title = conversation.is_group
    ? conversation.title || 'Unnamed group'
    : otherUser?.display_name || otherUser?.username || 'Unknown contact';

  const status = (() => {
    if (typingNames.length > 0) {
      if (conversation.is_group) {
        if (typingNames.length === 1) return `${typingNames[0]} is typing…`;
        if (typingNames.length === 2) return `${typingNames[0]} and ${typingNames[1]} are typing…`;
        return 'Several people are typing…';
      }
      return 'typing…';
    }
    if (conversation.is_group) {
      return `${conversation.participant_count} member${conversation.participant_count === 1 ? '' : 's'}`;
    }
    return online ? 'online' : formatLastSeen(otherUser?.last_seen);
  })();

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-1 border-b border-black/[0.06] bg-[#f0f2f5] px-2 dark:border-white/[0.06] dark:bg-[#202c33] md:h-[64px] md:px-4">
      <IconButton label="Back" onClick={onBack} className="md:hidden">
        <ArrowLeft size={22} />
      </IconButton>

      <button
        type="button"
        onClick={onOpenInfo}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-black/[0.035] dark:hover:bg-white/[0.04]"
        aria-label={`Open ${conversation.is_group ? 'group' : 'contact'} information`}
      >
        <Avatar
          name={title}
          src={conversation.is_group ? conversation.avatar_url : otherUser?.avatar_url}
          id={conversation.is_group ? conversation.id : otherUser?.id}
          isGroup={conversation.is_group}
          size={40}
          online={online}
          showOnline={!conversation.is_group}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef]">
              {title}
            </h1>
            {conversation.is_group && (
              <Users size={13} className="shrink-0 text-[#667781] dark:text-[#8696a0]" />
            )}
          </div>
          <p
            className={
              typingNames.length > 0
                ? 'truncate text-xs font-medium text-brand-600 dark:text-brand-400'
                : 'truncate text-xs text-[#667781] dark:text-[#8696a0]'
            }
          >
            {status}
          </p>
        </div>
      </button>

      <div className="flex items-center">
        {onVoiceCall && !conversation.is_group && (
          <IconButton label="Voice call" onClick={onVoiceCall}>
            <Phone size={19} />
          </IconButton>
        )}
        {onVideoCall && !conversation.is_group && (
          <IconButton label="Video call" onClick={onVideoCall}>
            <Video size={19} />
          </IconButton>
        )}
        <IconButton label="Summarize with AI" onClick={onSummarize}>
          <Sparkles size={19} />
        </IconButton>
        <IconButton
          label="Search in chat"
          onClick={onToggleSearch}
          className={searchOpen ? 'bg-black/[0.06] dark:bg-white/[0.1]' : ''}
        >
          <Search size={19} />
        </IconButton>
        <IconButton label={conversation.is_group ? 'Group info' : 'Contact info'} onClick={onOpenInfo}>
          <Info size={19} />
        </IconButton>
      </div>
    </header>
  );
}
