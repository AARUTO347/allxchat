import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthShell } from '../components/auth/AuthShell';
import { Spinner } from '../components/ui/Primitives';
import { getErrorMessage } from '../lib/errors';
import { useAuthStore } from '../stores/authStore';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const session = useAuthStore((state) => state.session);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (session?.emailVerified) navigate('/chat', { replace: true });
  }, [session, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const resend = async () => {
    if (!email) {
      toast.error('Return to sign in and try again with your email address.');
      return;
    }
    if (!session) {
      toast.error('Please sign in again to resend the verification email.');
      return;
    }
    setSending(true);
    try {
      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(session, {
        url: `${window.location.origin}/auth/callback`,
        handleCodeInApp: true,
      });
      toast.success('Verification email sent.');
      setCooldown(45);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to resend the verification email.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle="One quick step to secure your account and unlock your conversations."
      footer={
        <p className="text-center text-sm text-[#667781] dark:text-[#8696a0]">
          Already verified?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-400"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div className="rounded-2xl border border-black/[0.06] bg-[#f7f8fa] p-6 text-center dark:border-white/[0.08] dark:bg-[#0b141a]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          <MailCheck size={30} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-[#111b21] dark:text-[#e9edef]">
          Check your inbox
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#667781] dark:text-[#8696a0]">
          We sent a verification link
          {email ? (
            <>
              {' '}to <span className="font-semibold text-[#111b21] dark:text-[#e9edef]">{email}</span>
            </>
          ) : null}
          . Open it to activate your account.
        </p>
        <button
          type="button"
          onClick={resend}
          disabled={sending || cooldown > 0 || !email}
          className="btn-secondary mt-5 w-full"
        >
          {sending ? <Spinner size={16} /> : <RotateCcw size={16} />}
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
        </button>
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-[#8696a0]">
        Can&apos;t find it? Check spam or promotions, and make sure the address is correct.
      </p>
    </AuthShell>
  );
}
