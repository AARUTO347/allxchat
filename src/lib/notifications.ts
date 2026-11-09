let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output.buffer as ArrayBuffer;
}

export function isPushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC_KEY);
}

export async function subscribePush(userId: string): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY) return false;
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return false;
    const registration = await registerServiceWorker();
    if (!registration?.pushManager) return false;
    const existing = await registration.pushManager.getSubscription();
    if (existing) return true;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const { getDatabase, ref, set } = await import('firebase/database');
    const { getFirebaseApp } = await import('../lib/firebase');
    const db = getDatabase(getFirebaseApp());
    await set(ref(db, `pushSubscriptions/${userId}/${subscription.endpoint}`), {
      endpoint: subscription.endpoint,
      p256dh: subscription.toJSON().keys?.p256dh ?? null,
      auth: subscription.toJSON().keys?.auth ?? null,
      expirationTime: subscription.expirationTime ?? null,
      createdAt: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function unsubscribePush(userId: string): Promise<void> {
  try {
    const registration = await registerServiceWorker();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    const { getDatabase, ref, remove, get } = await import('firebase/database');
    const { getFirebaseApp } = await import('../lib/firebase');
    const db = getDatabase(getFirebaseApp());
    const snap = await get(ref(db, `pushSubscriptions/${userId}`));
    if (snap.exists()) {
      const entries = snap.val() as Record<string, unknown>;
      for (const key of Object.keys(entries)) {
        await remove(ref(db, `pushSubscriptions/${userId}/${key}`)).catch(() => undefined);
      }
    }
  } catch {
    // best effort
  }
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .catch(() => null);
  }
  return registrationPromise;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

interface ShowNotificationOptions {
  title: string;
  body: string;
  conversationId: string;
  icon?: string;
  onClick?: () => void;
}

export async function showMessageNotification({
  title,
  body,
  conversationId,
  icon = '/icon-192.png',
  onClick,
}: ShowNotificationOptions): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const url = `/chat/${conversationId}`;

  try {
    const registration = await registerServiceWorker();
    if (registration && 'showNotification' in registration) {
      await registration.showNotification(title, {
        body,
        icon,
        badge: icon,
        tag: `allxchat-${conversationId}`,
        silent: true,
        data: { url },
      });
      return;
    }
  } catch {
    // Fall through to the page-level Notification API.
  }

  try {
    const notification = new Notification(title, {
      body,
      icon,
      tag: `allxchat-${conversationId}`,
      silent: true,
      data: { url },
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };
  } catch {
    // The browser may require a service worker; notification support is optional.
  }
}
