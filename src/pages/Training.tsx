import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Lock, ArrowRight, Wallet, Clock, XCircle, ShieldCheck } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';

export function Training() {
  const referral = useStore((s) => s.trainingReferralStatus);
  const fetchTrainingReferralStatus = useStore((s) => s.fetchTrainingReferralStatus);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    (async () => {
      await fetchTrainingReferralStatus();
      setCheckingAccess(false);
    })();
  }, [fetchTrainingReferralStatus]);

  const unlocked = Boolean(referral?.hasReferral && referral.tierEligible && referral.fundingComplete);

  if (checkingAccess) {
    return <div className="card-c text-center text-sm text-ink-500">Checking training access…</div>;
  }

  return unlocked ? <TrainingTaskFlow /> : <TrainingAccessGate referral={referral} />;
}

// ---------------------------------------------------------------------------
// STATE A — locked: referral code entry + eligibility/funding status.
// ---------------------------------------------------------------------------
function TrainingAccessGate({
  referral,
}: {
  referral: ReturnType<typeof useStore.getState>['trainingReferralStatus'];
}) {
  const verifyTrainingReferral = useStore((s) => s.verifyTrainingReferral);
  const showToast = useToast();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!code.trim()) {
      setError('Enter a referral code.');
      return;
    }
    setError('');
    setVerifying(true);
    const result = await verifyTrainingReferral(code.trim());
    setVerifying(false);
    if (!result.ok) {
      setError(result.error || 'Failed to verify referral code.');
      return;
    }
    showToast('Referral verified.', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Training</h1>
        <p className="mt-1 text-sm text-ink-500">Complete the requirements below before starting training.</p>
      </div>

      <div className="card-c">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-bold text-ink-900">Training Access Requirements</h2>
        </div>

        <div className="mt-5 space-y-1.5">
          <label className="block text-sm font-medium text-ink-700">Inviter referral code</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              disabled={verifying || Boolean(referral?.hasReferral)}
              placeholder="Enter the referral code…"
              className="input-base-c flex-1 disabled:opacity-60"
            />
            <button
              onClick={handleVerify}
              disabled={verifying || Boolean(referral?.hasReferral)}
              className="btn-brand shrink-0 disabled:opacity-60"
            >
              {verifying ? 'Verifying…' : 'Verify Referral'}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {referral?.hasReferral && (
          <div className="mt-5 space-y-3 rounded-xl bg-pink-50 p-4">
            <StatusRow label="Referral" value="Verified" positive />
            <StatusRow label="Referrer" value={referral.referrerName ?? '—'} />
            <StatusRow
              label="Referrer Tier"
              value={referral.referrerTier ?? '—'}
              positive={referral.tierEligible}
              negative={!referral.tierEligible}
            />
            <StatusRow
              label="Training Funding"
              value={referral.fundingComplete ? 'Completed' : 'Pending'}
              positive={referral.fundingComplete}
              negative={!referral.fundingComplete}
            />
          </div>
        )}

        {referral?.hasReferral && !referral.tierEligible && (
          <div className="mt-4 flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              This referral code belongs to a {referral.referrerTier} member. The inviter must be Gold or Platinum
              tier before training can unlock.
            </p>
          </div>
        )}

        {referral?.hasReferral && referral.tierEligible && !referral.fundingComplete && (
          <div className="mt-4 flex items-start gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Waiting for {referral.referrerName} to provide the required $
              {referral.trainingFundingRequired?.toFixed(2) ?? '1000.00'} training funding. Check back soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-500">{label}</span>
      <span
        className={`font-semibold ${
          positive ? 'text-brand-600' : negative ? 'text-red-600' : 'text-ink-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// STATE B — unlocked: existing 45-task flow, no typed answer, auto-approve.
// ---------------------------------------------------------------------------
function TrainingTaskFlow() {
  const tasks = useStore((s) => s.trainingTasks);
  const progress = useStore((s) => s.trainingTaskProgress);
  const fetchTrainingTasks = useStore((s) => s.fetchTrainingTasks);
  const fetchTrainingTaskProgress = useStore((s) => s.fetchTrainingTaskProgress);
  const submitTrainingTask = useStore((s) => s.submitTrainingTask);
  const showToast = useToast();

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTrainingTasks();
    fetchTrainingTaskProgress();
  }, [fetchTrainingTasks, fetchTrainingTaskProgress]);

  const currentTask = tasks.find((t) => t.status === 'current');

  const handleSubmit = async () => {
    if (!currentTask) return;
    setSubmitting(true);
    // No typed answer required — the customer only needs to click Submit.
    // The backend still requires a non-empty `answer` string, so a fixed
    // placeholder is sent. The submission is immediately approved
    // server-side and progress automatically advances to the next task.
    const result = await submitTrainingTask(currentTask.id, 'Submitted');
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error || 'Failed to submit.', 'error');
      return;
    }
    showToast('Task completed — moving to the next task.', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Required Training</h1>
        <p className="mt-1 text-sm text-ink-500">
          Identify each product below to unlock deposits on your account.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="card-c text-center text-sm text-ink-500">No training tasks are available yet.</div>
      ) : (
        <>
          {progress && (
            <div className="card-c">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">
                  Task {Math.min(progress.completedCount + 1, progress.totalRequired)} of {progress.totalRequired}
                </span>
                <span className="font-semibold text-brand-600">
                  {progress.totalRequired > 0 ? Math.round((progress.completedCount / progress.totalRequired) * 100) : 0}%
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-pink-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
                  style={{
                    width: `${progress.totalRequired > 0 ? (progress.completedCount / progress.totalRequired) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {progress?.completed ? (
            <div className="card-c text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-500/15">
                <CheckCircle2 className="h-8 w-8 text-brand-500" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-ink-900">Training Complete</h2>
              <p className="mt-2 text-sm text-ink-600">
                All required tasks have been approved. Deposit functionality is now unlocked.
              </p>
              <Link to="/dashboard/wallet" className="btn-brand mx-auto mt-5 w-fit">
                <Wallet className="h-4 w-4" /> Go to Wallet
              </Link>
            </div>
          ) : currentTask ? (
            <div className="card-c">
              <h2 className="text-lg font-bold text-ink-900">Review the Product</h2>
              <p className="mt-1 text-sm text-ink-500">Look at the image below, then click Submit to continue.</p>

              {currentTask.imageUrl && (
                <div className="mt-4 overflow-hidden rounded-xl border border-pink-100 bg-pink-50">
                  <img
                    src={currentTask.imageUrl}
                    alt="Product to review"
                    className="mx-auto max-h-80 w-full object-contain"
                  />
                </div>
              )}

              {currentTask.submissionStatus === 'PENDING' ? (
                <div className="mt-5 flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  <Clock className="h-4 w-4 shrink-0" />
                  Submitted — awaiting admin review. Check back soon.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {currentTask.submissionStatus === 'REJECTED' && (
                    <div className="flex items-start gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p>This submission was not approved. Please try again.</p>
                        {currentTask.rejectionReason && (
                          <p className="mt-1 text-xs text-red-700/80">{currentTask.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-brand w-full py-3 disabled:opacity-60"
                  >
                    {submitting ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          <div className="card-c">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-500">Training Progress</h3>
            <div className="mt-3 space-y-1.5">
              {tasks.map((task, idx) => (
                <div key={task.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm">
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-500" />
                  ) : task.status === 'current' ? (
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand-500" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-ink-400" />
                  )}
                  <span className={task.status === 'locked' ? 'text-ink-400' : 'text-ink-800'}>
                    {task.status === 'completed' && task.productName ? task.productName : `Task ${idx + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
