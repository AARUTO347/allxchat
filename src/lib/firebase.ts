import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database as RtdbDatabase } from 'firebase/database';
import type { Analytics } from 'firebase/analytics';
import { ref, set, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'allxchat-12a8b.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'allxchat-12a8b',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'allxchat-12a8b.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '957810935774',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:957810935774:web:dca862433fdfacc386ff4f',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-XCCD1MXJ38',
  databaseURL:
    'https://allxchat-12a8b-default-rtdb.asia-southeast1.firebasedatabase.app',
};

export const missingFirebaseKeys: string[] = [
  !firebaseConfig.apiKey && 'VITE_FIREBASE_API_KEY',
  !firebaseConfig.authDomain && 'VITE_FIREBASE_AUTH_DOMAIN',
  !firebaseConfig.projectId && 'VITE_FIREBASE_PROJECT_ID',
  !firebaseConfig.storageBucket && 'VITE_FIREBASE_STORAGE_BUCKET',
  !firebaseConfig.messagingSenderId && 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  !firebaseConfig.appId && 'VITE_FIREBASE_APP_ID',
].filter(Boolean) as string[];

if (missingFirebaseKeys.length) {
  console.warn(
    `[firebase] Missing env vars: ${missingFirebaseKeys.join(', ')}. ` +
      'On Netlify, set these in Site settings → Environment variables and redeploy. ' +
      `Expected project: allxchat-12a8b, authDomain: allxchat-12a8b.firebaseapp.com`
  );
}

let firebaseApp: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }
  return firebaseApp;
}

export function getAuthInstance(): Auth {
  return getAuth(getFirebaseApp());
}

export function getRtdb(): RtdbDatabase {
  return getDatabase(getFirebaseApp());
}

export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (analytics) return analytics;
  if (!firebaseConfig.appId || !firebaseConfig.measurementId) return null;
  if (!analyticsPromise) {
    analyticsPromise = (async () => {
      try {
        // Dynamic import: analytics ships in its own chunk, loaded lazily
        // after app start instead of blocking the initial bundle.
        const { getAnalytics, isSupported } = await import('firebase/analytics');
        if (await isSupported()) {
          analytics = getAnalytics(getFirebaseApp());
        }
      } catch {
        analytics = null;
      }
      return analytics;
    })();
  }
  return analyticsPromise;
}

export async function markPresenceOffline(userId: string): Promise<void> {
  const now = new Date().toISOString();
  try {
    await set(ref(getRtdb(), `presence/${userId}`), {
      isOnline: false,
      displayName: null,
      lastSeen: now,
      updatedAt: Date.now(),
    });
  } catch {
    // Presence cleanup is best effort.
  }
  try {
    await update(ref(getRtdb(), `users/${userId}`), {
      isOnline: false,
      lastSeen: now,
      updatedAt: now,
    });
  } catch {
    // Profile cleanup is best effort during unload/sign-out.
  }
}
