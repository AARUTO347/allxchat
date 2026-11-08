const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
const firebaseAppId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;

export const isFirebaseConfigured = Boolean(
  firebaseApiKey && firebaseProjectId && firebaseAppId,
);

export const missingEnvHint =
  'Firebase is not configured. Set all VITE_FIREBASE_* variables (matching project allxchat-12a8b) in Netlify Site settings → Environment variables and redeploy, or in .env.local for local dev.';

export const appName = 'ALLXCHAT';
