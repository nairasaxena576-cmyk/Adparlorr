import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function Training() {
  const courses = useStore((s) => s.trainingCourses);
  const fetchTrainingCourses = useStore((s) => s.fetchTrainingCourses);

  useEffect(() => {
    fetchTrainingCourses();
  }, [fetchTrainingCourses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Required Training</h1>
        <p className="mt-1 text-sm text-ink-400">
          Complete the training below to unlock deposits on your account.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="card text-center text-sm text-ink-400">No training courses are available yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/dashboard/training/${course.id}`}
              className="card flex flex-col transition hover:border-brand-500/50"
            >
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15">
                  <GraduationCap className="h-5.5 w-5.5 text-brand-400" />
                </div>
                {course.isRequired && (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
                    Required
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-lg font-bold text-white">{course.title}</h3>
              {course.description && (
                <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{course.description}</p>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-400">
                    {course.completedLessons}/{course.totalLessons} lessons
                  </span>
                  <span className="font-semibold text-brand-400">{course.progressPercent}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
                    style={{ width: `${course.progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-400">
                {course.passed ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Completed
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
