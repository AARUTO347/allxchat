import { create } from 'zustand';
import type {
  ChatMessage,
  Conversation,
  LastMessage,
  PresenceMap,
  Profile,
} from '../types/chat';

type RealtimeStatus = 'connecting' | 'connected' | 'disconnected';

interface ReceiptUpdate {
  conversationId: string;
  userId: string;
  deliveredAt: string | null;
  readAt: string | null;
  currentUserId: string;
}

interface AddMessageOptions {
  incrementUnread?: boolean;
  currentUserId?: string;
}

interface ChatState {
  conversations: Conversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  activeId: string | null;
  messages: Record<string, ChatMessage[]>;
  loadingMessages: Record<string, boolean>;
  messagesError: Record<string, string | null>;
  loadingOlder: Record<string, boolean>;
  hasMore: Record<string, boolean>;
  realtimeStatus: RealtimeStatus;
  presence: PresenceMap;
  syncVersion: number;
  focusMessageId: string | null;
  setConversations: (conversations: Conversation[]) => void;
  setConversationsLoading: (loading: boolean) => void;
  setConversationsError: (error: string | null) => void;
  upsertConversation: (conversation: Conversation) => void;
  updateConversation: (conversationId: string, patch: Partial<Conversation>) => void;
  removeConversation: (conversationId: string) => void;
  setActiveId: (conversationId: string | null) => void;
  setMessages: (conversationId: string, messages: ChatMessage[], hasMore?: boolean) => void;
  mergeMessages: (conversationId: string, messages: ChatMessage[]) => void;
  prependMessages: (conversationId: string, messages: ChatMessage[], hasMore: boolean) => void;
  addMessage: (
    conversationId: string,
    message: ChatMessage,
    options?: AddMessageOptions,
  ) => void;
  updateMessage: (
    conversationId: string,
    matcher: { id?: string; clientId?: string },
    patch: Partial<ChatMessage>,
  ) => void;
  removeMessage: (conversationId: string, matcher: { id?: string; clientId?: string }) => void;
  applyReceipt: (update: ReceiptUpdate) => void;
  clearUnread: (conversationId: string) => void;
  setLoadingMessages: (conversationId: string, loading: boolean) => void;
  setMessagesError: (conversationId: string, error: string | null) => void;
  setLoadingOlder: (conversationId: string, loading: boolean) => void;
  setHasMore: (conversationId: string, hasMore: boolean) => void;
  setRealtimeStatus: (status: RealtimeStatus) => void;
  setPresence: (presence: PresenceMap) => void;
  setFocusMessageId: (messageId: string | null) => void;
  bumpSyncVersion: () => void;
  replaceProfile: (profile: Profile) => void;
  reset: () => void;
}

const initialState = {
  conversations: [] as Conversation[],
  conversationsLoading: false,
  conversationsError: null as string | null,
  activeId: null as string | null,
  messages: {} as Record<string, ChatMessage[]>,
  loadingMessages: {} as Record<string, boolean>,
  messagesError: {} as Record<string, string | null>,
  loadingOlder: {} as Record<string, boolean>,
  hasMore: {} as Record<string, boolean>,
  realtimeStatus: 'connecting' as RealtimeStatus,
  presence: {} as PresenceMap,
  syncVersion: 0,
  focusMessageId: null as string | null,
};

function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice().sort((a, b) => {
    const difference = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (difference !== 0) return difference;
    return a.id.localeCompare(b.id);
  });
}

function mergeChatMessages(previous: ChatMessage, incoming: ChatMessage): ChatMessage {
  const previousIsServer = !previous.id.startsWith('pending-');
  const incomingIsServer = !incoming.id.startsWith('pending-');

  if (previousIsServer || incomingIsServer) {
    const server = previousIsServer ? previous : incoming;
    const local = previousIsServer ? incoming : previous;
    return {
      ...local,
      ...server,
      receipts: server.receipts?.length ? server.receipts : local.receipts,
      local_file_url: server.local_file_url || local.local_file_url,
      pending: server.pending,
      failed: server.failed,
    };
  }

  return {
    ...previous,
    ...incoming,
    receipts: incoming.receipts?.length ? incoming.receipts : previous.receipts,
    local_file_url: incoming.local_file_url || previous.local_file_url,
    pending: incoming.pending,
    failed: incoming.failed,
  };
}

function dedupeMessages(messages: ChatMessage[]): ChatMessage[] {
  const byKey = new Map<string, ChatMessage>();
  for (const message of messages) {
    const key = message.client_id ? `client:${message.client_id}` : message.id;
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeChatMessages(existing, message) : message);
  }
  return sortMessages(Array.from(byKey.values()));
}

function sortConversations(conversations: Conversation[]): Conversation[] {
  return conversations.slice().sort(
    (a, b) =>
      new Date(b.last_message_at || b.created_at).getTime() -
      new Date(a.last_message_at || a.created_at).getTime(),
  );
}

function lastMessageFrom(message: ChatMessage): LastMessage {
  return {
    id: message.id,
    content: message.content,
    message_type: message.message_type,
    file_name: message.file_name,
    sender_id: message.sender_id,
    sender_name: message.sender?.display_name || null,
    created_at: message.created_at,
  };
}

function upsertReceipt(
  message: ChatMessage,
  userId: string,
  deliveredAt: string | null,
  readAt: string | null,
): ChatMessage {
  const messageTime = new Date(message.created_at).getTime();
  const deliveredTime = deliveredAt ? new Date(deliveredAt).getTime() : 0;
  const readTime = readAt ? new Date(readAt).getTime() : 0;
  const delivered = deliveredTime >= messageTime ? deliveredAt : null;
  const read = readTime >= messageTime ? readAt : null;
  if (!delivered && !read) return message;

  const existingIndex = message.receipts.findIndex((receipt) => receipt.user_id === userId);
  if (existingIndex === -1) {
    return {
      ...message,
      receipts: [...message.receipts, { user_id: userId, delivered_at: delivered, read_at: read }],
    };
  }

  const receipts = message.receipts.slice();
  const existing = receipts[existingIndex];
  const existingDelivered = existing.delivered_at
    ? new Date(existing.delivered_at).getTime()
    : 0;
  const existingRead = existing.read_at ? new Date(existing.read_at).getTime() : 0;

  receipts[existingIndex] = {
    user_id: userId,
    delivered_at:
      delivered && new Date(delivered).getTime() > existingDelivered ? delivered : existing.delivered_at,
    read_at: read && new Date(read).getTime() > existingRead ? read : existing.read_at,
  };

  return { ...message, receipts };
}

export const useChatStore = create<ChatState>((set, get) => ({
  ...initialState,

  setConversations: (conversations) =>
    set({
      conversations: sortConversations(conversations),
      conversationsLoading: false,
      conversationsError: null,
    }),

  setConversationsLoading: (loading) => set({ conversationsLoading: loading }),

  setConversationsError: (error) => set({ conversationsError: error }),

  upsertConversation: (conversation) => {
    const existing = get().conversations;
    const index = existing.findIndex((item) => item.id === conversation.id);
    if (index === -1) {
      set({ conversations: sortConversations([conversation, ...existing]) });
      return;
    }
    const next = existing.slice();
    next[index] = { ...next[index], ...conversation };
    set({ conversations: sortConversations(next) });
  },

  updateConversation: (conversationId, patch) => {
    set({
      conversations: sortConversations(
        get().conversations.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, ...patch } : conversation,
        ),
      ),
    });
  },

  removeConversation: (conversationId) => {
    const messages = { ...get().messages };
    delete messages[conversationId];
    const messagesError = { ...get().messagesError };
    delete messagesError[conversationId];
    set({
      conversations: get().conversations.filter((conversation) => conversation.id !== conversationId),
      messages,
      messagesError,
      activeId: get().activeId === conversationId ? null : get().activeId,
    });
  },

  setActiveId: (conversationId) => {
    set((state) => ({
      activeId: conversationId,
      conversations: conversationId
        ? state.conversations.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, unread_count: 0 }
              : conversation,
          )
        : state.conversations,
    }));
  },

  setMessages: (conversationId, messages, hasMore) => {
    set((state) => ({
      messages: { ...state.messages, [conversationId]: dedupeMessages(messages) },
      messagesError: { ...state.messagesError, [conversationId]: null },
      ...(hasMore === undefined ? {} : { hasMore: { ...state.hasMore, [conversationId]: hasMore } }),
    }));
  },

  mergeMessages: (conversationId, messages) => {
    const current = get().messages[conversationId] || [];
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: dedupeMessages([...current, ...messages]),
      },
    }));
  },

  prependMessages: (conversationId, messages, hasMore) => {
    const current = get().messages[conversationId] || [];
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: dedupeMessages([...messages, ...current]),
      },
      hasMore: { ...state.hasMore, [conversationId]: hasMore },
      loadingOlder: { ...state.loadingOlder, [conversationId]: false },
    }));
  },

  addMessage: (conversationId, message, options) => {
    const state = get();
    const current = state.messages[conversationId] || [];
    const existingIndex = current.findIndex(
      (item) =>
        item.id === message.id ||
        Boolean(message.client_id && item.client_id && item.client_id === message.client_id),
    );

    let nextMessages: ChatMessage[];
    if (existingIndex >= 0) {
      const existing = current[existingIndex];
      const merged = mergeChatMessages(existing, message);
      nextMessages = current.slice();
      nextMessages[existingIndex] = merged;
      nextMessages = sortMessages(nextMessages);
    } else {
      nextMessages = sortMessages([...current, message]);
    }

    const conversation = state.conversations.find((item) => item.id === conversationId);
    let conversations = state.conversations;
    if (conversation) {
      const previousLastTime = new Date(conversation.last_message_at || 0).getTime();
      const messageTime = new Date(message.created_at).getTime();
      const isNewest = messageTime >= previousLastTime;
      const shouldIncrement =
        isNewest && Boolean(options?.incrementUnread) && message.sender_id !== options?.currentUserId;
      const updated: Conversation = {
        ...conversation,
        last_message_at: isNewest ? message.created_at : conversation.last_message_at,
        last_message: isNewest ? lastMessageFrom(message) : conversation.last_message,
        unread_count: (conversation.unread_count || 0) + (shouldIncrement ? 1 : 0),
      };
      conversations = sortConversations(
        state.conversations.map((item) => (item.id === conversationId ? updated : item)),
      );
    }

    set({
      messages: { ...state.messages, [conversationId]: nextMessages },
      conversations,
    });
  },

  updateMessage: (conversationId, matcher, patch) => {
    const current = get().messages[conversationId] || [];
    const next = current.map((message) => {
      const matches =
        (matcher.id && message.id === matcher.id) ||
        (matcher.clientId && message.client_id === matcher.clientId);
      return matches ? { ...message, ...patch } : message;
    });
    set((state) => ({
      messages: { ...state.messages, [conversationId]: next },
    }));
  },

  removeMessage: (conversationId, matcher) => {
    const current = get().messages[conversationId] || [];
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: current.filter((message) => {
          if (matcher.id && message.id === matcher.id) return false;
          if (matcher.clientId && message.client_id === matcher.clientId) return false;
          return true;
        }),
      },
    }));
  },

  applyReceipt: ({ conversationId, userId, deliveredAt, readAt, currentUserId }) => {
    const current = get().messages[conversationId];
    if (!current?.length) return;
    const next = current.map((message) =>
      message.sender_id === currentUserId
        ? upsertReceipt(message, userId, deliveredAt, readAt)
        : message,
    );
    set((state) => ({
      messages: { ...state.messages, [conversationId]: next },
    }));
  },

  clearUnread: (conversationId) => {
    set({
      conversations: get().conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unread_count: 0 }
          : conversation,
      ),
    });
  },

  setLoadingMessages: (conversationId, loading) => {
    set((state) => ({
      loadingMessages: { ...state.loadingMessages, [conversationId]: loading },
    }));
  },

  setMessagesError: (conversationId, error) => {
    set((state) => ({
      messagesError: { ...state.messagesError, [conversationId]: error },
    }));
  },

  setLoadingOlder: (conversationId, loading) => {
    set((state) => ({
      loadingOlder: { ...state.loadingOlder, [conversationId]: loading },
    }));
  },

  setHasMore: (conversationId, hasMore) => {
    set((state) => ({ hasMore: { ...state.hasMore, [conversationId]: hasMore } }));
  },

  setRealtimeStatus: (status) => set({ realtimeStatus: status }),

  setPresence: (presence) => set({ presence }),

  setFocusMessageId: (messageId) => set({ focusMessageId: messageId }),

  bumpSyncVersion: () => set((state) => ({ syncVersion: state.syncVersion + 1 })),

  replaceProfile: (profile) => {
    set((state) => ({
      conversations: state.conversations.map((conversation) => ({
        ...conversation,
        other_user:
          conversation.other_user?.id === profile.id ? profile : conversation.other_user,
      })),
      messages: Object.fromEntries(
        Object.entries(state.messages).map(([conversationId, messages]) => [
          conversationId,
          messages.map((message) =>
            message.sender_id === profile.id
              ? { ...message, sender: profile }
              : message,
          ),
        ]),
      ),
    }));
  },

  reset: () => set({ ...initialState }),
}));
