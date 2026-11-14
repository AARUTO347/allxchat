import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { markMessagesDelivered, markMessagesRead, subscribeToConversationIds, subscribeToMessages } from '../lib/chatApi';
import { showMessageNotification } from '../lib/notifications';
import { playIncomingSound } from '../lib/sounds';
import { previewFromMessage } from '../lib/utils';
import { useChatStore } from '../stores/chatStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { Profile } from '../types/chat';

interface Options {
  profile: Profile;
  activeConversationId: string | null;
  refreshConversations: (options?: { silent?: boolean }) => Promise<void>;
}

export function useChatRealtime({
  profile,
  activeConversationId,
  refreshConversations,
}: Options): void {
  const navigate = useNavigate();
  const activeIdRef = useRef<string | null>(activeConversationId);
  const profileRef = useRef(profile);
  const refreshTimerRef = useRef<number | null>(null);
  const ackTimersRef = useRef<Map<string, number>>(new Map());
  const seenMessageIdsRef = useRef<Record<string, Set<string>>>({});

  useEffect(() => {
    activeIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    let disposed = false;
    const unsubscribers: Array<() => void> = [];

    const store = useChatStore.getState();
    store.setRealtimeStatus('connecting');

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        void refreshConversations({ silent: true });
      }, 280);
    };

    const scheduleAck = (conversationId: string, markRead: boolean) => {
      const existing = ackTimersRef.current.get(conversationId);
      if (existing) window.clearTimeout(existing);
      const timer = window.setTimeout(() => {
        ackTimersRef.current.delete(conversationId);
        if (markRead) {
          void markMessagesRead(conversationId)
            .then(() => useChatStore.getState().clearUnread(conversationId))
            .catch(() => undefined);
        } else {
          void markMessagesDelivered(conversationId).catch(() => undefined);
        }
      }, markRead ? 220 : 850);
      ackTimersRef.current.set(conversationId, timer);
    };

    function handleIncomingMessages(
      conversationId: string,
      messages: Array<{
        id: string;
        sender_id: string | null;
        content: string | null;
        message_type: string;
        file_name: string | null;
        sender?: Profile | null;
      }>,
    ) {
      const seen = seenMessageIdsRef.current[conversationId] || new Set<string>();
      const newMessages = messages.filter((message) => !seen.has(message.id));
      if (newMessages.length === 0) return;
      newMessages.forEach((message) => seen.add(message.id));
      seenMessageIdsRef.current[conversationId] = seen;

      const currentProfile = profileRef.current;
      const conversation = useChatStore
        .getState()
        .conversations.find((item) => item.id === conversationId);
      const isActive =
        activeIdRef.current === conversationId && document.visibilityState === 'visible';

      for (const message of newMessages) {
        const isMine = message.sender_id === currentProfile.id;
        if (isMine) continue;

        if (useSettingsStore.getState().sounds) playIncomingSound();
        const senderName = message.sender?.display_name || 'New message';
        if (document.visibilityState === 'hidden' && useSettingsStore.getState().notifications) {
          const title = conversation?.is_group
            ? `${senderName} · ${conversation.title || 'Group'}`
            : senderName;
          void showMessageNotification({
            title,
            body: previewFromMessage(message.content, message.message_type, message.file_name),
            conversationId,
            onClick: () => {
        const base = import.meta.env.BASE_URL || '/';
        navigate(`${base}chat/${conversationId}`.replace(/\/+/g, '/'));
      },
          });
        }
      }

      if (newMessages.some((message) => message.sender_id !== currentProfile.id)) {
        if (isActive) {
          useChatStore.getState().clearUnread(conversationId);
          scheduleAck(conversationId, true);
        } else {
          scheduleAck(conversationId, false);
        }
      }
      scheduleRefresh();
      // Refresh the active conversation's message list so new messages appear
      // without requiring a manual page reload.
      if (isActive) {
        useChatStore.getState().bumpSyncVersion();
      }
    }

    const previousConversationIds = new Set<string>();
    unsubscribers.push(
      subscribeToConversationIds(
        profile.id,
        (ids) => {
          if (disposed) return;
          useChatStore.getState().setRealtimeStatus('connected');
          useChatStore.getState().bumpSyncVersion();
          ids.forEach((id) => previousConversationIds.add(id));
          previousConversationIds.forEach((id) => {
            if (!ids.includes(id)) {
              useChatStore.getState().removeConversation(id);
              if (activeIdRef.current === id) navigate('/chat');
              previousConversationIds.delete(id);
            }
          });
          // Set up message listeners for any new conversations immediately
          syncMessageListeners();
          scheduleRefresh();
        },
        () => {
          if (!disposed) {
            useChatStore.getState().setRealtimeStatus('disconnected');
          }
        },
      ),
    );

    const syncMessageListeners = () => {
      const conversationIds = useChatStore.getState().conversations.map((item) => item.id);
      conversationIds.forEach((conversationId) => {
        if (messageListeners.has(conversationId)) return;
        const unsubscribe = subscribeToMessages(
          conversationId,
          (messages) => {
            if (disposed) return;
            handleIncomingMessages(conversationId, messages);
          },
        );
        messageListeners.set(conversationId, unsubscribe);
      });
    };

    const messageListeners = new Map<string, () => void>();
    const initialSync = window.setTimeout(syncMessageListeners, 600);
    const syncInterval = window.setInterval(syncMessageListeners, 5000);

    const handleOnline = () => {
      useChatStore.getState().setRealtimeStatus('connecting');
      void refreshConversations({ silent: true });
      useChatStore.getState().bumpSyncVersion();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      disposed = true;
      window.clearTimeout(initialSync);
      window.clearInterval(syncInterval);
      window.removeEventListener('online', handleOnline);
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      messageListeners.forEach((unsubscribe) => unsubscribe());
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      for (const timer of ackTimersRef.current.values()) window.clearTimeout(timer);
      ackTimersRef.current.clear();
    };
  }, [navigate, profile.id, refreshConversations]);
}
