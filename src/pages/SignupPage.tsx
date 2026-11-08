import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthShell } from '../components/auth/AuthShell';
import { Spinner } from '../components/ui/Primitives';
import { getErrorMessage } from '../lib/errors';
import {
  normalizeUsername,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateUsername,
} from '../lib/validation';
import { useAuthStore } from '../stores/authStore';

export function SignupPage() {
  const navigate = useNavigate();
  const signUp = useAuthStore((state) => state.signUp);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.loading);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session && !loading) navigate('/chat', { replace: true });
  }, [session, loading, navigate]);

  const handleGoogle = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      toast.success('Your account is ready.');
      navigate('/chat', { replace: true });
    } catch (googleError) {
      setError(getErrorMessage(googleError, 'Unable to continue with Google.'));
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const validationError =
      validateDisplayName(displayName) ||
      validateUsername(normalizeUsername(username)) ||
      validateEmail(email) ||
      validatePassword(password) ||
      (password !== confirmPassword ? 'Passwords do not match.' : null);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp({
        email,
        password,
        username: normalizeUsername(username),
        displayName,
      });
      if (result.needsVerification) {
        toast.success('Check your inbox to verify your email.');
        navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`, { replace: true });
      } else {
        toast.success('Your account is ready.');
        navigate('/chat', { replace: true });
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to create your account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="A secure space for every conversation that matters."
      footer={
        <p className="text-center text-sm text-[#667781] dark:text-[#8696a0]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="displayName" className="field-label">
              Display name
            </label>
            <div className="relative">
              <UserRound
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]"
              />
              <input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="field pl-10"
                placeholder="Aaruto"
                autoComplete="name"
                disabled={submitting}
              />
            </div>
          </div>
          <div>
            <label htmlFor="username" className="field-label">
              Username
            </label>
            <div className="relative">
              <AtSign
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]"
              />
              <input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value.replace(/\s+/g, ''))}
                className="field pl-10"
                placeholder="aaruto"
                autoComplete="username"
                autoCapitalize="none"
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="signupEmail" className="field-label">
            Email address
          </label>
          <div className="relative">
            <Mail
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]"
            />
            <input
              id="signupEmail"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field pl-10"
              placeholder="you@example.com"
              disabled={submitting}
            />
          </div>
        </div>

        <div>
          <label htmlFor="signupPassword" className="field-label">
            Password
          </label>
          <div className="relative">
            <Lock
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]"
            />
            <input
              id="signupPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field pl-10 pr-11"
              placeholder="At least 8 characters"
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#667781] hover:bg-black/5 dark:text-[#8696a0] dark:hover:bg-white/10"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="field-label">
            Confirm password
          </label>
          <div className="relative">
            <Lock
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]"
            />
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="field pl-10"
              placeholder="Repeat your password"
              disabled={submitting}
            />
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary mt-1 w-full py-3" disabled={submitting || googleSubmitting}>
          {submitting ? <Spinner size={17} /> : null}
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-[#8696a0]">
        <span className="h-px flex-1 bg-black/[0.08] dark:bg-white/[0.08]" />
        or continue with
        <span className="h-px flex-1 bg-black/[0.08] dark:bg-white/[0.08]" />
      </div>

      <button
        type="button"
        onClick={() => void handleGoogle()}
        className="btn-secondary w-full py-3"
        disabled={submitting || googleSubmitting}
      >
        {googleSubmitting ? <Spinner size={17} /> : null}
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.3h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.2-2 3.7-5 3.7-8.8Z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5.1L1.3 17.2C3.1 21.1 7.3 24 12 24Z" />
          <path fill="#FBBC05" d="M5.2 14.3a7.2 7.2 0 0 1 0-4.6L1.3 6.8A12 12 0 0 0 0 12c0 1.9.5 3.7 1.3 5.2l3.9-2.9Z" />
          <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17 1.1 14.7 0 12 0 7.3 0 3.1 2.9 1.3 6.8l3.9 2.9c.9-2.9 3.6-5 6.8-5Z" />
        </svg>
        {googleSubmitting ? 'Continuing with Google…' : 'Continue with Google'}
      </button>

      <p className="mt-4 text-center text-[11px] leading-5 text-[#8696a0]">
        Your email is used only for account verification and recovery.
      </p>
    </AuthShell>
  );
}
