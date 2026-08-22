import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, XCircle, Wallet } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { AssessmentResult } from '@/types';

export function TrainingAssessment() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const assessment = useStore((s) => s.currentAssessment);
  const fetchAssessment = useStore((s) => s.fetchAssessment);
  const submitAssessment = useStore((s) => s.submitAssessment);
  const showToast = useToast();

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  useEffect(() => {
    if (courseId) fetchAssessment(courseId);
  }, [courseId, fetchAssessment]);

  if (!assessment) return <LoadingScreen />;

  const allAnswered = assessment.questions.every((q) => answers[q.id]);

  const handleSubmit = async () => {
    if (!courseId || !allAnswered) {
      showToast('Please answer every question before submitting.', 'error');
      return;
    }
    setSubmitting(true);
    const payload = assessment.questions.map((q) => ({ questionId: q.id, answerId: answers[q.id] }));
    const res = await submitAssessment(courseId, payload);
    setSubmitting(false);
    if (!res.ok || !res.result) {
      showToast(res.error || 'Failed to submit assessment.', 'error');
      return;
    }
    setResult(res.result);
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers({});
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div className="card text-center">
          <div
            className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${
              result.passed ? 'bg-brand-500/15' : 'bg-red-500/15'
            }`}
          >
            {result.passed ? (
              <CheckCircle2 className="h-8 w-8 text-brand-400" />
            ) : (
              <XCircle className="h-8 w-8 text-red-400" />
            )}
          </div>
          <h1 className="mt-4 text-xl font-bold text-white">Assessment Result</h1>

          <div className="mt-5 flex justify-center gap-8">
            <div>
              <p className="text-xs text-ink-400">Score</p>
              <p className="text-2xl font-extrabold text-white">{result.score}%</p>
            </div>
            <div>
              <p className="text-xs text-ink-400">Passing Score</p>
              <p className="text-2xl font-extrabold text-white">{result.passingScore}%</p>
            </div>
          </div>

          {result.passed ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm font-semibold text-brand-300">✓ Training Completed</p>
              <p className="text-sm text-ink-300">
                Your training is complete. Deposit functionality is now unlocked.
              </p>
              <Link to="/dashboard/wallet" className="btn-brand mx-auto w-fit">
                <Wallet className="h-4 w-4" /> Go to Wallet
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-red-300">
                You did not reach the passing score this time. Review the chapters and try again.
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={handleRetry} className="btn-brand">
                  Try Again
                </button>
                <button onClick={() => navigate(`/dashboard/training/${courseId}`)} className="btn-ghost">
                  Back to Course
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to={`/dashboard/training/${courseId}`}
        className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400"
      >
        <ChevronLeft className="h-4 w-4" /> Back to course
      </Link>

      <div className="card">
        <h1 className="text-xl font-bold text-white">{assessment.title}</h1>
        <p className="mt-1 text-sm text-ink-400">Passing score: {assessment.passingScore}%</p>
      </div>

      <div className="space-y-4">
        {assessment.questions.map((q, idx) => (
          <div key={q.id} className="card">
            <p className="text-sm font-bold text-white">
              {idx + 1}. {q.question}
            </p>
            <div className="mt-3 space-y-2">
              {q.answers.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition ${
                    answers[q.id] === a.id
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-ink-600 text-ink-300 hover:border-ink-500'
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={a.id}
                    checked={answers[q.id] === a.id}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: a.id }))}
                    className="h-4 w-4 text-brand-500 focus:ring-brand-500"
                  />
                  {a.answer}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || !allAnswered}
        className="btn-brand w-full py-3 disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit Assessment'}
      </button>
    </div>
  );
}
