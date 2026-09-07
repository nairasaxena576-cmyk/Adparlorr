import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ChevronLeft, ImagePlus, ClipboardList, Check, X, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Logo } from '@/components/branding/Logo';
import type { AdminTrainingTaskSubmission, TrainingTaskSubmissionStatus } from '@/types';

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

export function AdminTrainingSubmissions() {
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
            <ClipboardList className="h-5 w-5 text-brand-400" />
            <span className="text-lg font-extrabold text-brand-400">Training Submissions</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/training" className="flex items-center gap-1.5 text-sm text-ink-300 hover:text-brand-400">
              <ImagePlus className="h-4 w-4" /> Training Tasks
            </Link>
            <Link to="/admin" className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400">
              <ChevronLeft className="h-4 w-4" /> Back to Admin
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <SubmissionsListView />
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<TrainingTaskSubmissionStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-300',
  APPROVED: 'bg-brand-500/15 text-brand-300',
  REJECTED: 'bg-red-500/15 text-red-300',
};

function SubmissionsListView() {
  const submissions = useStore((s) => s.adminTrainingSubmissions);
  const fetchAdminTrainingSubmissions = useStore((s) => s.fetchAdminTrainingSubmissions);

  const [filter, setFilter] = useState<StatusFilter>('PENDING');
  const [reviewing, setReviewing] = useState<AdminTrainingTaskSubmission | null>(null);

  useEffect(() => {
    fetchAdminTrainingSubmissions(filter === 'ALL' ? undefined : filter);
  }, [filter, fetchAdminTrainingSubmissions]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold text-white">Training Submissions</h1>
        <p className="mt-1 text-sm text-ink-400">Review each customer's product-identification answer.</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              filter === f
                ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                : 'border-ink-600 text-ink-400 hover:border-ink-500'
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-ink-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-800 text-ink-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Answer</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-400">No submissions found.</td>
                </tr>
              ) : (
                submissions.map((s) => (
                  <tr key={s.id} className="bg-ink-900 hover:bg-ink-800/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{s.user.fullName}</p>
                      <p className="text-xs text-ink-400">{s.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-200">{s.productNameSnapshot}</td>
                    <td className="px-4 py-3 text-ink-200">{s.submittedAnswer}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[s.status]}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setReviewing(s)} className="text-xs font-semibold text-brand-400 hover:text-brand-300">
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {reviewing && (
        <ReviewModal
          submission={reviewing}
          onClose={() => setReviewing(null)}
          onReviewed={() => {
            setReviewing(null);
            fetchAdminTrainingSubmissions(filter === 'ALL' ? undefined : filter);
          }}
        />
      )}
    </>
  );
}

function ReviewModal({
  submission,
  onClose,
  onReviewed,
}: {
  submission: AdminTrainingTaskSubmission;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const approveAdminTrainingSubmission = useStore((s) => s.approveAdminTrainingSubmission);
  const rejectAdminTrainingSubmission = useStore((s) => s.rejectAdminTrainingSubmission);
  const showToast = useToast();

  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const alreadyReviewed = submission.status !== 'PENDING';

  const handleApprove = async () => {
    setBusy(true);
    const result = await approveAdminTrainingSubmission(submission.id);
    setBusy(false);
    if (!result.ok) {
      showToast(result.error || 'Failed to approve submission.', 'error');
      return;
    }
    showToast('Submission approved.', 'success');
    onReviewed();
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('A rejection reason is required.');
      return;
    }
    setError('');
    setBusy(true);
    const result = await rejectAdminTrainingSubmission(submission.id, rejectionReason.trim());
    setBusy(false);
    if (!result.ok) {
      showToast(result.error || 'Failed to reject submission.', 'error');
      return;
    }
    showToast('Submission rejected.', 'info');
    onReviewed();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink-600 bg-ink-900 p-6 shadow-2xl animate-scaleIn">
        <button onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg text-ink-300 hover:bg-ink-800">
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-xl font-bold text-white">Review Submission</h3>

        <div className="mt-5 overflow-hidden rounded-lg border border-ink-700 bg-ink-800">
          <img src={submission.imageUrlSnapshot} alt={submission.productNameSnapshot} className="h-48 w-full object-cover" />
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="text-xs text-ink-400">Customer</p>
            <p className="font-medium text-white">
              {submission.user.fullName} <span className="font-normal text-ink-400">({submission.user.email})</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-400">Expected product name</p>
            <p className="font-medium text-white">{submission.productNameSnapshot}</p>
          </div>
          <div>
            <p className="text-xs text-ink-400">Customer answer</p>
            <p className="font-medium text-white">{submission.submittedAnswer}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {submission.isAutoMatch ? (
              <span className="flex items-center gap-1 text-brand-400"><CheckCircle2 className="h-3.5 w-3.5" /> System match: likely correct</span>
            ) : (
              <span className="flex items-center gap-1 text-ink-400"><XCircle className="h-3.5 w-3.5" /> System match: no exact match</span>
            )}
          </div>
          <p className="text-xs text-ink-500">Submitted {new Date(submission.createdAt).toLocaleString()}</p>

          {submission.status !== 'PENDING' && (
            <div className="flex items-center gap-2 rounded-lg bg-ink-800/60 px-3 py-2 text-xs text-ink-300">
              <Clock className="h-3.5 w-3.5" />
              Already reviewed — status: {submission.status}
              {submission.rejectionReason && ` (${submission.rejectionReason})`}
            </div>
          )}
        </div>

        {!alreadyReviewed && (
          <div className="mt-5 space-y-3 border-t border-ink-700 pt-4">
            {showRejectForm ? (
              <>
                <label className="block text-sm font-medium text-ink-200">Rejection reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={busy}
                  className="input-base min-h-[60px]"
                  placeholder="Explain why this submission is being rejected…"
                />
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowRejectForm(false)} disabled={busy} className="btn-ghost">
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    <X className="h-4 w-4" /> {busy ? 'Rejecting…' : 'Confirm Reject'}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg bg-ink-700 px-4 py-2 text-sm font-semibold text-ink-200 transition hover:bg-red-500/20 hover:text-red-400 disabled:opacity-60"
                >
                  <X className="h-4 w-4" /> Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
                >
                  <Check className="h-4 w-4" /> {busy ? 'Approving…' : 'Approve'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
