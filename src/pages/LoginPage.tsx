import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Package, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLockedOut = lockoutEnd !== null && Date.now() < lockoutEnd;

  useEffect(() => {
    if (!lockoutEnd) return;
    const tick = () => {
      const remaining = Math.ceil((lockoutEnd - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutEnd(null);
        setLockoutRemaining(0);
        setFailedAttempts(0);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setLockoutRemaining(remaining);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lockoutEnd]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;
    setError('');
    setSubmitting(true);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= MAX_ATTEMPTS) {
        setLockoutEnd(Date.now() + LOCKOUT_SECONDS * 1000);
        setError(`Too many failed attempts. Try again in ${LOCKOUT_SECONDS} seconds.`);
      } else if (attempts >= 3) {
        setError(`Invalid email or password. ${MAX_ATTEMPTS - attempts} attempt(s) remaining.`);
      } else {
        setError('Invalid email or password.');
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Logistics Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {isLockedOut && (
            <div className="bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-lg border border-amber-100">
              Account locked. Try again in {lockoutRemaining}s.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="you@company.com"
              required
              autoComplete="email"
              disabled={isLockedOut}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={isLockedOut}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || isLockedOut}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium text-sm hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Contact your administrator for account access
        </p>
      </div>
    </div>
  );
}
