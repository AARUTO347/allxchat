import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchMessages, markMessagesRead, MESSAGE_PAGE_SIZE } from '../lib/chatApi';
import { getErrorMessage } from '../lib/errors';
import { useChatStore } from '../stores/chatStore';

export function useMessages(conversationId: string | null): {
  loadOlder: () => Promise<void>;
  reload: () => void;
} {
  const syncVersion = useChatStore((state) => state.syncVersion);
  const [reloadNonce, setReloadNonce] = useState(0);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  const loadOlderRef = useRef(false);
  const lastReadRef = useRef<Record<string, number>>({});

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const conversation = conversationId;
    const request = ++requestRef.current;
    const store = useChatStore.getState();
    store.setLoadingMessages(conversation, true);
    store.setMessagesError(conversation, null);

    void (async () => {
      try {
        const messages = await fetchMessages(conversation);
        if (!mountedRef.current || request !== requestRef.current) return;
        const pending = (useChatStore.getState().messages[conversation] || []).filter(
          (message) => message.pending || message.failed,
        );
        useChatStore.getState().setMessages(
          conversation,
          [...messages, ...pending],
          messages.length >= MESSAGE_PAGE_SIZE,
        );
      } catch (error) {
        if (!mountedRef.current || request !== requestRef.current) return;
        const message = getErrorMessage(error, 'Unable to load messages.');
        useChatStore.getState().setMessagesError(conversation, message);
        toast.error(message);
      } finally {
        if (mountedRef.current && request === requestRef.current) {
          useChatStore.getState().setLoadingMessages(conversation, false);
        }
      }
    })();
  }, [conversationId, syncVersion, reloadNonce]);

  useEffect(() => {
    if (!conversationId) return;
    let active = true;

    const markRead = () => {
      if (!active || document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - (lastReadRef.current[conversationId] || 0) < 1500) return;
      lastReadRef.current[conversationId] = now;
      void markMessagesRead(conversationId)
        .then(() => {
          if (active) useChatStore.getState().clearUnread(conversationId);
        })
        .catch(() => {
          // Read receipts are retried on the next focus or incoming message.
        });
    };

    markRead();
    document.addEventListener('visibilitychange', markRead);
    window.addEventListener('focus', markRead);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', markRead);
      window.removeEventListener('focus', markRead);
    };
  }, [conversationId, syncVersion]);

  useEffect(() => {
    loadOlderRef.current = false;
  }, [conversationId]);

  const loadOlder = useCallback(async () => {
    if (!conversationId || loadOlderRef.current) return;
    const state = useChatStore.getState();
    if (state.loadingOlder[conversationId] || state.hasMore[conversationId] === false) return;

    const current = state.messages[conversationId] || [];
    const oldest = current.find((message) => !message.pending && !message.failed);
    if (!oldest) return;

    loadOlderRef.current = true;
    state.setLoadingOlder(conversationId, true);
    const before = oldest.created_at;
    try {
      const older = await fetchMessages(conversationId, before);
      useChatStore
        .getState()
        .prependMessages(conversationId, older, older.length >= MESSAGE_PAGE_SIZE);
    } catch (error) {
      useChatStore.getState().setLoadingOlder(conversationId, false);
      toast.error(getErrorMessage(error, 'Unable to load older messages.'));
    } finally {
      loadOlderRef.current = false;
    }
  }, [conversationId]);

  const reload = useCallback(() => {
    setReloadNonce((value) => value + 1);
  }, []);

  return { loadOlder, reload };
}
