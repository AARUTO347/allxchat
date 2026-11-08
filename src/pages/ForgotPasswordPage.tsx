import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import { AuthShell } from '../components/auth/AuthShell';
import { Spinner } from '../components/ui/Primitives';
import { getErrorMessage } from '../lib/errors';
import { getAuthInstance } from '../lib/firebase';
import { validateEmail } from '../lib/validation';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const validation = validateEmail(email);
    if (validation) {
      setError(validation);
      return;
    }
    setSubmitting(true);
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(getAuthInstance(), email.trim(), {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      });
      setSent(true);
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Unable to send the reset email.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={sent ? 'Check your email' : 'Reset your password'}
      subtitle={
        sent
          ? 'If an account exists for that address, a recovery link is on its way.'
          : 'We will email you a secure link to choose a new password.'
      }
      footer={
        <p className="text-center text-sm text-[#667781] dark:text-[#8696a0]">
          Remembered it?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-400"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-black/[0.06] bg-[#f7f8fa] p-6 text-center dark:border-white/[0.08] dark:bg-[#0b141a]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <Mail size={30} />
          </div>
          <p className="mt-4 text-sm leading-6 text-[#667781] dark:text-[#8696a0]">
            Sent to <span className="font-semibold text-[#111b21] dark:text-[#e9edef]">{email}</span>.
            The link expires shortly for your security.
          </p>
          <button type="button" onClick={() => setSent(false)} className="btn-secondary mt-5 w-full">
            Send to a different address
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="resetEmail" className="field-label">
              Email address
            </label>
            <div className="relative">
              <Mail
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8696a0]"
              />
              <input
                id="resetEmail"
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

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full py-3" disabled={submitting}>
            {submitting ? <Spinner size={17} /> : <Send size={16} />}
            {submitting ? 'Sending…' : 'Send recovery link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
