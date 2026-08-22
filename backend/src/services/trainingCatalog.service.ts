import { AppError } from '../utils/AppError';
import {
  listPublishedCourses,
  findPublishedCourseWithContent,
  findLessonById,
  listLessonsByChapter,
} from '../repositories/trainingCourse.repository';
import {
  listProgressForUser,
  findProgress,
  listCompletedLessonIds,
  markLessonComplete,
  findLessonCompletion,
} from '../repositories/trainingProgress.repository';

export interface CustomerCourseSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  isRequired: boolean;
  order: number;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  passed: boolean;
  hasAssessment: boolean;
}

export async function listPublishedCoursesForCustomer(userId: string): Promise<CustomerCourseSummary[]> {
  const courses = await listPublishedCourses();
  const courseIds = courses.map((c) => c.id);
  const progressRows = courseIds.length > 0 ? await listProgressForUser(userId, courseIds) : [];
  const progressMap = new Map(progressRows.map((p) => [p.courseId, p]));

  const allLessonIds = courses.flatMap((c) => c.chapters.flatMap((ch) => ch.lessons.map((l) => l.id)));
  const completedRows = allLessonIds.length > 0 ? await listCompletedLessonIds(userId, allLessonIds) : [];
  const completedSet = new Set(completedRows.map((r) => r.lessonId));

  return courses.map((c) => {
    const totalLessons = c.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
    const completedLessons = c.chapters.reduce(
      (sum, ch) => sum + ch.lessons.filter((l) => completedSet.has(l.id)).length,
      0
    );
    const progress = progressMap.get(c.id);
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      thumbnailUrl: c.thumbnailUrl,
      isRequired: c.isRequired,
      order: c.order,
      totalLessons,
      completedLessons,
      progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      passed: progress?.passed ?? false,
      hasAssessment: Boolean(c.assessment?.isPublished),
    };
  });
}

export interface CustomerLessonSummary {
  id: string;
  title: string;
  order: number;
  completed: boolean;
}

export interface CustomerChapterSummary {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: CustomerLessonSummary[];
}

export interface CustomerCourseDetail extends CustomerCourseSummary {
  chapters: CustomerChapterSummary[];
}

export async function getCourseDetailForCustomer(
  courseId: string,
  userId: string
): Promise<CustomerCourseDetail> {
  const course = await findPublishedCourseWithContent(courseId);
  if (!course) throw AppError.notFound('Course not found.');

  const lessonIds = course.chapters.flatMap((ch) => ch.lessons.map((l) => l.id));
  const completedRows = lessonIds.length > 0 ? await listCompletedLessonIds(userId, lessonIds) : [];
  const completedSet = new Set(completedRows.map((r) => r.lessonId));
  const progress = await findProgress(userId, courseId);

  const totalLessons = lessonIds.length;
  const completedLessons = lessonIds.filter((id) => completedSet.has(id)).length;

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description,
    thumbnailUrl: course.thumbnailUrl,
    isRequired: course.isRequired,
    order: course.order,
    totalLessons,
    completedLessons,
    progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    passed: progress?.passed ?? false,
    hasAssessment: Boolean(course.assessment?.isPublished),
    chapters: course.chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      description: ch.description,
      order: ch.order,
      lessons: ch.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        order: l.order,
        completed: completedSet.has(l.id),
      })),
    })),
  };
}

function assertLessonAccessible(
  lesson: Awaited<ReturnType<typeof findLessonById>>
): asserts lesson is NonNullable<typeof lesson> {
  if (!lesson || !lesson.isPublished || !lesson.chapter.isPublished || !lesson.chapter.course.isPublished) {
    throw AppError.notFound('Lesson not found.');
  }
}

export interface CustomerLessonDetail {
  id: string;
  chapterId: string;
  chapterTitle: string;
  courseId: string;
  title: string;
  content: string;
  videoUrl: string | null;
  completed: boolean;
  previousLessonId: string | null;
  nextLessonId: string | null;
}

export async function getLessonForCustomer(lessonId: string, userId: string): Promise<CustomerLessonDetail> {
  const lesson = await findLessonById(lessonId);
  assertLessonAccessible(lesson);

  const siblings = (await listLessonsByChapter(lesson.chapterId))
    .filter((l) => l.isPublished)
    .sort((a, b) => a.order - b.order);
  const idx = siblings.findIndex((l) => l.id === lessonId);
  const previousLessonId = idx > 0 ? siblings[idx - 1].id : null;
  const nextLessonId = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1].id : null;

  const completion = await findLessonCompletion(userId, lessonId);

  return {
    id: lesson.id,
    chapterId: lesson.chapterId,
    chapterTitle: lesson.chapter.title,
    courseId: lesson.chapter.courseId,
    title: lesson.title,
    content: lesson.content,
    videoUrl: lesson.videoUrl,
    completed: Boolean(completion),
    previousLessonId,
    nextLessonId,
  };
}

export async function completeLessonForCustomer(
  lessonId: string,
  userId: string
): Promise<{ lessonId: string; completed: true }> {
  const lesson = await findLessonById(lessonId);
  assertLessonAccessible(lesson);

  await markLessonComplete(userId, lessonId);
  return { lessonId, completed: true };
}
