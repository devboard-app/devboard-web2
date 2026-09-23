import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError, verifyEmail } from '@/api/client';

type Status = 'verifying' | 'success' | 'error';

interface Props {
  onGoToLogin: () => void;
}

export function VerifyEmailPage({ onGoToLogin }: Props) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('This verification link is missing its token.');
      return;
    }
    let cancelled = false;
    verifyEmail(token)
      .then(() => { if (!cancelled) setStatus('success'); })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setError(err instanceof ApiError ? err.detail : 'Something went wrong. Try again.');
      });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
              <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="white" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">DevBoard</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          {status === 'verifying' && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Verifying your email…</p>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald-600 dark:text-emerald-400">
                  <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Email verified</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Your account is active. You can sign in now.</p>
              <button onClick={onGoToLogin}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                Go to sign in
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-red-600 dark:text-red-400">
                  <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Verification failed</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{error}</p>
              <button onClick={onGoToLogin} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                ← Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
