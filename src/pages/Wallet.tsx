import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
  DollarSign,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';
import type { CryptoAssetCode } from '@/types';

export function WalletPage() {
  const user = useStore((s) => s.getCurrentUser())!;
  const transactions = useStore((s) => s.transactions);
  const fetchTransactions = useStore((s) => s.fetchTransactions);
  const cryptoAssets = useStore((s) => s.cryptoAssets);
  const fetchCryptoAssets = useStore((s) => s.fetchCryptoAssets);
  const deposit = useStore((s) => s.deposit);
  const requestWithdrawal = useStore((s) => s.requestWithdrawal);
  const showToast = useToast();

  const trainingCompleted = Boolean(user.trainingCompletedAt);

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<CryptoAssetCode | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<{ blocked: boolean; message: string } | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetchTransactions();
    if (trainingCompleted) fetchCryptoAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingCompleted]);

  const openDeposit = () => {
    setSelectedAsset(cryptoAssets[0]?.code ?? null);
    setDepositAmount('');
    setShowDeposit(true);
  };

  const activeAsset = cryptoAssets.find((a) => a.code === selectedAsset) ?? null;

  const handleDeposit = async () => {
    if (!activeAsset) {
      showToast('Please select a deposit method.', 'error');
      return;
    }
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }
    setDepositing(true);
    const result = await deposit(activeAsset.code, amt);
    setDepositing(false);
    if (!result.ok) {
      showToast(result.error || 'Deposit failed.', 'error');
      return;
    }
    showToast(`Deposit request of $${amt.toFixed(2)} submitted for review.`, 'success');
    setDepositAmount('');
    setShowDeposit(false);
  };

  const handleWithdrawClick = async () => {
    setWithdrawing(true);
    const result = await requestWithdrawal();
    setWithdrawing(false);
    setWithdrawResult(result);
    setShowWithdraw(true);
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr).then(() => {
      setCopied(true);
      showToast('Address copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Wallet</h1>
        <p className="mt-1 text-sm text-ink-400">Manage your balance, deposits, and withdrawals.</p>
      </div>

      {/* Balance card */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink-400">Available Balance</p>
            <p className="mt-1 text-4xl font-extrabold text-white">${user.balance.toFixed(2)}</p>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-500/15">
            <Wallet className="h-8 w-8 text-brand-400" />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          {trainingCompleted ? (
            <button onClick={openDeposit} className="btn-brand flex-1">
              <ArrowDownToLine className="h-4 w-4" /> Deposit
            </button>
          ) : (
            <button disabled className="btn-ghost flex-1 cursor-not-allowed opacity-60">
              <Lock className="h-4 w-4" /> Deposit
            </button>
          )}
          <button onClick={handleWithdrawClick} disabled={withdrawing} className="btn-ghost flex-1 disabled:opacity-60">
            <ArrowUpFromLine className="h-4 w-4" /> {withdrawing ? 'Checking…' : 'Withdraw'}
          </button>
        </div>
      </div>

      {/* Training-gate notice */}
      {!trainingCompleted && (
        <div className="card border-amber-500/40 bg-amber-500/10">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <p className="font-bold text-amber-300">🔒 Deposits</p>
                <p className="mt-1 text-sm text-amber-200/80">
                  Complete your required training before making a deposit.
                </p>
              </div>
            </div>
            <Link to="/dashboard/training" className="btn-brand bg-amber-500 hover:bg-amber-600">
              Continue Training <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="card">
        <h3 className="text-lg font-bold text-white">Transaction History</h3>
        <div className="mt-4 space-y-2">
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">No transactions yet.</p>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-ink-800/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-lg ${
                    t.type === 'DEPOSIT' ? 'bg-brand-500/15' : 'bg-sky-500/15'
                  }`}>
                    {t.type === 'DEPOSIT' ? <ArrowDownToLine className="h-4 w-4 text-brand-400" /> : <DollarSign className="h-4 w-4 text-sky-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.description}</p>
                    <p className="text-xs text-ink-400">{t.type.replace('_', ' ').toLowerCase()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${t.amount > 0 ? 'text-brand-400' : 'text-red-400'}`}>
                    {t.amount > 0 ? '+' : ''}${t.amount.toFixed(2)}
                  </p>
                  <span className={`text-xs ${t.status === 'COMPLETED' ? 'text-brand-400' : t.status === 'FAILED' ? 'text-red-400' : 'text-amber-400'}`}>
                    {t.status.toLowerCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Deposit modal */}
      {showDeposit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setShowDeposit(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-ink-600 bg-ink-900 p-6 shadow-2xl animate-scaleIn">
            <button onClick={() => setShowDeposit(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg text-ink-300 hover:bg-ink-800">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-white">Deposit Funds</h3>

            {cryptoAssets.length === 0 ? (
              <p className="mt-4 text-sm text-ink-400">
                No deposit methods are currently available. Please check back later.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-ink-400">Choose a crypto asset and send funds to its address.</p>

                <div className="mt-5 flex gap-2">
                  {cryptoAssets.map((asset) => (
                    <button
                      key={asset.code}
                      onClick={() => setSelectedAsset(asset.code)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        selectedAsset === asset.code
                          ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                          : 'border-ink-600 text-ink-300 hover:border-ink-500'
                      }`}
                    >
                      {asset.code}
                    </button>
                  ))}
                </div>

                {activeAsset && (
                  <div className="mt-3 rounded-lg border border-ink-600 bg-ink-800 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <DollarSign className="h-4 w-4 text-brand-400" />
                      {activeAsset.code} deposit address
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 truncate text-xs text-ink-400">{activeAsset.address}</code>
                      <button
                        onClick={() => activeAsset.address && copyAddress(activeAsset.address)}
                        className="rounded px-2 py-1 text-xs text-brand-400 hover:bg-brand-500/10"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-medium text-ink-200">Amount (USD)</label>
                  <input type="number" min="0" step="0.01" value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="input-base mt-1.5" placeholder="50.00" />
                </div>
                <button onClick={handleDeposit} disabled={depositing} className="btn-brand mt-4 w-full py-3 disabled:opacity-60">
                  {depositing ? 'Submitting…' : 'Submit Deposit for Review'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Withdraw modal */}
      {showWithdraw && withdrawResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={() => setShowWithdraw(false)} />
          <div className={`relative w-full max-w-md rounded-2xl border bg-ink-900 p-6 shadow-2xl animate-scaleIn ${
            withdrawResult.blocked ? 'border-amber-500/40' : 'border-brand-500/40'
          }`}>
            <button onClick={() => setShowWithdraw(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg text-ink-300 hover:bg-ink-800">
              <X className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-3xl ${
                withdrawResult.blocked ? 'bg-amber-500/15' : 'bg-brand-500/15'
              }`}>
                {withdrawResult.blocked ? '⚠️' : <CheckCircle2 className="h-8 w-8 text-brand-400" />}
              </div>
              <h3 className={`mt-4 text-xl font-bold ${withdrawResult.blocked ? 'text-amber-300' : 'text-brand-300'}`}>
                {withdrawResult.blocked ? 'Withdrawal Unavailable' : 'Withdrawal Requested'}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">{withdrawResult.message}</p>
            </div>
            <button onClick={() => setShowWithdraw(false)} className="btn-ghost mt-5 w-full py-3">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
