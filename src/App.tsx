import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AlertTriangle, Database, ExternalLink, LogOut, RefreshCw } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingScreen } from './components/ui/Primitives';
import { Logo } from './components/ui/Logo';

// Route-level code splitting: each page ships in its own chunk and only
// loads when its route is visited, keeping the main bundle lean.
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then((m) => ({ default: m.SignupPage })));
const VerifyEmailPage = lazy(() =>
  import('./pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const AuthCallbackPage = lazy(() =>
  import('./pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })),
);
const ChatPage = lazy(() => import('./pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const AiPage = lazy(() => import('./pages/AiPage').then((m) => ({ default: m.AiPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
import { useAuthStore } from './stores/authStore';
import { useTheme } from './hooks/useTheme';
import { isFirebaseConfigured } from './lib/env';
import { registerServiceWorker } from './lib/notifications';
import { unlockAudio } from './lib/sounds';
import { initFirebaseAnalytics } from './lib/firebase';
import { useSettingsStore } from './stores/settingsStore';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const signOut = useAuthStore((state) => state.signOut);

  if (loading) return <LoadingScreen label="Restoring your secure session…" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!session.emailVerified) {
    return <Navigate to={`/verify-email?email=${encodeURIComponent(session.email || '')}`} replace />;
  }
  if (!profile) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-[#f0f2f5] px-6 text-center dark:bg-[#0b141a]">
        <Logo size={52} />
        <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={26} />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-[#111b21] dark:text-[#e9edef]">
          Profile setup needs a moment
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#667781] dark:text-[#8696a0]">
          {error || 'We could not load your profile yet. This usually resolves after a refresh.'}
        </p>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={() => void refreshProfile(true)} className="btn-primary">
            <RefreshCw size={16} />
            Try again
          </button>
          <button type="button" onClick={() => void signOut()} className="btn-secondary">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function AppBootstrap() {
  const initialize = useAuthStore((state) => state.initialize);
  const theme = useSettingsStore((state) => state.theme);
  useTheme();

  useEffect(() => {
    void initialize();
    void initFirebaseAnalytics();
    void registerServiceWorker();
    const unlock = () => void unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [initialize]);

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3800,
        style:
          theme === 'dark'
            ? { background: '#202c33', color: '#e9edef', border: '1px solid rgba(255,255,255,0.08)' }
            : { background: '#ffffff', color: '#111b21', border: '1px solid rgba(17,27,33,0.08)' },
        success: { iconTheme: { primary: '#00a884', secondary: '#ffffff' } },
      }}
    />
  );
}

function ConfigPage() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center bg-[#f0f2f5] px-6 text-center dark:bg-[#0b141a]">
      <Logo size={54} />
      <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
        <Database size={26} />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-[#111b21] dark:text-[#e9edef]">
        Connect your Firebase project
      </h1>
      <p className="mt-2 max-w-lg text-sm leading-6 text-[#667781] dark:text-[#8696a0]">
        Add your Firebase web config values to your environment, then rebuild. Deploy the Firestore, Storage,
        and Realtime Database rules included in this repository before using the app.
      </p>
      <a
        href="https://console.firebase.google.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary mt-6"
      >
        Open Firebase
        <ExternalLink size={15} />
      </a>
      <p className="mt-4 text-xs text-[#8696a0]">
        See README.md for the complete setup and Netlify deployment steps.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AppBootstrap />
        {!isFirebaseConfigured ? (
          <ConfigPage />
        ) : (
          <Suspense fallback={<LoadingScreen label="Loading…" />}>
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:conversationId"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route path="/ai" element={<AiPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        )}
      </BrowserRouter>
    </ErrorBoundary>
  );
}
