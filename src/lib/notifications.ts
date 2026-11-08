let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

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
