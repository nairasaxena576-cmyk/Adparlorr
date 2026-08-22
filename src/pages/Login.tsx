import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';

export function Login() {
  const navigate = useNavigate();
  const login = useStore((s) => s.login);
  const showToast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || 'Login failed.');
      return;
    }
    showToast('Welcome back!', 'success');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-ink-900">
      <nav className="sticky top-9 z-40 border-b border-ink-700 bg-ink-900/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="text-xl font-extrabold text-brand-400">Adparlorr</Link>
          <Link to="/" className="text-sm text-ink-300 hover:text-brand-400">Back to home</Link>
        </div>
      </nav>

      <div className="mx-auto flex max-w-md flex-col items-center px-5 py-16 sm:px-8">
        <div className="w-full card !p-8">
          <h2 className="text-2xl font-bold text-white">Log in</h2>
          <p className="mt-2 text-sm text-ink-400">Welcome back. Please log in to continue.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="loginEmail" className="block text-sm font-medium text-ink-200">Email</label>
              <input id="loginEmail" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base mt-1.5" placeholder="jane@example.com" />
            </div>
            <div>
              <label htmlFor="loginPassword" className="block text-sm font-medium text-ink-200">Password</label>
              <input id="loginPassword" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base mt-1.5" placeholder="••••••••" />
            </div>
            {error && (
              <p className="rounded-lg bg-red-500/15 px-4 py-2.5 text-sm text-red-300">{error}</p>
            )}
            <button type="submit" disabled={submitting} className="btn-brand w-full py-3 disabled:opacity-60">
              <LogIn className="h-4 w-4" /> {submitting ? 'Logging In…' : 'Log In'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-ink-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
