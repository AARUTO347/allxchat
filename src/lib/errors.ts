interface ErrorLike {
  message?: string;
  code?: string;
  status?: number;
  error_description?: string;
  name?: string;
}

const MESSAGE_MAP: Record<string, string> = {
  'Invalid login credentials': 'Email or password is incorrect.',
  'Email not confirmed': 'Please verify your email before signing in.',
  'User already registered': 'An account with this email already exists.',
  'Password should be at least 6 characters': 'Password must be at least 8 characters.',
  'New password should be different from the old password':
    'Choose a password different from your current one.',
  'Email rate limit exceeded': 'Too many emails requested. Please wait a moment and try again.',
  'For security purposes, you can only request this after 60 seconds.':
    'Please wait a moment before requesting another email.',
  'Auth session missing!': 'Your session has expired. Please sign in again.',
  'JWT expired': 'Your session has expired. Please sign in again.',
  'Invalid Refresh Token: Refresh Token Not Found': 'Your session has expired. Please sign in again.',
  'Firebase: Error (auth/configuration-not-found).':
    'Firebase Auth is not configured for this project. Enable Email/Password in Firebase Console → Authentication → Sign-in method.',
  'Firebase: Error (auth/operation-not-allowed).':
    'Email/Password sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.',
  'Firebase: Error (auth/api-key-not-valid).':
    'The Firebase API key is not valid. Check your VITE_FIREBASE_* values and rebuild.',
  'Firebase: Error (auth/unauthorized-domain).':
    'This domain is not authorized in Firebase Console → Authentication → Settings → Authorized domains.',
  'Firebase: Error (auth/internal-error).':
    'Firebase Auth failed with an internal error. Check that Authentication is enabled in Firebase Console → Authentication, that this domain is in Authorized domains, and that your VITE_FIREBASE_* values match this project.',
  'Firebase: Error (auth/invalid-credential).':
    'Email or password is incorrect — or this account does not exist yet. If you are new here, create an account first, then verify your email.',
  'Firebase: Error (auth/user-not-found).':
    'Email or password is incorrect — or this account does not exist yet. If you are new here, create an account first.',
  'Firebase: Error (auth/wrong-password).':
    'Email or password is incorrect.',
  'Firebase: Error (auth/invalid-email).':
    'That email address is not valid.',
  'Firebase: Error (auth/too-many-requests).':
    'Too many attempts. Wait a few minutes and try again.',
  'Firebase: Error (auth/user-disabled).':
    'This account has been disabled. Contact support.',
  'Firebase: Error (auth/invalid-api-key).':
    'The Firebase API key is not valid. Check your VITE_FIREBASE_* values and rebuild.',
  'Firebase: Error (auth/cancelled-popup-request).':
    'Google sign-in was cancelled before it finished.',
  'Firebase: Error (auth/popup-blocked).':
    'The Google sign-in popup was blocked. Allow popups for this site and retry.',
  'Firestore API has not been used': 'Cloud Firestore is not enabled for this project. Enable it at the Firestore API activation link, then retry.',
  'The database (default) does not exist': 'Firestore is enabled, but the default database does not exist yet. Create it in Firebase Console → Firestore Database.',
  'Missing or insufficient permissions': 'Firestore denied this read/write. Deploy the Firestore security rules included in this project.',
  'Failed to fetch': 'Unable to reach the server. Check your connection and try again.',
  'Load failed': 'Unable to reach the server. Check your connection and try again.',
  'NetworkError when attempting to fetch resource.':
    'Unable to reach the server. Check your connection and try again.',
};

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return MESSAGE_MAP[error] || error;
  const candidate = error as ErrorLike;
  const message = candidate.message || candidate.error_description || '';
  if (message && MESSAGE_MAP[message]) return MESSAGE_MAP[message];
  // Firebase fires by code too (e.g. auth/internal-error) even when the
  // stringified message drifts between SDK versions — map by code first.
  const code = (candidate.code || '').toLowerCase();
  if (code.includes('internal-error'))
    return 'Firebase Auth failed with an internal error. Check that Authentication is enabled in Firebase Console → Authentication, that this domain is in Authorized domains, and that your VITE_FIREBASE_* values match this project.';
  if (code.includes('unauthorized-domain'))
    return 'This domain is not authorized in Firebase Console → Authentication → Settings → Authorized domains. Add your production domain (and localhost is allowed by default).';
  if (code.includes('operation-not-allowed'))
    return 'Email/Password sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.';
  if (code.includes('api-key-not-valid') || code.includes('invalid-api-key'))
    return 'The Firebase API key is not valid. Check your VITE_FIREBASE_* values and rebuild. On Netlify, env vars must be set in Site settings → Environment variables.';
  if (code.includes('configuration-not-found'))
    return 'Firebase Auth is not configured for this project. Enable Email/Password in Firebase Console → Authentication → Sign-in method.';
  if (code.includes('popup-blocked'))
    return 'The Google sign-in popup was blocked. Allow popups for this site and retry.';
  if (code.includes('cancelled-popup-request'))
    return 'Google sign-in was cancelled before it finished.';
  if (code.includes('network-request-failed'))
    return 'Unable to reach the server. Check your connection and try again.';
  if (code.includes('invalid-credential') || code.includes('user-not-found') || code.includes('wrong-password'))
    return 'Email or password is incorrect — or this account does not exist yet. If you are new here, create an account first, then verify your email.';
  if (code.includes('invalid-email'))
    return 'That email address is not valid.';
  if (code.includes('too-many-requests'))
    return 'Too many attempts. Wait a few minutes and try again.';
  if (code.includes('user-disabled'))
    return 'This account has been disabled. Contact support.';
  if (code.includes('requires-recent-login'))
    return 'For security, please sign in again.';
  if (candidate.code === '23505') return 'That value is already in use.';
  if (candidate.code === '23503') return 'This item is no longer available.';
  if (candidate.code === '42501' || message.toLowerCase().includes('row-level security')) {
    return 'You do not have permission to perform this action.';
  }
  if (message.toLowerCase().includes('duplicate key')) return 'That value is already in use.';
  if (message) return message;
  return fallback;
}

export function isOfflineError(error: unknown): boolean {
  const message = getErrorMessage(error, '').toLowerCase();
  return message.includes('unable to reach') || message.includes('network');
}
