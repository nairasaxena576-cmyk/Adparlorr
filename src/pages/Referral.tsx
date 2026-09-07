import { Copy, Check, Users, Gift, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';

export function Referral() {
  const user = useStore((s) => s.getCurrentUser())!;
  const referralsData = useStore((s) => s.referralsData);
  const fetchReferrals = useStore((s) => s.fetchReferrals);
  const trainingFundingRequests = useStore((s) => s.trainingFundingRequests);
  const fetchTrainingFundingRequests = useStore((s) => s.fetchTrainingFundingRequests);
  const showToast = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferrals();
    fetchTrainingFundingRequests();
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
        <h1 className="text-2xl font-extrabold text-ink-900">Referral Program</h1>
        <p className="mt-1 text-sm text-ink-500">Invite friends and earn bonuses when they join.</p>
      </div>

      {/* Referral code card */}
      <div className="card-c">
        <h3 className="text-lg font-bold text-ink-900">Your Referral Code</h3>
        <p className="mt-1 text-sm text-ink-500">Share this code with friends. They'll enter it when they register.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 rounded-lg border border-pink-200 bg-pink-50 px-4 py-3 text-center">
            <span className="text-2xl font-bold tracking-[0.3em] text-brand-600">{user.referralCode}</span>
          </div>
          <button onClick={handleCopy} className="btn-brand min-w-[140px]">
            {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy Code</>}
          </button>
        </div>
      </div>

      {/* Training funding requests — people who used my code and need me to fund their training */}
      {trainingFundingRequests.length > 0 && (
        <div className="card-c">
          <h3 className="text-lg font-bold text-ink-900">Training Funding</h3>
          <p className="mt-1 text-sm text-ink-500">
            Customers who used your referral code for training need you to provide their required funding.
          </p>
          <div className="mt-4 space-y-3">
            {trainingFundingRequests.map((req) => {
              const pendingReview = req.depositStatus === 'PENDING';
              const content = (
                <>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      Pending Training Funding: ${req.amountRequired.toFixed(2)}
                    </p>
                    <p className="text-xs text-ink-500">Customer: {req.customerName}</p>
                  </div>
                  {pendingReview ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
                      <Clock className="h-3.5 w-3.5" /> Pending Admin Review
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-600">
                      {req.depositStatus === 'REJECTED' ? 'Resubmit' : 'Fund Now'} <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </>
              );

              if (pendingReview) {
                return (
                  <div
                    key={req.referralId}
                    className="flex items-center justify-between rounded-lg bg-pink-50 px-4 py-3"
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={req.referralId}
                  to={`/dashboard/wallet?trainingFundingReferralId=${req.referralId}&amount=${req.amountRequired}&customerName=${encodeURIComponent(req.customerName)}`}
                  className="flex items-center justify-between rounded-lg bg-pink-50 px-4 py-3 transition hover:bg-pink-100"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card-c">
            <div className={`grid h-11 w-11 place-items-center rounded-xl ${s.bg}`}>
              <s.Icon className={`h-5.5 w-5.5 ${s.color}`} />
            </div>
            <p className="mt-3 text-2xl font-bold text-ink-900">{s.value}</p>
            <p className="text-sm text-ink-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Referral list */}
      <div className="card-c">
        <h3 className="text-lg font-bold text-ink-900">Recent Referrals</h3>
        <div className="mt-4 space-y-3">
          {referrals.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">
              No referrals yet. Share your code to get started.
            </p>
          ) : (
            referrals.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-pink-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500/20 text-sm font-bold text-brand-600">
                    {r.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{r.fullName}</p>
                    <p className="text-xs text-ink-500">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  r.status === 'ACTIVE' ? 'bg-brand-500/15 text-brand-600' : 'bg-amber-500/15 text-amber-700'
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
