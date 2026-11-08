import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { getAuthInstance, markPresenceOffline } from '../lib/firebase';
import {
  claimUsername,
  patchUserDoc,
  readUserDocOnce,
  releaseUsername,
  writeUserDoc,
} from '../lib/chatApi';
import { getErrorMessage } from '../lib/errors';
import { normalizeUsername, validateDisplayName, validateUsername } from '../lib/validation';
import { mapProfile, type Profile, type UserDoc } from '../types/chat';
import { useChatStore } from './chatStore';

interface AuthState {
  session: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    username: string;
    displayName: string;
  }) => Promise<{ needsVerification: boolean }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: (force?: boolean) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  setProfile: (profile: Profile) => void;
}

let authSubscription: { unsubscribe: () => void } | null = null;
let initPromise: Promise<void> | null = null;
let hydratePromise: Promise<void> | null = null;
let hydrateUserId: string | null = null;

async function fetchProfileWithRetry(userId: string): Promise<Profile | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const doc = await readUserDocOnce(userId);
      if (doc) {
        return mapProfile(userId, doc);
      }
    } catch (error) {
      if (attempt === 2) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
  return null;
}

function usernameFromEmail(email: string | null, fallback: string): string {
  const base = (email?.split('@')[0] || fallback || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
  return base.length >= 3 ? base : `${base || 'user'}${String(Date.now()).slice(-4)}`;
}

async function createProfileForUser(
  user: User,
  preferredUsername?: string,
  preferredDisplayName?: string,
): Promise<Profile> {
  const now = new Date().toISOString();
  const displayName =
    (preferredDisplayName?.trim() || user.displayName || usernameFromEmail(user.email, 'user')).slice(0, 60) ||
    'ALLXCHAT user';
  const baseUsername = preferredUsername
    ? normalizeUsername(preferredUsername)
    : usernameFromEmail(user.email, user.displayName || 'user');
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const username =
      attempt === 0
        ? baseUsername
        : `${baseUsername.slice(0, 25)}_${String(Math.floor(1000 + Math.random() * 9000))}`;
    const usernameError = validateUsername(username);
    if (usernameError) {
      lastError = new Error(usernameError);
      continue;
    }
    try {
      const claimed = await claimUsername(username, user.uid);
      if (!claimed) throw new Error('That username is already taken.');
      const profile: UserDoc = {
        username,
        displayName,
        avatarUrl: user.photoURL || null,
        about: 'Hey there! I am using ALLXCHAT.',
        isOnline: false,
        lastSeen: now,
        createdAt: now,
        updatedAt: now,
      };
      await writeUserDoc(user.uid, profile);
      return mapProfile(user.uid, profile);
    } catch (error) {
      lastError = error;
      if ((error as Error)?.message === 'That username is already taken.') continue;
    }
  }
  throw new Error(getErrorMessage(lastError, 'Unable to create your profile.'));
}

async function ensureProfile(user: User): Promise<Profile> {
  const existing = await fetchProfileWithRetry(user.uid);
  if (existing) return existing;
  return createProfileForUser(user);
}

async function hydrateProfile(
  userId: string,
  set: (partial: Partial<AuthState>) => void,
  get: () => AuthState,
  force = false,
): Promise<void> {
  if (!force && get().profile?.id === userId) {
    set({ loading: false });
    return;
  }
  if (hydratePromise && hydrateUserId === userId) return hydratePromise;
  hydrateUserId = userId;
  hydratePromise = (async () => {
    set({ loading: true, error: null });
    try {
      let profile = await fetchProfileWithRetry(userId);
      if (get().session?.uid && get().session?.uid !== userId) return;
      if (!profile && get().session?.uid === userId) {
        profile = await ensureProfile(get().session as User);
      }
      if (!profile) {
        set({
          profile: null,
          loading: false,
          error: 'Your profile is still being prepared. Please refresh in a moment.',
        });
        return;
      }
      set({ profile, loading: false, error: null });
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error, 'Unable to load your profile.') });
    } finally {
      hydratePromise = null;
      hydrateUserId = null;
    }
  })();
  return hydratePromise;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  initialized: false,
  error: null,

  initialize: async () => {
    if (get().initialized) return;
    set({ initialized: true, loading: true });
    const { isFirebaseConfigured, missingEnvHint } = await import('../lib/env').catch(() => ({ isFirebaseConfigured: true, missingEnvHint: '' }));
    if (!isFirebaseConfigured) {
      set({ initialized: true, loading: false, error: missingEnvHint });
      return;
    }
    const auth = getAuthInstance();

    if (!authSubscription) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        set({ session: user });
        if (!user) {
          set({ profile: null, loading: false, error: null });
          useChatStore.getState().reset();
          return;
        }
        void hydrateProfile(user.uid, set, get);
      });
      authSubscription = { unsubscribe };
    }

    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        const user = auth.currentUser;
        set({ session: user });
        if (user) await hydrateProfile(user.uid, set, get);
        else set({ loading: false });
      } catch (error) {
        set({ loading: false, error: getErrorMessage(error, 'Unable to restore your session.') });
      } finally {
        initPromise = null;
      }
    })();
    return initPromise;
  },

  signIn: async (email, password) => {
    set({ error: null });
    const auth = getAuthInstance();
    const normalizedEmail = email.trim().toLowerCase();
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    await credential.user.reload();
    if (!credential.user.emailVerified) {
      await firebaseSignOut(auth);
      throw new Error('Please verify your email before signing in.');
    }
    set({ session: credential.user });
    await hydrateProfile(credential.user.uid, set, get, true);
  },

  signUp: async ({ email, password, username, displayName }) => {
    const normalizedUsername = normalizeUsername(username);
    const usernameError = validateUsername(normalizedUsername);
    if (usernameError) throw new Error(usernameError);
    const nameError = validateDisplayName(displayName);
    if (nameError) throw new Error(nameError);

    const auth = getAuthInstance();
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const user = credential.user;
    const now = new Date().toISOString();
    const profile: UserDoc = {
      username: normalizedUsername,
      displayName: displayName.trim(),
      avatarUrl: null,
      about: 'Hey there! I am using ALLXCHAT.',
      isOnline: false,
      lastSeen: now,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const claimed = await claimUsername(normalizedUsername, user.uid);
      if (!claimed) throw new Error('That username is already taken.');
      await writeUserDoc(user.uid, profile);
    } catch (error) {
      await user.delete().catch(() => undefined);
      await firebaseSignOut(auth).catch(() => undefined);
      throw error;
    }

    await sendEmailVerification(user, {
      url: `${window.location.origin}/auth/callback`,
      handleCodeInApp: true,
    });
    set({ session: user });
    await hydrateProfile(user.uid, set, get, true);
    return { needsVerification: !user.emailVerified };
  },

  signInWithGoogle: async () => {
    set({ error: null });
    const auth = getAuthInstance();
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    const user = credential.user;
    await user.reload();
    set({ session: user });

    const existing = await fetchProfileWithRetry(user.uid);
    if (existing) {
      await hydrateProfile(user.uid, set, get, true);
      return;
    }

    try {
      await createProfileForUser(user);
    } catch (error) {
      await firebaseSignOut(auth).catch(() => undefined);
      throw new Error(getErrorMessage(error, 'Unable to create your profile.'));
    }
    await hydrateProfile(user.uid, set, get, true);
  },

  signOut: async () => {
    const auth = getAuthInstance();
    const userId = get().profile?.id || get().session?.uid;
    if (userId) {
      await markPresenceOffline(userId);
    }
    await firebaseSignOut(auth);
    set({ session: null, profile: null, loading: false, error: null });
    useChatStore.getState().reset();
  },

  refreshProfile: async (force = true) => {
    const userId = get().session?.uid;
    if (!userId) return;
    await hydrateProfile(userId, set, get, force);
  },

  updateProfile: async (updates) => {
    const userId = get().profile?.id;
    if (!userId) throw new Error('You are not signed in.');

    if (updates.username !== undefined) {
      const normalized = normalizeUsername(updates.username);
      const validation = validateUsername(normalized);
      if (validation) throw new Error(validation);
      updates = { ...updates, username: normalized };
    }
    if (updates.display_name !== undefined) {
      const validation = validateDisplayName(updates.display_name);
      if (validation) throw new Error(validation);
      updates = { ...updates, display_name: updates.display_name.trim() };
    }

    const current = get().profile;
    let usernameUpdated = false;
    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.username !== undefined && updates.username !== current?.username) {
      const nextUsername = updates.username;
      const claimed = await claimUsername(nextUsername, userId);
      if (!claimed) throw new Error('That username is already taken.');
      patch.username = nextUsername;
      usernameUpdated = true;
    }

    if (updates.display_name !== undefined) patch.displayName = updates.display_name;
    if (updates.avatar_url !== undefined) patch.avatarUrl = updates.avatar_url;
    if (updates.about !== undefined) patch.about = updates.about;
    if (updates.is_online !== undefined) patch.isOnline = updates.is_online;
    if (updates.last_seen !== undefined) patch.lastSeen = updates.last_seen;
    void usernameUpdated;

    await patchUserDoc(userId, patch);
    if (
      updates.username !== undefined &&
      updates.username !== current?.username
    ) {
      if (current?.username) {
        await releaseUsername(current.username).catch(() => undefined);
      }
    }

    const refreshed = await fetchProfileWithRetry(userId);
    if (!refreshed) throw new Error('Unable to load your updated profile.');
    set({ profile: refreshed });
    useChatStore.getState().replaceProfile(refreshed);
  },

  setProfile: (profile) => set({ profile }),
}));
