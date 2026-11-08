import { beforeEach, describe, expect, it } from 'vitest';
import { useChatStore } from './chatStore';
import type { ChatMessage, Conversation, Profile } from '../types/chat';

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

const conversation: Conversation = {
  id: 'conversation-1',
  is_group: false,
  title: null,
  avatar_url: null,
  last_message_at: '2026-01-01T10:00:00.000Z',
  created_at: '2026-01-01T10:00:00.000Z',
  other_user: otherUser,
  participant_count: 2,
  last_message: null,
  unread_count: 0,
};

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'message-1',
    conversation_id: conversation.id,
    sender_id: otherUser.id,
    client_id: null,
    content: 'Hello',
    message_type: 'text',
    file_path: null,
    file_name: null,
    file_mime: null,
    file_size: null,
    recipient_count: 1,
    created_at: '2026-01-01T10:00:01.000Z',
    sender: otherUser,
    receipts: [],
    pending: false,
    failed: false,
    ...overrides,
  };
}

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
  });

  it('increments unread counts for incoming messages but not own messages', () => {
    const store = useChatStore.getState();
    store.setConversations([conversation]);
    store.addMessage(conversation.id, message(), {
      currentUserId: currentUser.id,
      incrementUnread: true,
    });

    expect(useChatStore.getState().conversations[0].unread_count).toBe(1);
    expect(useChatStore.getState().conversations[0].last_message?.content).toBe('Hello');

    useChatStore.getState().addMessage(
      conversation.id,
      message({
        id: 'message-2',
        sender_id: currentUser.id,
        sender: currentUser,
        content: 'My reply',
        created_at: '2026-01-01T10:00:02.000Z',
      }),
      { currentUserId: currentUser.id, incrementUnread: true },
    );

    expect(useChatStore.getState().conversations[0].unread_count).toBe(1);
    expect(useChatStore.getState().conversations[0].last_message?.content).toBe('My reply');
  });

  it('merges an optimistic message with its server copy and keeps local data', () => {
    const store = useChatStore.getState();
    store.setConversations([conversation]);
    const pending = message({
      id: 'pending-client-1',
      client_id: 'client-1',
      sender_id: currentUser.id,
      sender: currentUser,
      pending: true,
      local_file_url: 'blob:preview',
      content: null,
      message_type: 'image',
    });
    const server = message({
      id: 'server-1',
      client_id: 'client-1',
      sender_id: currentUser.id,
      sender: currentUser,
      created_at: '2026-01-01T10:00:03.000Z',
      pending: false,
      failed: false,
    });

    store.setMessages(conversation.id, [server, pending]);

    const messages = useChatStore.getState().messages[conversation.id];
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe('server-1');
    expect(messages[0].pending).toBe(false);
    expect(messages[0].local_file_url).toBe('blob:preview');
  });

  it('merges realtime messages delivered before the insert response', () => {
    const store = useChatStore.getState();
    store.setConversations([conversation]);
    const pending = message({
      id: 'pending-client-2',
      client_id: 'client-2',
      sender_id: currentUser.id,
      sender: currentUser,
      pending: true,
    });
    const server = message({
      id: 'server-2',
      client_id: 'client-2',
      sender_id: currentUser.id,
      sender: currentUser,
      pending: false,
    });

    store.addMessage(conversation.id, pending, { currentUserId: currentUser.id });
    store.addMessage(conversation.id, server, { currentUserId: currentUser.id });

    const messages = useChatStore.getState().messages[conversation.id];
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe('server-2');
    expect(messages[0].pending).toBe(false);
  });

  it('applies delivered and read receipts only after the message timestamp', () => {
    const store = useChatStore.getState();
    store.setConversations([conversation]);
    const own = message({
      id: 'own-1',
      sender_id: currentUser.id,
      sender: currentUser,
      created_at: '2026-01-01T10:00:00.000Z',
    });
    store.setMessages(conversation.id, [own]);

    store.applyReceipt({
      conversationId: conversation.id,
      userId: otherUser.id,
      deliveredAt: '2026-01-01T09:59:59.000Z',
      readAt: null,
      currentUserId: currentUser.id,
    });
    expect(useChatStore.getState().messages[conversation.id][0].receipts).toHaveLength(0);

    store.applyReceipt({
      conversationId: conversation.id,
      userId: otherUser.id,
      deliveredAt: '2026-01-01T10:00:01.000Z',
      readAt: '2026-01-01T10:00:02.000Z',
      currentUserId: currentUser.id,
    });
    const receipt = useChatStore.getState().messages[conversation.id][0].receipts[0];
    expect(receipt.delivered_at).toBe('2026-01-01T10:00:01.000Z');
    expect(receipt.read_at).toBe('2026-01-01T10:00:02.000Z');
  });

  it('clears unread state when a conversation becomes active or is marked read', () => {
    const store = useChatStore.getState();
    store.setConversations([{ ...conversation, unread_count: 4 }]);
    store.setActiveId(conversation.id);
    expect(useChatStore.getState().conversations[0].unread_count).toBe(0);

    useChatStore.getState().updateConversation(conversation.id, { unread_count: 2 });
    useChatStore.getState().clearUnread(conversation.id);
    expect(useChatStore.getState().conversations[0].unread_count).toBe(0);
  });
});
