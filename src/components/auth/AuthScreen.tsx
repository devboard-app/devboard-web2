import { useState } from 'react';
import { ApiError, login, register, forgotPassword, resendVerification } from '@/api/client';

type AuthMode = 'login' | 'register' | 'forgot' | 'verify';

interface Props {
  mode: AuthMode;
  onSuccess: () => void;
  onModeChange: (mode: AuthMode) => void;
}

export function AuthScreen({ mode, onSuccess, onModeChange }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which flow to show the "check your email" confirmation for — copy
  // differs between them. Deliberately local state, not a routed `mode`:
  // there's no URL for this confirmation (it's not one of the links
  // devboard-auth's emails point at, those are their own pages), and
  // routing it through `onModeChange` would navigate to a different Route
  // element and remount this component with a hardcoded `mode` prop,
  // losing the "show the confirmation" intent entirely.
  const [pendingAction, setPendingAction] = useState<'register' | 'forgot' | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  function switchMode(next: AuthMode) {
    setError(null);
    onModeChange(next);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResendState('idle');
    setLoading(true);
    try {
      await login(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password);
      setPendingAction('register');
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitForgot() {
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setPendingAction('forgot');
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    void submitForgot();
  }

  async function handleResend() {
    setResendState('sending');
    try {
      await resendVerification(email);
      setResendState('sent');
    } catch {
      setResendState('idle');
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
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

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
              {error}
              {mode === 'login' && error.toLowerCase().includes('not verified') && (
                <div className="mt-2">
                  {resendState === 'sent' ? (
                    <span className="text-xs text-red-600 dark:text-red-400">Verification email sent — check your inbox.</span>
                  ) : (
                    <button type="button" onClick={handleResend} disabled={resendState === 'sending'}
                      className="text-xs font-medium underline disabled:opacity-60">
                      {resendState === 'sending' ? 'Sending…' : 'Resend verification email'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {pendingAction && (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-indigo-600 dark:text-indigo-400">
                  <path d="M2.5 6.5L10 11.5L17.5 6.5M3 15h14a1 1 0 001-1V6a1 1 0 00-1-1H3a1 1 0 00-1 1v8a1 1 0 001 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              {pendingAction === 'register' ? (
                <>
                  <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Check your email</h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                    We sent a verification link to <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>.
                    Click it to activate your account, then sign in.
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    Didn't receive it?{' '}
                    {resendState === 'sent' ? (
                      <span>Sent — check your inbox.</span>
                    ) : (
                      <button onClick={handleResend} disabled={resendState === 'sending'} className="text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-60">
                        {resendState === 'sending' ? 'Sending…' : 'Resend'}
                      </button>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Check your email</h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                    We sent a reset link to <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span>.
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    Didn't receive it?{' '}
                    <button onClick={() => void submitForgot()} disabled={loading} className="text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-60">
                      {loading ? 'Sending…' : 'Resend'}
                    </button>
                  </p>
                </>
              )}
              <button onClick={() => { setPendingAction(null); switchMode('login'); }} className="mt-6 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                ← Back to sign in
              </button>
            </div>
          )}

          {!pendingAction && mode === 'login' && (
            <>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Welcome back</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Sign in to your workspace</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    placeholder="you@company.com" />
                </div>
                {/* The link sits after the input in the DOM so Tab goes email → password;
                    the grid still draws it in the label row. */}
                <div className="grid grid-cols-[1fr_auto] items-center gap-y-1.5">
                  <label htmlFor="login-password" className="col-start-1 row-start-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Password</label>
                  <input id="login-password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    className="col-span-2 row-start-2 w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => switchMode('forgot')}
                    className="col-start-2 row-start-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    Forgot password?
                  </button>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No account?{' '}
                <button onClick={() => switchMode('register')} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                  Create one
                </button>
              </p>
            </>
          )}

          {!pendingAction && mode === 'register' && (
            <>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Create your account</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">Start a free workspace, no card required</p>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Work email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    placeholder="ada@company.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Password</label>
                  <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    placeholder="At least 8 characters" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Already have an account?{' '}
                <button onClick={() => switchMode('login')} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                  Sign in
                </button>
              </p>
            </>
          )}

          {!pendingAction && mode === 'forgot' && (
            <>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Reset your password</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Enter your email and we'll send a reset link.
              </p>
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    placeholder="you@company.com" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                <button onClick={() => switchMode('login')} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                  ← Back to sign in
                </button>
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
          By continuing, you agree to DevBoard's{' '}
          <span className="text-zinc-500 dark:text-zinc-500 hover:underline cursor-pointer">Terms</span> and{' '}
          <span className="text-zinc-500 dark:text-zinc-500 hover:underline cursor-pointer">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
