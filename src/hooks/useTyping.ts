import { useCallback, useEffect, useRef, useState } from 'react';
import { onValue, ref, set, remove } from 'firebase/database';
import { getRtdb } from '../lib/firebase';
import type { Profile } from '../types/chat';

interface TypingUser {
  id: string;
  name: string;
}

const TYPING_TTL_MS = 4000;

export function useTyping(
  conversationId: string | null,
  profile: Profile | null,
): {
  typingUsers: TypingUser[];
  notifyTyping: () => void;
  stopTyping: () => void;
} {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());
  const lastSentRef = useRef(0);
  const stopTimerRef = useRef<number | null>(null);
  const profileRef = useRef(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const typingRef = useCallback(() => {
    if (!conversationId || !profileRef.current) return null;
    return ref(getRtdb(), `typing/${conversationId}/${profileRef.current.id}`);
  }, [conversationId]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      const node = typingRef();
      if (!node) return;
      if (isTyping) {
        void set(node, {
          displayName: profileRef.current?.display_name || 'Someone',
          updatedAt: Date.now(),
        }).catch(() => undefined);
      } else {
        void remove(node).catch(() => undefined);
      }
    },
    [typingRef],
  );

  const stopTyping = useCallback(() => {
    lastSentRef.current = 0;
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    sendTyping(false);
  }, [sendTyping]);

  const notifyTyping = useCallback(() => {
    if (!conversationId || !profileRef.current) return;
    const now = Date.now();
    if (now - lastSentRef.current < 1300) return;
    lastSentRef.current = now;
    sendTyping(true);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = window.setTimeout(() => {
      lastSentRef.current = 0;
      sendTyping(false);
    }, 2800);
  }, [conversationId, sendTyping]);

  useEffect(() => {
    setTypingUsers([]);
    if (!conversationId || !profile) return;
    const timers = timersRef.current;
    const typingNode = ref(getRtdb(), `typing/${conversationId}`);
    const unsubscribe = onValue(typingNode, (snapshot) => {
      const value = snapshot.val() as Record<string, {
        displayName?: string;
        updatedAt?: number;
      }> | null;
      const now = Date.now();
      const next: TypingUser[] = [];
      if (value) {
        Object.entries(value).forEach(([userId, item]) => {
          if (userId === profile.id) return;
          if (typeof item?.updatedAt === 'number' && now - item.updatedAt > TYPING_TTL_MS) return;
          next.push({ id: userId, name: item?.displayName || 'Someone' });
        });
      }
      setTypingUsers(next);
    });

    return () => {
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      sendTyping(false);
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
      setTypingUsers([]);
      unsubscribe();
    };
    // sendTyping is intentionally omitted; it is stable for the active profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, profile?.id]);

  return { typingUsers, notifyTyping, stopTyping };
}
