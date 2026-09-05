import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Lock, ArrowRight, Wallet, Clock, XCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';

export function Training() {
  const tasks = useStore((s) => s.trainingTasks);
  const progress = useStore((s) => s.trainingTaskProgress);
  const fetchTrainingTasks = useStore((s) => s.fetchTrainingTasks);
  const fetchTrainingTaskProgress = useStore((s) => s.fetchTrainingTaskProgress);
  const submitTrainingTask = useStore((s) => s.submitTrainingTask);
  const showToast = useToast();

  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTrainingTasks();
    fetchTrainingTaskProgress();
  }, [fetchTrainingTasks, fetchTrainingTaskProgress]);

  const currentTask = tasks.find((t) => t.status === 'current');

  useEffect(() => {
    setAnswer('');
  }, [currentTask?.id]);

  const handleSubmit = async () => {
    if (!currentTask || !answer.trim()) {
      showToast('Enter the product name before submitting.', 'error');
      return;
    }
    setSubmitting(true);
    const result = await submitTrainingTask(currentTask.id, answer.trim());
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error || 'Failed to submit your answer.', 'error');
      return;
    }
    showToast('Submitted for review. An admin will confirm your answer shortly.', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Required Training</h1>
        <p className="mt-1 text-sm text-ink-400">
          Identify each product below to unlock deposits on your account.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="card text-center text-sm text-ink-400">No training tasks are available yet.</div>
      ) : (
        <>
          {progress && (
            <div className="card">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-400">
                  Task {Math.min(progress.completedCount + 1, progress.totalRequired)} of {progress.totalRequired}
                </span>
                <span className="font-semibold text-brand-400">
                  {progress.totalRequired > 0 ? Math.round((progress.completedCount / progress.totalRequired) * 100) : 0}%
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink-700">
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
            <div className="card text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-500/15">
                <CheckCircle2 className="h-8 w-8 text-brand-400" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-white">Training Complete</h2>
              <p className="mt-2 text-sm text-ink-300">
                All required tasks have been approved. Deposit functionality is now unlocked.
              </p>
              <Link to="/dashboard/wallet" className="btn-brand mx-auto mt-5 w-fit">
                <Wallet className="h-4 w-4" /> Go to Wallet
              </Link>
            </div>
          ) : currentTask ? (
            <div className="card">
              <h2 className="text-lg font-bold text-white">Identify the Product</h2>
              <p className="mt-1 text-sm text-ink-400">
                {currentTask.instruction || 'Look carefully at the image below and enter the product name.'}
              </p>

              {currentTask.imageUrl && (
                <div className="mt-4 overflow-hidden rounded-xl border border-ink-700 bg-ink-800">
                  <img
                    src={currentTask.imageUrl}
                    alt="Product to identify"
                    className="mx-auto max-h-80 w-full object-contain"
                  />
                </div>
              )}

              {currentTask.submissionStatus === 'PENDING' ? (
                <div className="mt-5 flex items-center gap-3 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <Clock className="h-4 w-4 shrink-0" />
                  Submitted — awaiting admin review. Check back soon.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {currentTask.submissionStatus === 'REJECTED' && (
                    <div className="flex items-start gap-3 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p>Incorrect answer. Please try again.</p>
                        {currentTask.rejectionReason && (
                          <p className="mt-1 text-xs text-red-300/80">{currentTask.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <label className="block text-sm font-medium text-ink-200">What is the name of this product?</label>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    disabled={submitting}
                    placeholder="Enter the product name…"
                    className="input-base disabled:opacity-60"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !answer.trim()}
                    className="btn-brand w-full py-3 disabled:opacity-60"
                  >
                    {submitting ? 'Submitting…' : 'Submit Answer'}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          <div className="card">
            <h3 className="text-sm font-bold uppercase tracking-wide text-ink-400">Training Progress</h3>
            <div className="mt-3 space-y-1.5">
              {tasks.map((task, idx) => (
                <div key={task.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm">
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-400" />
                  ) : task.status === 'current' ? (
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand-400" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-ink-500" />
                  )}
                  <span className={task.status === 'locked' ? 'text-ink-500' : 'text-ink-100'}>
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
