import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { applyActionCode } from 'firebase/auth';
import { AuthShell } from '../components/auth/AuthShell';
import { Spinner } from '../components/ui/Primitives';
import { getErrorMessage } from '../lib/errors';
import { getAuthInstance } from '../lib/firebase';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const query = new URLSearchParams(window.location.search);
        const mode = query.get('mode');
        const code = query.get('oobCode');
        if (!mode || !code) throw new Error('This verification link is invalid or has expired.');

        if (mode === 'verifyEmail') {
          await applyActionCode(getAuthInstance(), code);
          if (!active) return;
          navigate('/login', { replace: true });
          return;
        }

        if (mode === 'resetPassword') {
          navigate(`/reset-password?mode=resetPassword&oobCode=${encodeURIComponent(code)}`, {
            replace: true,
          });
          return;
        }

        throw new Error('This verification link is invalid or has expired.');
      } catch (callbackError) {
        if (!active) return;
        setError(getErrorMessage(callbackError, 'Unable to verify this link.'));
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <AuthShell
      title={error ? 'Verification problem' : 'Finishing sign-in'}
      subtitle={error ? 'Request a fresh link and try again.' : 'Securing your session…'}
      footer={
        <p className="text-center text-sm text-[#667781] dark:text-[#8696a0]">
          <Link to="/login" className="font-semibold text-brand-700 dark:text-brand-400">
            Go to sign in
          </Link>
        </p>
      }
    >
      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          {error}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 py-14">
          <Spinner size={30} className="text-brand-600" />
          <p className="text-sm text-[#667781] dark:text-[#8696a0]">
            Verifying your secure link…
          </p>
        </div>
      )}
    </AuthShell>
  );
}
