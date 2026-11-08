import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import toast from 'react-hot-toast';
import { AuthShell } from '../components/auth/AuthShell';
import { Spinner } from '../components/ui/Primitives';
import { getErrorMessage } from '../lib/errors';
import { getAuthInstance } from '../lib/firebase';
import { validatePassword } from '../lib/validation';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const startRecovery = async () => {
      try {
        const query = new URLSearchParams(window.location.search);
        const mode = query.get('mode');
        const code = query.get('oobCode');
        if (!code || mode !== 'resetPassword') {
          throw new Error('This recovery link is invalid or has expired.');
        }
        await verifyPasswordResetCode(getAuthInstance(), code);
        if (!active) return;
        setResetCode(code);
        setHasSession(true);
      } catch (recoveryError) {
        if (!active) return;
        setError(getErrorMessage(recoveryError, 'This recovery link is invalid or has expired.'));
      } finally {
        if (active) setChecking(false);
      }
    };

    void startRecovery();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const validation = validatePassword(password);
    if (validation) {
      setError(validation);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      if (!resetCode) throw new Error('This recovery link is invalid or has expired.');
      await confirmPasswordReset(getAuthInstance(), resetCode, password);
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to update your password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use at least eight characters. Your other sessions will remain signed in."
      footer={
        <p className="text-center text-sm text-[#667781] dark:text-[#8696a0]">
          <Link
            to="/login"
            className="font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-400"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      {checking ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size={28} className="text-brand-600" />
        </div>
      ) : !hasSession ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          {error || 'This recovery link is invalid or has expired. Request a fresh password reset email.'}
          <Link to="/forgot-password" className="mt-3 block font-semibold underline underline-offset-2">
            Request a new link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="newPassword" className="field-label">
              New password
            </label>
            <div className="relative">
              <Lock
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]"
              />
              <input
                id="newPassword"
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
            <label htmlFor="confirmNewPassword" className="field-label">
              Confirm new password
            </label>
            <div className="relative">
              <KeyRound
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]"
              />
              <input
                id="confirmNewPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="field pl-10"
                placeholder="Repeat your new password"
                disabled={submitting}
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
            {submitting ? <Spinner size={17} /> : <KeyRound size={16} />}
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
