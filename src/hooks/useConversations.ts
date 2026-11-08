import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { fetchConversationSummaries } from '../lib/chatApi';
import { getErrorMessage } from '../lib/errors';
import { useChatStore } from '../stores/chatStore';

interface RefreshOptions {
  silent?: boolean;
}

export function useConversations(profileId: string | null): {
  refresh: (options?: RefreshOptions) => Promise<void>;
} {
  const setConversations = useChatStore((state) => state.setConversations);
  const setConversationsLoading = useChatStore((state) => state.setConversationsLoading);
  const setConversationsError = useChatStore((state) => state.setConversationsError);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  const refresh = useCallback(
    async (options: RefreshOptions = {}) => {
      if (!profileId) return;
      const request = ++requestRef.current;
      if (!options.silent) {
        setConversationsLoading(true);
        setConversationsError(null);
      }
      try {
        const conversations = await fetchConversationSummaries();
        if (!mountedRef.current || request !== requestRef.current) return;
        setConversations(conversations);
      } catch (error) {
        if (!mountedRef.current || request !== requestRef.current) return;
        const message = getErrorMessage(error, 'Unable to load your conversations.');
        setConversationsLoading(false);
        setConversationsError(message);
        if (!options.silent) toast.error(message);
      }
    },
    [
      profileId,
      setConversations,
      setConversationsError,
      setConversationsLoading,
    ],
  );

  useEffect(() => {
    mountedRef.current = true;
    if (!profileId) return () => undefined;
    void refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [profileId, refresh]);

  return { refresh };
}
