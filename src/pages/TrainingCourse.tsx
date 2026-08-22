import { useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Lock, ArrowRight, ChevronLeft, ClipboardCheck } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { LoadingScreen } from '@/components/LoadingScreen';

export function TrainingCourse() {
  const { courseId } = useParams<{ courseId: string }>();
  const course = useStore((s) => s.trainingCourseDetail);
  const fetchTrainingCourseDetail = useStore((s) => s.fetchTrainingCourseDetail);

  useEffect(() => {
    if (courseId) fetchTrainingCourseDetail(courseId);
  }, [courseId, fetchTrainingCourseDetail]);

  const flatLessons = useMemo(
    () => (course ? course.chapters.flatMap((ch) => ch.lessons) : []),
    [course]
  );
  const firstIncompleteIndex = flatLessons.findIndex((l) => !l.completed);

  if (!course || course.id !== courseId) return <LoadingScreen />;

  const allLessonsComplete = firstIncompleteIndex === -1 && flatLessons.length > 0;
  const currentLessonId = firstIncompleteIndex >= 0 ? flatLessons[firstIncompleteIndex].id : null;

  return (
    <div className="space-y-6">
      <Link to="/dashboard/training" className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400">
        <ChevronLeft className="h-4 w-4" /> Back to Training
      </Link>

      <div className="card">
        <h1 className="text-2xl font-extrabold text-white">{course.title}</h1>
        {course.description && <p className="mt-1.5 text-sm text-ink-400">{course.description}</p>}

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-400">Progress</span>
            <span className="font-semibold text-brand-400">{course.progressPercent}%</span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
              style={{ width: `${course.progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {course.completedLessons} / {course.totalLessons} chapters completed
          </p>
        </div>

        {currentLessonId && (
          <Link
            to={`/dashboard/training/${course.id}/lessons/${currentLessonId}`}
            className="btn-brand mt-5 w-full py-3"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-white">Chapters</h2>
        <div className="mt-4 space-y-5">
          {course.chapters.map((chapter) => (
            <div key={chapter.id}>
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink-400">{chapter.title}</h3>
              <div className="mt-2 space-y-1">
                {chapter.lessons.map((lesson) => {
                  const flatIdx = flatLessons.findIndex((l) => l.id === lesson.id);
                  const isCurrent = lesson.id === currentLessonId;
                  const isLocked = !lesson.completed && !isCurrent && flatIdx > firstIncompleteIndex;
                  const content = (
                    <>
                      {lesson.completed ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-400" />
                      ) : isLocked ? (
                        <Lock className="h-4 w-4 shrink-0 text-ink-500" />
                      ) : (
                        <ArrowRight className="h-4 w-4 shrink-0 text-brand-400" />
                      )}
                      <span className={isLocked ? 'text-ink-500' : 'text-ink-100'}>{lesson.title}</span>
                    </>
                  );
                  return isLocked ? (
                    <div key={lesson.id} className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm">
                      {content}
                    </div>
                  ) : (
                    <Link
                      key={lesson.id}
                      to={`/dashboard/training/${course.id}/lessons/${lesson.id}`}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-ink-800"
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {course.hasAssessment && (
        <div className="card flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500/15">
              <ClipboardCheck className="h-5.5 w-5.5 text-brand-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Final Assessment</h3>
              <p className="mt-1 text-sm text-ink-400">
                {course.passed
                  ? 'You have passed the assessment for this course.'
                  : allLessonsComplete
                    ? 'All chapters complete — take the final assessment to finish this course.'
                    : 'Complete all chapters above to unlock the final assessment.'}
              </p>
            </div>
          </div>
          {course.passed ? (
            <span className="flex items-center gap-1.5 rounded-full bg-brand-500/15 px-3 py-1.5 text-sm font-semibold text-brand-300">
              <CheckCircle2 className="h-4 w-4" /> Passed
            </span>
          ) : (
            <Link
              to={`/dashboard/training/${course.id}/assessment`}
              className={`btn-brand ${!allLessonsComplete ? 'pointer-events-none opacity-50' : ''}`}
              aria-disabled={!allLessonsComplete}
            >
              Take Assessment <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
