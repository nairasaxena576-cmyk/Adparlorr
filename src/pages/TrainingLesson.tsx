import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';
import { LoadingScreen } from '@/components/LoadingScreen';

/**
 * Lesson content is stored as plain text (paragraphs separated by a blank
 * line; lines starting with "- " become a bullet list). No rich-text editor
 * or markdown library is introduced — this is a small, dependency-free,
 * safe renderer (no dangerouslySetInnerHTML).
 */
function LessonContent({ content }: { content: string }) {
  const blocks = content.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-4 text-sm leading-relaxed text-ink-300">
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim().length > 0);
        const isList = lines.every((l) => l.trim().startsWith('- '));
        if (isList) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5">
              {lines.map((line, j) => (
                <li key={j}>{line.replace(/^-\s*/, '')}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{block}</p>;
      })}
    </div>
  );
}

export function TrainingLesson() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const lesson = useStore((s) => s.currentLesson);
  const fetchLesson = useStore((s) => s.fetchLesson);
  const completeLesson = useStore((s) => s.completeLesson);
  const showToast = useToast();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lessonId) fetchLesson(lessonId);
  }, [lessonId, fetchLesson]);

  if (!lesson || lesson.id !== lessonId) return <LoadingScreen />;

  const handleNext = async () => {
    setSubmitting(true);
    const result = await completeLesson(lesson.id);
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error || 'Failed to mark lesson complete.', 'error');
      return;
    }
    if (lesson.nextLessonId) {
      navigate(`/dashboard/training/${courseId}/lessons/${lesson.nextLessonId}`);
    } else {
      showToast('Chapter complete!', 'success');
      navigate(`/dashboard/training/${courseId}`);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to={`/dashboard/training/${courseId}`}
        className="flex items-center gap-1 text-sm text-ink-300 hover:text-brand-400"
      >
        <ChevronLeft className="h-4 w-4" /> Back to course
      </Link>

      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-400">{lesson.chapterTitle}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">{lesson.title}</h1>

        {lesson.videoUrl && (
          <div className="mt-5 aspect-video overflow-hidden rounded-xl border border-ink-700">
            <iframe
              src={lesson.videoUrl}
              title={lesson.title}
              className="h-full w-full"
              allowFullScreen
            />
          </div>
        )}

        <div className="mt-5">
          <LessonContent content={lesson.content} />
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-ink-700 pt-5">
          {lesson.previousLessonId ? (
            <Link
              to={`/dashboard/training/${courseId}/lessons/${lesson.previousLessonId}`}
              className="btn-ghost"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Link>
          ) : (
            <span />
          )}
          <button onClick={handleNext} disabled={submitting} className="btn-brand disabled:opacity-60">
            {lesson.completed ? (
              <>
                {lesson.nextLessonId ? 'Next Lesson' : 'Back to Course'} <ChevronRight className="h-4 w-4" />
              </>
            ) : submitting ? (
              'Saving…'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Mark Complete
                {lesson.nextLessonId ? ' & Next' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
