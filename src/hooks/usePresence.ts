import { useEffect, useRef } from 'react';
import { onValue, ref, set, update } from 'firebase/database';
import { getRtdb, markPresenceOffline } from '../lib/firebase';
import { useChatStore } from '../stores/chatStore';
import type { PresenceMap, Profile } from '../types/chat';

export function usePresence(profile: Profile): void {
  const profileRef = useRef(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    let disposed = false;
    const rtdb = getRtdb();
    const presenceRef = ref(rtdb, `presence/${profile.id}`);

    const updateHeartbeat = async () => {
      try {
        await update(ref(rtdb, `users/${profile.id}`), {
          isOnline: true,
          lastSeen: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Presence is best effort and retried by the next heartbeat.
      }
    };

    const connectedRef = ref(rtdb, '.info/connected');
    const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
      if (disposed || snapshot.val() !== true) return;
      void set(presenceRef, {
        isOnline: true,
        displayName: profile.display_name,
        lastSeen: new Date().toISOString(),
        updatedAt: Date.now(),
      });
      void updateHeartbeat();
    });

    const unsubscribePresence = onValue(ref(rtdb, 'presence'), (snapshot) => {
      if (disposed) return;
      const value = snapshot.val() as Record<string, {
        isOnline?: boolean;
        displayName?: string;
        lastSeen?: string;
        updatedAt?: number;
      }> | null;
      const next: PresenceMap = {};
      if (value) {
        Object.entries(value).forEach(([userId, item]) => {
          if (!item?.isOnline) return;
          next[userId] = {
            user_id: userId,
            display_name: item.displayName,
            online_at: item.lastSeen || new Date().toISOString(),
          };
        });
      }
      useChatStore.getState().setPresence(next);
    });

    void updateHeartbeat();
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible') void updateHeartbeat();
    }, 45_000);

    const handleVisible = () => {
      if (document.visibilityState === 'visible') void updateHeartbeat();
    };
    document.addEventListener('visibilitychange', handleVisible);

    const handlePageHide = () => {
      void markPresenceOffline(profile.id);
    };
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      disposed = true;
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('pagehide', handlePageHide);
      unsubscribeConnected();
      unsubscribePresence();
      void markPresenceOffline(profile.id);
      useChatStore.getState().setPresence({});
    };
  }, [profile.display_name, profile.id]);
}
