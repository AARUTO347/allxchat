import { isSameDay } from './time';
import type { ChatMessage } from '../types/chat';

export interface DateRow {
  kind: 'date';
  key: string;
  date: string;
}

export interface MessageRow {
  kind: 'message';
  key: string;
  message: ChatMessage;
  showSenderName: boolean;
  showAvatar: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

export type ChatRow = DateRow | MessageRow;

const GROUP_WINDOW_MS = 5 * 60 * 1000;

function isSameGroup(previous: ChatMessage, current: ChatMessage): boolean {
  return (
    previous.sender_id === current.sender_id &&
    isSameDay(previous.created_at, current.created_at) &&
    Math.abs(
      new Date(current.created_at).getTime() - new Date(previous.created_at).getTime(),
    ) < GROUP_WINDOW_MS
  );
}

export function buildChatRows(
  messages: ChatMessage[],
  options: { isGroup: boolean; currentUserId: string },
): ChatRow[] {
  const rows: ChatRow[] = [];
  let lastDateKey = '';

  messages.forEach((message, index) => {
    const date = new Date(message.created_at);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    if (dateKey !== lastDateKey) {
      rows.push({
        kind: 'date',
        key: `date-${dateKey}`,
        date: message.created_at,
      });
      lastDateKey = dateKey;
    }

    const previous = messages[index - 1];
    const next = messages[index + 1];
    const sameAsPrevious = Boolean(previous && isSameGroup(previous, message));
    const sameAsNext = Boolean(next && isSameGroup(message, next));
    const isOwn = message.sender_id === options.currentUserId;
    const isFirstInGroup = !sameAsPrevious;

    rows.push({
      kind: 'message',
      key: message.id.startsWith('pending-') ? `client-${message.client_id}` : message.id,
      message,
      showSenderName:
        options.isGroup && !isOwn && isFirstInGroup && message.message_type !== 'system',
      showAvatar: options.isGroup && !isOwn && !sameAsNext && message.message_type !== 'system',
      isFirstInGroup,
      isLastInGroup: !sameAsNext,
    });
  });

  return rows;
}
