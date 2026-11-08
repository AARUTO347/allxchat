import { describe, expect, it } from 'vitest';
import { buildChatRows } from './messageRows';
import type { ChatMessage, Profile } from '../types/chat';

const currentUser: Profile = {
  id: 'current-user',
  username: 'current',
  display_name: 'Current User',
  avatar_url: null,
  about: null,
  is_online: true,
  last_seen: '2026-01-01T10:00:00.000Z',
  created_at: '2026-01-01T10:00:00.000Z',
};

const otherUser: Profile = {
  ...currentUser,
  id: 'other-user',
  username: 'other',
  display_name: 'Other User',
};

function at(day: number, hour: number, minute: number): string {
  return new Date(2026, 0, day, hour, minute, 0, 0).toISOString();
}

function message(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: overrides.id || 'message-1',
    conversation_id: 'conversation-1',
    sender_id: otherUser.id,
    client_id: null,
    content: 'Hello',
    message_type: 'text',
    file_path: null,
    file_name: null,
    file_mime: null,
    file_size: null,
    recipient_count: 1,
    created_at: at(1, 10, 0),
    sender: otherUser,
    receipts: [],
    pending: false,
    failed: false,
    ...overrides,
  };
}

describe('buildChatRows', () => {
  it('groups consecutive messages from the same sender', () => {
    const rows = buildChatRows(
      [
        message({ id: 'first', created_at: at(1, 10, 0) }),
        message({ id: 'second', created_at: at(1, 10, 2) }),
      ],
      { isGroup: true, currentUserId: currentUser.id },
    );

    expect(rows.map((row) => row.kind)).toEqual(['date', 'message', 'message']);
    const first = rows[1];
    const second = rows[2];
    if (first.kind !== 'message' || second.kind !== 'message') {
      throw new Error('Expected message rows');
    }
    expect(first.showSenderName).toBe(true);
    expect(first.showAvatar).toBe(false);
    expect(first.isFirstInGroup).toBe(true);
    expect(second.showSenderName).toBe(false);
    expect(second.showAvatar).toBe(true);
    expect(second.isFirstInGroup).toBe(false);
    expect(second.isLastInGroup).toBe(true);
  });

  it('starts a new visual group after five minutes', () => {
    const rows = buildChatRows(
      [
        message({ id: 'first', created_at: at(1, 10, 0) }),
        message({ id: 'second', created_at: at(1, 10, 6) }),
      ],
      { isGroup: true, currentUserId: currentUser.id },
    );
    const second = rows[2];
    if (second.kind !== 'message') throw new Error('Expected message row');
    expect(second.isFirstInGroup).toBe(true);
    expect(second.showSenderName).toBe(true);
    expect(second.showAvatar).toBe(true);
  });

  it('inserts a divider when the local calendar day changes', () => {
    const rows = buildChatRows(
      [
        message({ id: 'late', created_at: at(1, 23, 59) }),
        message({ id: 'early', created_at: at(2, 0, 1) }),
      ],
      { isGroup: false, currentUserId: currentUser.id },
    );
    expect(rows.filter((row) => row.kind === 'date')).toHaveLength(2);
  });

  it('hides sender names and avatars for own and direct messages', () => {
    const rows = buildChatRows(
      [
        message({ id: 'mine', sender_id: currentUser.id, sender: currentUser }),
        message({ id: 'theirs', sender_id: otherUser.id, sender: otherUser, created_at: at(1, 10, 10) }),
      ],
      { isGroup: true, currentUserId: currentUser.id },
    );
    const mine = rows[1];
    const theirs = rows[2];
    if (mine.kind !== 'message' || theirs.kind !== 'message') {
      throw new Error('Expected message rows');
    }
    expect(mine.showSenderName).toBe(false);
    expect(mine.showAvatar).toBe(false);
    expect(theirs.showSenderName).toBe(true);

    const directRows = buildChatRows(
      [message({ id: 'direct', sender_id: otherUser.id })],
      { isGroup: false, currentUserId: currentUser.id },
    );
    const direct = directRows[1];
    if (direct.kind !== 'message') throw new Error('Expected message row');
    expect(direct.showSenderName).toBe(false);
    expect(direct.showAvatar).toBe(false);
  });

  it('uses the client id as the key for optimistic messages', () => {
    const rows = buildChatRows(
      [message({ id: 'pending-client-123', client_id: 'client-123', pending: true })],
      { isGroup: false, currentUserId: currentUser.id },
    );
    const pending = rows[1];
    if (pending.kind !== 'message') throw new Error('Expected message row');
    expect(pending.key).toBe('client-client-123');
  });
});
