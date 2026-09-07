import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';
import { Logo } from '@/components/branding/Logo';

export function Register() {
  const navigate = useNavigate();
  const register = useStore((s) => s.register);
  const showToast = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    const result = await register({ fullName, email, password, referralCode });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || 'Registration failed.');
      return;
    }
    showToast('Registration successful! Welcome bonus of $0. Contact your supervisor to activate your account.', 'success');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-ink-700 bg-ink-900/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/"><Logo variant="dark" size="lg" /></Link>
          <Link to="/" className="text-sm text-ink-300 hover:text-brand-400">Back to home</Link>
        </div>
      </nav>

      <div className="mx-auto flex max-w-6xl flex-col items-center px-5 py-12 sm:px-8 lg:flex-row lg:justify-between lg:gap-16 lg:py-20">
        {/* Left copy */}
        <div className="mb-10 max-w-md lg:mb-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Start earning today
          </h1>
          <p className="mt-4 text-ink-300">
            Create your free Adparlor account and get instant access to paid tasks.
          </p>
          <ul className="mt-8 space-y-3">
            {['No upfront fees', 'Work from anywhere', 'Daily payouts', 'Referral bonuses'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-ink-200">
                <CheckCircle2 className="h-5 w-5 text-brand-400" /> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Form */}
        <div className="w-full max-w-md">
          <div className="card !p-8">
            <h2 className="text-2xl font-bold text-white">Create your account</h2>
            <p className="mt-2 text-sm text-ink-400">Fill in your details to get started.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-ink-200">Full Name</label>
                <input id="fullName" type="text" required value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-base mt-1.5" placeholder="Jane Doe" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink-200">Email</label>
                <input id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base mt-1.5" placeholder="jane@example.com" />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink-200">Password</label>
                <input id="password" type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base mt-1.5" placeholder="••••••••" />
              </div>
              <div>
                <label htmlFor="referral" className="block text-sm font-medium text-ink-200">
                  Referral Code <span className="text-ink-500">(optional)</span>
                </label>
                <input id="referral" type="text" value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="input-base mt-1.5" placeholder="ABC123" />
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/15 px-4 py-2.5 text-sm text-red-300">{error}</p>
              )}

              <button type="submit" disabled={submitting} className="btn-brand w-full py-3 disabled:opacity-60">
                {submitting ? 'Creating Account…' : <>Create Account <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-ink-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
