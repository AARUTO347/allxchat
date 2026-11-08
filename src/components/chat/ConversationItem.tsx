import { Image as ImageIcon, Mic } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { cn, previewFromMessage, truncate } from '../../lib/utils';
import { formatConversationTime, isRecentlyOnline } from '../../lib/time';
import { useChatStore } from '../../stores/chatStore';
import type { Conversation, Profile } from '../../types/chat';

interface ConversationItemProps {
  conversation: Conversation;
  profile: Profile;
  active: boolean;
  onSelect: (conversationId: string) => void;
}

export function ConversationItem({
  conversation,
  profile,
  active,
  onSelect,
}: ConversationItemProps) {
  const otherUser = conversation.other_user;
  const presence = useChatStore((state) =>
    otherUser ? state.presence[otherUser.id] : undefined,
  );
  const online = Boolean(
    presence ||
      (otherUser?.is_online && isRecentlyOnline(otherUser.last_seen)),
  );
  const title = conversation.is_group
    ? conversation.title || 'Unnamed group'
    : otherUser?.display_name || otherUser?.username || 'Unknown contact';
  const last = conversation.last_message;
  const preview = last
    ? previewFromMessage(last.content, last.message_type, last.file_name)
    : 'No messages yet';
  const isOwnLast = last?.sender_id === profile.id;
  const prefix = isOwnLast
    ? 'You: '
    : conversation.is_group && last?.sender_name
      ? `${last.sender_name.split(' ')[0]}: `
      : '';
  const unread = conversation.unread_count > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors',
        active
          ? 'bg-[#f0f2f5] dark:bg-[#2a3942]'
          : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]',
      )}
    >
      <Avatar
        name={title}
        src={conversation.is_group ? conversation.avatar_url : otherUser?.avatar_url}
        id={conversation.is_group ? conversation.id : otherUser?.id}
        isGroup={conversation.is_group}
        size={49}
        online={online}
        showOnline={!conversation.is_group}
      />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-medium text-[#111b21] dark:text-[#e9edef]">
            {title}
          </span>
          <span
            className={cn(
              'shrink-0 text-[11px]',
              unread ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-[#667781] dark:text-[#8696a0]',
            )}
          >
            {last ? formatConversationTime(last.created_at) : ''}
          </span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            {last?.message_type === 'image' && !last.content && (
              <ImageIcon size={13} className="shrink-0 text-[#667781]" />
            )}
            {last?.message_type === 'audio' && !last.content && (
              <Mic size={13} className="shrink-0 text-[#667781]" />
            )}
            <span
              className={cn(
                'truncate text-[13px]',
                unread
                  ? 'text-[#111b21] dark:text-[#d1d7db]'
                  : 'text-[#667781] dark:text-[#8696a0]',
              )}
            >
              {truncate(`${prefix}${preview}`, 120)}
            </span>
          </span>
          {unread && (
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
