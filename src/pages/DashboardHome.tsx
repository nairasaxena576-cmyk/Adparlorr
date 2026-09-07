import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, DollarSign, Wallet, ArrowRight, Award, TrendingUp, Lock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getNextTier, getTierProgress, resolveEffectiveTier, tierUnlockAmount, tierRank, TIERS } from '@/utils/tiers';
import type { Tier } from '@/types';

export function DashboardHome() {
  const user = useStore((s) => s.getCurrentUser())!;
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);

  const tier = resolveEffectiveTier(user.completedOrders, user.totalDeposits, user.manualTier);
  const nextTier = getNextTier(tier);
  const progress = getTierProgress(user.completedOrders, user.totalDeposits, tier);

  const stats = [
    { label: 'Total Orders', value: user.completedOrders, Icon: ShoppingBag, color: 'text-sky-400', bg: 'bg-sky-500/15' },
    { label: 'Total Earnings', value: `$${user.totalEarnings.toFixed(2)}`, Icon: DollarSign, color: 'text-brand-400', bg: 'bg-brand-500/15' },
    { label: 'Available Balance', value: `$${user.balance.toFixed(2)}`, Icon: Wallet, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Welcome back, {user.fullName.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-ink-500">Here's your account overview.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card-c">
            <div className="flex items-center justify-between">
              <div className={`grid h-12 w-12 place-items-center rounded-xl ${s.bg}`}>
                <s.Icon className={`h-6 w-6 ${s.color}`} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-bold text-ink-900">{s.value}</p>
            <p className="text-sm text-ink-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick action */}
      <div className="card-c flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-bold text-ink-900">Ready to work?</h3>
          <p className="mt-1 text-sm text-ink-500">Complete product submission tasks to earn money.</p>
        </div>
        <Link to="/dashboard/orders" className="btn-brand">
          Start Working <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Tier system */}
      <div className="card-c">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-brand-500" />
          <h3 className="text-lg font-bold text-ink-900">Your Tier</h3>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {(Object.keys(TIERS) as Tier[]).map((t) => {
            const info = TIERS[t];
            const isCurrent = t === tier;
            const isLocked = tierRank(t) > tierRank(tier);
            return (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTier(isLocked ? (selectedTier === t ? null : t) : null)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  isCurrent
                    ? 'border-brand-500 bg-brand-500/15 text-brand-600'
                    : isLocked
                    ? 'border-pink-200 text-ink-500 hover:border-brand-300 hover:text-brand-600'
                    : 'border-pink-200 text-ink-500'
                }`}
              >
                {isLocked && <Lock className="h-3.5 w-3.5" />}
                {info.name}
              </button>
            );
          })}
        </div>

        {selectedTier && (
          <div className="mt-4 rounded-xl border border-pink-200 bg-pink-50 p-4">
            <p className="text-sm font-semibold text-ink-900">Unlock {selectedTier} early</p>
            <p className="mt-1 text-sm text-ink-600">
              Deposit at least <span className="font-bold text-brand-600">${tierUnlockAmount(selectedTier).toFixed(2)}</span> and
              an admin will confirm your {selectedTier} tier — no need to wait for orders/deposits to add up naturally.
            </p>
            <Link to="/dashboard/wallet" className="btn-brand mt-3">
              <Wallet className="h-4 w-4" /> Go to Wallet to Deposit
            </Link>
          </div>
        )}

        <div className="mt-6 rounded-xl bg-pink-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-500">Current Tier</p>
              <p className={`text-xl font-bold ${TIERS[tier].color}`}>{tier}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-ink-500">Next Tier</p>
              <p className={`text-xl font-bold ${nextTier ? TIERS[nextTier].color : 'text-ink-400'}`}>
                {nextTier ?? '—'}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">{nextTier ? `Progress to ${nextTier}` : 'Highest tier reached'}</span>
              <span className="font-semibold text-brand-600">{progress}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-pink-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 flex flex-col gap-1 text-xs text-ink-400 sm:flex-row sm:gap-6">
              <span>Orders: {Math.min(user.completedOrders, TIERS[tier].maxOrders)}/{TIERS[tier].maxOrders}</span>
              <span>
                Deposits: ${Math.min(user.totalDeposits, TIERS[tier].maxDeposits).toFixed(0)}/${TIERS[tier].maxDeposits}
              </span>
            </div>
            {!nextTier && (
              <div className="mt-3 flex items-center gap-2 text-sm text-brand-600">
                <TrendingUp className="h-4 w-4" /> You've reached the highest tier!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
