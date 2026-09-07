import { Link } from 'react-router-dom';
import { ShoppingBag, DollarSign, Wallet, ArrowRight, Award, TrendingUp } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getCurrentTier, getNextTier, getTierProgress, TIERS } from '@/utils/tiers';
import type { Tier } from '@/types';

export function DashboardHome() {
  const user = useStore((s) => s.getCurrentUser())!;

  const tier = getCurrentTier(user.completedOrders, user.totalDeposits);
  const nextTier = getNextTier(tier);
  const progress = nextTier ? getTierProgress(user.completedOrders, user.totalDeposits, nextTier) : 100;

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
            return (
              <div
                key={t}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  isCurrent ? 'border-brand-500 bg-brand-500/15 text-brand-600' : 'border-pink-200 text-ink-500'
                }`}
              >
                {info.name}
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl bg-pink-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-500">Current Tier</p>
              <p className={`text-xl font-bold ${TIERS[tier].color}`}>{tier}</p>
            </div>
            {nextTier && (
              <div className="text-right">
                <p className="text-sm text-ink-500">Next Tier</p>
                <p className={`text-xl font-bold ${TIERS[nextTier].color}`}>{nextTier}</p>
              </div>
            )}
          </div>

          {nextTier ? (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Progress to {nextTier}</span>
                <span className="font-semibold text-brand-600">{progress}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-pink-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-3 flex flex-col gap-1 text-xs text-ink-400 sm:flex-row sm:gap-6">
                <span>Orders: {user.completedOrders}/{TIERS[nextTier].minOrders}</span>
                <span>Deposits: ${user.totalDeposits.toFixed(0)}/${TIERS[nextTier].minDeposits}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 text-sm text-brand-600">
              <TrendingUp className="h-4 w-4" /> You've reached the highest tier!
            </div>
          )}
        </div>
      </div>

      {user.workbenchBalance < 0 && (
        <div className="card-c border-red-300 bg-red-50">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-bold text-red-700">
                  Demo Balance Shortfall: -${Math.abs(user.workbenchBalance).toFixed(2)}
                </p>
                <p className="mt-1 text-sm text-red-600/90">
                  Your simulated workbench balance is negative. Resolve it with demo credits on the workbench to
                  continue — this is a demo simulation only, not your real Wallet balance.
                </p>
              </div>
            </div>
            <Link to="/dashboard/orders" className="btn-brand shrink-0 bg-red-500 hover:bg-red-600">
              Go to Workbench <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
