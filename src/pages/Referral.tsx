import { Copy, Check, Users, Gift, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';

export function Referral() {
  const user = useStore((s) => s.getCurrentUser())!;
  const referralsData = useStore((s) => s.referralsData);
  const fetchReferrals = useStore((s) => s.fetchReferrals);
  const showToast = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferrals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(user.referralCode).then(() => {
      setCopied(true);
      showToast('Referral code copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const joined = referralsData?.stats.joined ?? 0;
  const active = referralsData?.stats.active ?? 0;
  const referrals = referralsData?.referrals ?? [];

  const stats = [
    { label: 'People Joined', value: joined, Icon: Users, color: 'text-brand-400', bg: 'bg-brand-500/15' },
    { label: 'Referral Earnings', value: '$0.00', Icon: Gift, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    { label: 'Active Referrals', value: active, Icon: TrendingUp, color: 'text-sky-400', bg: 'bg-sky-500/15' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Referral Program</h1>
        <p className="mt-1 text-sm text-ink-400">Invite friends and earn bonuses when they join.</p>
      </div>

      {/* Referral code card */}
      <div className="card">
        <h3 className="text-lg font-bold text-white">Your Referral Code</h3>
        <p className="mt-1 text-sm text-ink-400">Share this code with friends. They'll enter it when they register.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 rounded-lg border border-ink-600 bg-ink-800 px-4 py-3 text-center">
            <span className="text-2xl font-bold tracking-[0.3em] text-brand-400">{user.referralCode}</span>
          </div>
          <button onClick={handleCopy} className="btn-brand min-w-[140px]">
            {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Code</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className={`grid h-11 w-11 place-items-center rounded-xl ${s.bg}`}>
              <s.Icon className={`h-5.5 w-5.5 ${s.color}`} />
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{s.value}</p>
            <p className="text-sm text-ink-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Referral list */}
      <div className="card">
        <h3 className="text-lg font-bold text-white">Recent Referrals</h3>
        <div className="mt-4 space-y-3">
          {referrals.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-400">
              No referrals yet. Share your code to get started.
            </p>
          ) : (
            referrals.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-ink-800/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500/20 text-sm font-bold text-brand-300">
                    {r.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{r.fullName}</p>
                    <p className="text-xs text-ink-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  r.status === 'ACTIVE' ? 'bg-brand-500/15 text-brand-300' : 'bg-amber-500/15 text-amber-300'
                }`}>
                  {r.status === 'ACTIVE' ? 'Active' : 'Pending'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
