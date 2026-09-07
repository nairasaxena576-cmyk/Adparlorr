import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Plus, RotateCcw, LogOut, ChevronLeft, Send, Check, X as XIcon } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Logo } from '@/components/branding/Logo';
import type { CryptoAssetCode, Tier } from '@/types';
import { resolveEffectiveTier } from '@/utils/tiers';

const CRYPTO_ASSET_CODES: CryptoAssetCode[] = ['USDT', 'BTC', 'ETH'];
const GRANTABLE_TIERS: Tier[] = ['Silver', 'Gold', 'Platinum'];

export function Admin() {
  const navigate = useNavigate();
  const authStatus = useStore((s) => s.authStatus);
  const currentUser = useStore((s) => s.currentUser);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const adminUsers = useStore((s) => s.adminUsers);
  const fetchAdminUsers = useStore((s) => s.fetchAdminUsers);
  const adminCreditUser = useStore((s) => s.adminCreditUser);
  const adminResetUserTasks = useStore((s) => s.adminResetUserTasks);
  const adminGrantTier = useStore((s) => s.adminGrantTier);
  const supportSettings = useStore((s) => s.supportSettings);
  const fetchAdminSupportSettings = useStore((s) => s.fetchAdminSupportSettings);
  const updateAdminSupportSettings = useStore((s) => s.updateAdminSupportSettings);
  const adminCryptoAssets = useStore((s) => s.adminCryptoAssets);
  const fetchAdminCryptoAssets = useStore((s) => s.fetchAdminCryptoAssets);
  const updateAdminCryptoAsset = useStore((s) => s.updateAdminCryptoAsset);
  const adminDeposits = useStore((s) => s.adminDeposits);
  const fetchAdminDeposits = useStore((s) => s.fetchAdminDeposits);
  const adminApproveDeposit = useStore((s) => s.adminApproveDeposit);
  const adminRejectDeposit = useStore((s) => s.adminRejectDeposit);
  const showToast = useToast();

  const isAdmin = currentUser?.role === 'ADMIN';

  const [loginUsername, setLoginUsername] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [creditAmounts, setCreditAmounts] = useState<Record<string, string>>({});
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [tierSelections, setTierSelections] = useState<Record<string, Tier>>({});
  const [busyTierUserId, setBusyTierUserId] = useState<string | null>(null);

  const [telegramUsernameInput, setTelegramUsernameInput] = useState('');
  const [telegramEnabledInput, setTelegramEnabledInput] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [telegramError, setTelegramError] = useState('');
  const telegramSeededRef = useRef(false);

  const [assetInputs, setAssetInputs] = useState<Record<string, { address: string; enabled: boolean }>>({});
  const [savingAssetCode, setSavingAssetCode] = useState<CryptoAssetCode | null>(null);
  const [assetErrors, setAssetErrors] = useState<Record<string, string>>({});
  const assetsSeededRef = useRef(false);
  const [busyDepositId, setBusyDepositId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminUsers();
      fetchAdminSupportSettings();
      fetchAdminCryptoAssets();
      fetchAdminDeposits('PENDING');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (supportSettings && !telegramSeededRef.current) {
      setTelegramUsernameInput(supportSettings.telegramUsername ?? '');
      setTelegramEnabledInput(supportSettings.telegramEnabled);
      telegramSeededRef.current = true;
    }
  }, [supportSettings]);

  useEffect(() => {
    if (adminCryptoAssets.length > 0 && !assetsSeededRef.current) {
      const seeded: Record<string, { address: string; enabled: boolean }> = {};
      for (const asset of adminCryptoAssets) {
        seeded[asset.code] = { address: asset.address ?? '', enabled: asset.isEnabled };
      }
      setAssetInputs(seeded);
      assetsSeededRef.current = true;
    }
  }, [adminCryptoAssets]);

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setTelegramError('');
    setSavingTelegram(true);
    const result = await updateAdminSupportSettings({
      telegramUsername: telegramUsernameInput,
      telegramEnabled: telegramEnabledInput,
    });
    setSavingTelegram(false);
    if (!result.ok) {
      setTelegramError(result.error || 'Failed to save Telegram settings.');
      return;
    }
    const saved = useStore.getState().supportSettings;
    setTelegramUsernameInput(saved?.telegramUsername ?? '');
    setTelegramEnabledInput(saved?.telegramEnabled ?? false);
    showToast('Telegram support settings saved.', 'success');
  };

  const handleDisableTelegram = async () => {
    setTelegramError('');
    setSavingTelegram(true);
    const result = await updateAdminSupportSettings({
      telegramUsername: telegramUsernameInput,
      telegramEnabled: false,
    });
    setSavingTelegram(false);
    if (!result.ok) {
      showToast(result.error || 'Failed to disable Telegram contact.', 'error');
      return;
    }
    setTelegramEnabledInput(false);
    showToast('Telegram contact disabled.', 'info');
  };

  const handleSaveAsset = async (code: CryptoAssetCode) => {
    const input = assetInputs[code] ?? { address: '', enabled: false };
    setAssetErrors((prev) => ({ ...prev, [code]: '' }));
    setSavingAssetCode(code);
    const result = await updateAdminCryptoAsset(code, { address: input.address, isEnabled: input.enabled });
    setSavingAssetCode(null);
    if (!result.ok) {
      setAssetErrors((prev) => ({ ...prev, [code]: result.error || 'Failed to save.' }));
      return;
    }
    showToast(`${code} deposit settings saved.`, 'success');
  };

  const handleApproveDeposit = async (id: string) => {
    setBusyDepositId(id);
    const result = await adminApproveDeposit(id);
    await fetchAdminDeposits('PENDING');
    setBusyDepositId(null);
    if (!result.ok) {
      showToast(result.error || 'Failed to approve deposit.', 'error');
      return;
    }
    showToast('Deposit approved and balance credited (simulated).', 'success');
  };

  const handleRejectDeposit = async (id: string) => {
    setBusyDepositId(id);
    const result = await adminRejectDeposit(id);
    await fetchAdminDeposits('PENDING');
    setBusyDepositId(null);
    if (!result.ok) {
      showToast(result.error || 'Failed to reject deposit.', 'error');
      return;
    }
    showToast('Deposit rejected.', 'info');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const result = await login(loginUsername, pass);
    if (!result.ok) {
      setSubmitting(false);
      setError(result.error || 'Invalid credentials.');
      return;
    }
    if (useStore.getState().currentUser?.role !== 'ADMIN') {
      await logout();
      setSubmitting(false);
      setError('Invalid credentials.');
      return;
    }
    setSubmitting(false);
    showToast('Admin login successful.', 'success');
    setLoginUsername('');
    setPass('');
  };

  const handleCredit = async (userId: string) => {
    const amt = parseFloat(creditAmounts[userId] || '');
    if (!amt || amt <= 0) {
      showToast('Enter a valid amount.', 'error');
      return;
    }
    setBusyUserId(userId);
    const result = await adminCreditUser(userId, amt);
    setBusyUserId(null);
    if (!result.ok) {
      showToast(result.error || 'Credit failed.', 'error');
      return;
    }
    showToast(`Credited $${amt.toFixed(2)} to user (simulated).`, 'success');
    setCreditAmounts((prev) => ({ ...prev, [userId]: '' }));
  };

  const handleReset = async (userId: string) => {
    setBusyUserId(userId);
    const result = await adminResetUserTasks(userId);
    setBusyUserId(null);
    if (!result.ok) {
      showToast(result.error || 'Reset failed.', 'error');
      return;
    }
    showToast('User tasks reset.', 'success');
  };

  const handleGrantTier = async (userId: string) => {
    const tier = tierSelections[userId] ?? 'Silver';
    setBusyTierUserId(userId);
    const result = await adminGrantTier(userId, tier as 'Silver' | 'Gold' | 'Platinum');
    setBusyTierUserId(null);
    if (!result.ok) {
      showToast(result.error || 'Failed to unlock tier.', 'error');
      return;
    }
    showToast(`${tier} tier unlocked for user.`, 'success');
  };

  if (authStatus === 'idle' || authStatus === 'loading') return <LoadingScreen />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <nav className="sticky top-0 z-40 border-b border-ink-700 bg-ink-900/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
            <Link to="/"><Logo variant="dark" size="lg" /></Link>
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
                <label className="block text-sm font-medium text-ink-200">Username</label>
                <input type="text" autoComplete="username" required value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="input-base mt-1.5" placeholder="admin" />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-200">Password</label>
                <input type="password" required value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="input-base mt-1.5" placeholder="••••••••" />
              </div>
              {error && <p className="rounded-lg bg-red-500/15 px-4 py-2.5 text-sm text-red-300">{error}</p>}
              <button type="submit" disabled={submitting} className="btn-brand w-full py-3 disabled:opacity-60">
                {submitting ? 'Logging In…' : 'Log In'}
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
            <Shield className="h-5 w-5 text-brand-400" />
            <span className="text-lg font-extrabold text-brand-400">Admin Panel</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/products" className="text-sm text-ink-300 hover:text-brand-400">Products</Link>
            <Link to="/admin/training" className="text-sm text-ink-300 hover:text-brand-400">Training Tasks</Link>
            <Link to="/admin/training/submissions" className="text-sm text-ink-300 hover:text-brand-400">Training Submissions</Link>
            <Link to="/admin/training/referrals" className="text-sm text-ink-300 hover:text-brand-400">Training Referrals</Link>
            <Link to="/admin/support" className="text-sm text-ink-300 hover:text-brand-400">Support Inbox</Link>
            <Link to="/" className="text-sm text-ink-300 hover:text-brand-400">View Site</Link>
            <button
              onClick={async () => { await logout(); showToast('Logged out.', 'info'); navigate('/'); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-ink-300 hover:bg-red-500/15 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <h1 className="text-2xl font-extrabold text-white">User Management</h1>
        <p className="mt-1 text-sm text-ink-400">View, credit, and reset user accounts.</p>

        <div className="mt-6 overflow-hidden rounded-xl border border-ink-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-800 text-ink-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 text-right font-semibold">Balance</th>
                  <th className="px-4 py-3 text-right font-semibold">Orders</th>
                  <th className="px-4 py-3 text-right font-semibold">Deposits</th>
                  <th className="px-4 py-3 font-semibold">Tier</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {adminUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-ink-400">No users registered yet.</td>
                  </tr>
                ) : (
                  adminUsers.map((u) => (
                    <tr key={u.id} className="bg-ink-900 hover:bg-ink-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-300">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-white">{u.fullName}</span>
                          {u.isMerged && (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">Merged</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-400">{u.email}</td>
                      <td className="px-4 py-3 text-right font-bold text-brand-400">${u.balance.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-ink-200">{u.completedOrders}</td>
                      <td className="px-4 py-3 text-right text-ink-200">${u.totalDeposits.toFixed(0)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-xs font-semibold text-ink-200">
                            {resolveEffectiveTier(u.completedOrders, u.totalDeposits, u.manualTier)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={tierSelections[u.id] ?? 'Silver'}
                              onChange={(e) =>
                                setTierSelections((prev) => ({ ...prev, [u.id]: e.target.value as Tier }))
                              }
                              disabled={busyTierUserId === u.id}
                              className="rounded border border-ink-600 bg-ink-800 px-1.5 py-1 text-xs text-white outline-none focus:border-brand-500 disabled:opacity-60"
                            >
                              {GRANTABLE_TIERS.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleGrantTier(u.id)}
                              disabled={busyTierUserId === u.id}
                              className="rounded bg-brand-500 px-2 py-1 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
                              title="Confirm deposit and unlock this tier"
                            >
                              Unlock
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder="Amount"
                            value={creditAmounts[u.id] || ''}
                            onChange={(e) => setCreditAmounts((prev) => ({ ...prev, [u.id]: e.target.value }))}
                            disabled={busyUserId === u.id}
                            className="w-20 rounded border border-ink-600 bg-ink-800 px-2 py-1 text-xs text-white outline-none focus:border-brand-500 disabled:opacity-60"
                          />
                          <button
                            onClick={() => handleCredit(u.id)}
                            disabled={busyUserId === u.id}
                            className="grid h-8 w-8 place-items-center rounded bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-60"
                            title="Credit balance (simulated)"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReset(u.id)}
                            disabled={busyUserId === u.id}
                            className="grid h-8 w-8 place-items-center rounded bg-ink-700 text-ink-200 transition hover:bg-amber-500/20 hover:text-amber-400 disabled:opacity-60"
                            title="Reset tasks"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Support Settings</h2>
              <p className="mt-1 text-sm text-ink-400">Telegram Support</p>
            </div>
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                supportSettings?.telegramEnabled
                  ? 'bg-brand-500/15 text-brand-300'
                  : 'bg-ink-700 text-ink-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  supportSettings?.telegramEnabled ? 'bg-brand-400' : 'bg-ink-500'
                }`}
              />
              {supportSettings?.telegramEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <form onSubmit={handleSaveTelegram} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-200">Telegram Username</label>
              <input
                type="text"
                value={telegramUsernameInput}
                onChange={(e) => setTelegramUsernameInput(e.target.value)}
                disabled={savingTelegram}
                placeholder="@mytelegramusername"
                className="input-base mt-1.5 disabled:opacity-60"
              />
              {telegramError && <p className="mt-1.5 text-xs text-red-400">{telegramError}</p>}
            </div>

            <label className="flex items-center gap-2 text-sm text-ink-200">
              <input
                type="checkbox"
                checked={telegramEnabledInput}
                onChange={(e) => setTelegramEnabledInput(e.target.checked)}
                disabled={savingTelegram}
                className="h-4 w-4 rounded border-ink-600 bg-ink-800 text-brand-500 focus:ring-brand-500 disabled:opacity-60"
              />
              Enable Telegram contact button
            </label>

            <button type="submit" disabled={savingTelegram} className="btn-brand disabled:opacity-60">
              <Send className="h-4 w-4" /> {savingTelegram ? 'Saving…' : 'Save Telegram Contact'}
            </button>
          </form>

          {supportSettings?.telegramEnabled && supportSettings.telegramUrl && (
            <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-lg bg-ink-800/60 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs text-ink-400">Current customer contact</p>
                <a
                  href={supportSettings.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand-400 hover:text-brand-300"
                >
                  {supportSettings.telegramUrl}
                </a>
              </div>
              <button
                onClick={handleDisableTelegram}
                disabled={savingTelegram}
                className="btn-ghost disabled:opacity-60"
              >
                Disable Telegram Contact
              </button>
            </div>
          )}
        </div>

        <div className="card mt-8">
          <h2 className="text-lg font-bold text-white">Crypto Deposit Settings</h2>
          <p className="mt-1 text-sm text-ink-400">
            Configure the deposit address and availability for each simulated crypto asset.
          </p>

          <div className="mt-5 space-y-4">
            {CRYPTO_ASSET_CODES.map((code) => {
              const input = assetInputs[code] ?? { address: '', enabled: false };
              const saving = savingAssetCode === code;
              return (
                <div key={code} className="rounded-lg border border-ink-700 bg-ink-800/40 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="w-20 shrink-0">
                      <p className="text-sm font-bold text-white">{code}</p>
                      <label className="mt-2 flex items-center gap-2 text-xs text-ink-300">
                        <input
                          type="checkbox"
                          checked={input.enabled}
                          disabled={saving}
                          onChange={(e) =>
                            setAssetInputs((prev) => ({
                              ...prev,
                              [code]: { ...input, enabled: e.target.checked },
                            }))
                          }
                          className="h-4 w-4 rounded border-ink-600 bg-ink-800 text-brand-500 focus:ring-brand-500 disabled:opacity-60"
                        />
                        Enabled
                      </label>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-ink-300">Deposit address</label>
                      <input
                        type="text"
                        value={input.address}
                        disabled={saving}
                        onChange={(e) =>
                          setAssetInputs((prev) => ({
                            ...prev,
                            [code]: { ...input, address: e.target.value },
                          }))
                        }
                        placeholder={`${code} deposit address`}
                        className="input-base mt-1 disabled:opacity-60"
                      />
                    </div>
                    <button
                      onClick={() => handleSaveAsset(code)}
                      disabled={saving}
                      className="btn-brand shrink-0 disabled:opacity-60"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                  {assetErrors[code] && <p className="mt-2 text-xs text-red-400">{assetErrors[code]}</p>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card mt-8">
          <h2 className="text-lg font-bold text-white">Pending Deposits</h2>
          <p className="mt-1 text-sm text-ink-400">Review and approve or reject simulated deposit requests.</p>

          <div className="mt-5 space-y-3">
            {adminDeposits.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-400">No pending deposits.</p>
            ) : (
              adminDeposits.map((d) => {
                const busy = busyDepositId === d.id;
                return (
                  <div
                    key={d.id}
                    className="flex flex-col justify-between gap-3 rounded-lg bg-ink-800/60 px-4 py-3 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {d.user.fullName} <span className="font-normal text-ink-400">({d.user.email})</span>
                      </p>
                      <p className="text-xs text-ink-400">
                        {d.assetCode} · ${d.amount.toFixed(2)} · {new Date(d.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveDeposit(d.id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectDeposit(d.id)}
                        disabled={busy}
                        className="flex items-center gap-1.5 rounded-lg bg-ink-700 px-3 py-2 text-xs font-semibold text-ink-200 transition hover:bg-red-500/20 hover:text-red-400 disabled:opacity-60"
                      >
                        <XIcon className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-6 hidden rounded-lg bg-ink-800/40 p-3 text-[10px] text-ink-500 lg:block">
          This is an authorized security awareness training simulation. Not for real-world use.
        </div>
      </div>
    </div>
  );
}
