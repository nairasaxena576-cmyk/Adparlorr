import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ChevronLeft, Users, Check, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';
import { LoadingScreen } from '@/components/LoadingScreen';

export function AdminTrainingReferrals() {
  const authStatus = useStore((s) => s.authStatus);
  const currentUser = useStore((s) => s.currentUser);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const showToast = useToast();

  const isAdmin = currentUser?.role === 'ADMIN';
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    const result = await login(email, pass);
    if (!result.ok) {
      setLoggingIn(false);
      setLoginError(result.error || 'Invalid credentials.');
      return;
    }
    if (useStore.getState().currentUser?.role !== 'ADMIN') {
      await logout();
      setLoggingIn(false);
      setLoginError('Invalid credentials.');
      return;
    }
    setLoggingIn(false);
    showToast('Admin login successful.', 'success');
  };

  if (authStatus === 'idle' || authStatus === 'loading') return <LoadingScreen />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <nav className="sticky top-0 z-40 border-b border-ink-700 bg-ink-900/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
            <Link to="/" className="text-xl font-extrabold text-brand-400">Adparlorr</Link>
            <Link to="/" className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400">
              <ChevronLeft className="h-4 w-4" /> Back
            </Link>
          </div>
        </nav>
        <div className="mx-auto flex max-w-md flex-col items-center px-5 py-16 sm:px-8">
          <div className="w-full card !p-8">
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15">
                <Shield className="h-7 w-7 text-brand-400" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white">Admin Panel</h2>
              <p className="mt-1 text-sm text-ink-400">Authorized personnel only.</p>
            </div>
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-200">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input-base mt-1.5" placeholder="admin@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-200">Password</label>
                <input type="password" required value={pass} onChange={(e) => setPass(e.target.value)}
                  className="input-base mt-1.5" placeholder="••••••••" />
              </div>
              {loginError && <p className="rounded-lg bg-red-500/15 px-4 py-2.5 text-sm text-red-300">{loginError}</p>}
              <button type="submit" disabled={loggingIn} className="btn-brand w-full py-3 disabled:opacity-60">
                {loggingIn ? 'Logging In…' : 'Log In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-ink-700 bg-ink-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-400" />
            <span className="text-lg font-extrabold text-brand-400">Training Referrals</span>
          </div>
          <Link to="/admin" className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400">
            <ChevronLeft className="h-4 w-4" /> Back to Admin
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <TrainingReferralsListView />
      </div>
    </div>
  );
}

function TrainingReferralsListView() {
  const rows = useStore((s) => s.adminTrainingOverview);
  const fetchAdminTrainingOverview = useStore((s) => s.fetchAdminTrainingOverview);
  const adminApproveDeposit = useStore((s) => s.adminApproveDeposit);
  const adminResolveNegativeBalance = useStore((s) => s.adminResolveNegativeBalance);
  const showToast = useToast();

  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminTrainingOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApproveFunding = async (depositId: string) => {
    setBusyId(depositId);
    const result = await adminApproveDeposit(depositId);
    await fetchAdminTrainingOverview();
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error || 'Failed to approve training funding.', 'error');
      return;
    }
    showToast('Training funding approved — customer unlocked.', 'success');
  };

  const handleResolveNegativeBalance = async (userId: string) => {
    setBusyId(userId);
    const result = await adminResolveNegativeBalance(userId);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error || 'Failed to resolve negative balance.', 'error');
      return;
    }
    showToast('Negative balance resolved.', 'success');
  };

  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold text-white">Training Referrals</h1>
        <p className="mt-1 text-sm text-ink-400">
          Every customer who has entered an inviter referral code for training, their referrer's tier, funding
          status, and training progress. Confirm funding once the referrer has deposited the required amount.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-ink-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-800 text-ink-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Referrer</th>
                <th className="px-4 py-3 font-semibold">Funding</th>
                <th className="px-4 py-3 font-semibold">Progress</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-ink-400">
                    No training referrals yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const deposit = r.fundingDeposit;
                  return (
                    <tr key={r.referralId} className="bg-ink-900 hover:bg-ink-800/50 align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{r.customer.fullName}</p>
                        <p className="text-xs text-ink-400">{r.customer.email}</p>
                        <p className="text-xs text-ink-500">Balance: ${r.customer.balance.toFixed(2)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {r.referrer ? (
                          <>
                            <p className="font-medium text-white">{r.referrer.fullName}</p>
                            <p className="text-xs text-ink-400">{r.referrer.tier} · {r.referralCode}</p>
                          </>
                        ) : (
                          <span className="text-ink-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-200">
                        {r.trainingFundingRequired === null ? (
                          <span className="text-ink-500">Not required yet</span>
                        ) : r.trainingFundedAt ? (
                          <span className="text-brand-400">
                            ${r.trainingFundingRequired.toFixed(2)} confirmed {new Date(r.trainingFundedAt).toLocaleDateString()}
                          </span>
                        ) : deposit && deposit.status === 'PENDING' ? (
                          <div>
                            <span className="text-amber-400">Pending Admin Review</span>
                            <p className="text-xs text-ink-500">
                              {deposit.assetCode} ${deposit.amount.toFixed(2)} · submitted {new Date(deposit.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        ) : deposit && deposit.status === 'REJECTED' ? (
                          <span className="text-red-400">Deposit rejected — awaiting resubmission</span>
                        ) : (
                          <span className="text-ink-500">Awaiting referrer deposit (${r.trainingFundingRequired.toFixed(2)})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-200">
                        {r.trainingProgress.completedCount}/{r.trainingProgress.totalRequired} tasks
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {r.trainingCompletedAt && (
                            <span className="w-fit rounded-full bg-brand-500/15 px-2.5 py-1 text-xs font-semibold text-brand-300">
                              Training complete
                            </span>
                          )}
                          {r.hasNegativeBalance && (
                            <span className="flex w-fit items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">
                              <AlertTriangle className="h-3 w-3" /> Negative balance
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          {deposit && deposit.status === 'PENDING' && (
                            <button
                              onClick={() => handleApproveFunding(deposit.id)}
                              disabled={busyId === deposit.id}
                              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {busyId === deposit.id ? 'Approving…' : 'Approve Funding'}
                            </button>
                          )}
                          {r.hasNegativeBalance && (
                            <button
                              onClick={() => handleResolveNegativeBalance(r.customer.id)}
                              disabled={busyId === r.customer.id}
                              className="flex items-center gap-1.5 rounded-lg bg-ink-700 px-3 py-2 text-xs font-semibold text-ink-200 transition hover:bg-red-500/20 hover:text-red-400 disabled:opacity-60"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {busyId === r.customer.id ? 'Resolving…' : 'Resolve Negative Balance'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
