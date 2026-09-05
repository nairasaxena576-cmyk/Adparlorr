import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import {
  listAllCourses,
  findCourseById,
  findCourseBySlug,
  createCourse,
  updateCourse,
  deleteCourse,
  findChapterById,
  listChaptersByCourse,
  createChapter,
  updateChapter,
  deleteChapter,
  findLessonById,
  listLessonsByChapter,
  createLesson,
  updateLesson,
  deleteLesson,
} from '../repositories/trainingCourse.repository';
import { createAssessment } from '../repositories/trainingAssessment.repository';
import {
  deleteLessonCompletionsForCourse,
  deleteProgressForCourse,
  listUserIdsWithProgressForCourse,
} from '../repositories/trainingProgress.repository';

// ---- Courses ----

export function listCoursesForAdmin() {
  return listAllCourses();
}

export async function getCourseForAdmin(id: string) {
  const course = await findCourseById(id);
  if (!course) throw AppError.notFound('Course not found.');
  return course;
}

export interface CreateCourseInput {
  title: string;
  slug: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  isPublished?: boolean;
  isRequired?: boolean;
  order?: number;
}

export async function createCourseForAdmin(input: CreateCourseInput) {
  const existing = await findCourseBySlug(input.slug);
  if (existing) throw AppError.conflict('A course with this slug already exists.');

  return prisma.$transaction(async (tx) => {
    const course = await createCourse(
      {
        title: input.title,
        slug: input.slug,
        description: input.description ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        isPublished: input.isPublished ?? false,
        isRequired: input.isRequired ?? false,
        order: input.order ?? 0,
      },
      tx
    );
    // Every course gets one assessment shell immediately, so admins can
    // start adding questions right away without a separate creation step.
    await createAssessment(
      { courseId: course.id, title: `${input.title} Assessment`, passingScore: 70, isPublished: false },
      tx
    );
    return findCourseById(course.id, tx);
  });
}

export interface UpdateCourseInput {
  title?: string;
  slug?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  isPublished?: boolean;
  isRequired?: boolean;
  order?: number;
}

export async function updateCourseForAdmin(id: string, input: UpdateCourseInput) {
  const existing = await findCourseById(id);
  if (!existing) throw AppError.notFound('Course not found.');

  if (input.slug && input.slug !== existing.slug) {
    const slugTaken = await findCourseBySlug(input.slug);
    if (slugTaken) throw AppError.conflict('A course with this slug already exists.');
  }

  return updateCourse(id, input);
}

export async function deleteCourseForAdmin(id: string) {
  const existing = await findCourseById(id);
  if (!existing) throw AppError.notFound('Course not found.');
  // Cascades to chapters/lessons/assessment/questions/answers/progress/completions.
  await deleteCourse(id);
}

// ---- Chapters ----

export interface CreateChapterInput {
  title: string;
  description?: string | null;
  order?: number;
  isPublished?: boolean;
}

export async function createChapterForAdmin(courseId: string, input: CreateChapterInput) {
  const course = await findCourseById(courseId);
  if (!course) throw AppError.notFound('Course not found.');
  return createChapter({
    courseId,
    title: input.title,
    description: input.description ?? null,
    order: input.order ?? 0,
    isPublished: input.isPublished ?? false,
  });
}

export interface UpdateChapterInput {
  title?: string;
  description?: string | null;
  order?: number;
  isPublished?: boolean;
}

export async function updateChapterForAdmin(id: string, input: UpdateChapterInput) {
  const existing = await findChapterById(id);
  if (!existing) throw AppError.notFound('Chapter not found.');
  return updateChapter(id, input);
}

export async function deleteChapterForAdmin(id: string) {
  const existing = await findChapterById(id);
  if (!existing) throw AppError.notFound('Chapter not found.');
  await deleteChapter(id);
}

export async function reorderChapterForAdmin(id: string, direction: 'up' | 'down') {
  const chapter = await findChapterById(id);
  if (!chapter) throw AppError.notFound('Chapter not found.');

  const siblings = (await listChaptersByCourse(chapter.courseId)).sort((a, b) => a.order - b.order);
  const idx = siblings.findIndex((c) => c.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return findChapterById(id);

  const other = siblings[swapIdx];
  await prisma.$transaction([
    updateChapter(id, { order: other.order }),
    updateChapter(other.id, { order: chapter.order }),
  ]);
  return findChapterById(id);
}

// ---- Lessons ----

export interface CreateLessonInput {
  title: string;
  content: string;
  videoUrl?: string | null;
  order?: number;
  isPublished?: boolean;
}

export async function createLessonForAdmin(chapterId: string, input: CreateLessonInput) {
  const chapter = await findChapterById(chapterId);
  if (!chapter) throw AppError.notFound('Chapter not found.');
  return createLesson({
    chapterId,
    title: input.title,
    content: input.content,
    videoUrl: input.videoUrl ?? null,
    order: input.order ?? 0,
    isPublished: input.isPublished ?? false,
  });
}

export interface UpdateLessonInput {
  title?: string;
  content?: string;
  videoUrl?: string | null;
  order?: number;
  isPublished?: boolean;
}

export async function updateLessonForAdmin(id: string, input: UpdateLessonInput) {
  const existing = await findLessonById(id);
  if (!existing) throw AppError.notFound('Lesson not found.');
  return updateLesson(id, input);
}

export async function deleteLessonForAdmin(id: string) {
  const existing = await findLessonById(id);
  if (!existing) throw AppError.notFound('Lesson not found.');
  await deleteLesson(id);
}

export async function reorderLessonForAdmin(id: string, direction: 'up' | 'down') {
  const lesson = await findLessonById(id);
  if (!lesson) throw AppError.notFound('Lesson not found.');

  const siblings = (await listLessonsByChapter(lesson.chapterId)).sort((a, b) => a.order - b.order);
  const idx = siblings.findIndex((l) => l.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return findLessonById(id);

  const other = siblings[swapIdx];
  await prisma.$transaction([
    updateLesson(id, { order: other.order }),
    updateLesson(other.id, { order: lesson.order }),
  ]);
  return findLessonById(id);
}

// ---- Reset progress ----
//
// Deliberately never triggered by ordinary content edits (title/content/order/
// publish changes never touch progress tables). Only this explicit admin
// action clears progress, and only for the course (optionally one user)
// the admin selects.

export async function resetProgressForAdmin(courseId: string, userId?: string) {
  const course = await findCourseById(courseId);
  if (!course) throw AppError.notFound('Course not found.');

  let affectedUserIds: string[];
  if (userId) {
    // Specific user requested - only affect that user (existing behavior)
    affectedUserIds = [userId];
  } else {
    // No specific user - get all affected users
    const legacyProgressUserIds = (await listUserIdsWithProgressForCourse(courseId)).map(
      (p) => p.userId
    );
    if (course.isRequired) {
      // For required courses, also include users who have trainingCompletedAt set
      // (they earned it via the global Training Task system - the current authoritative source)
      const usersWithTrainingCompletion = await prisma.user.findMany({
        where: { trainingCompletedAt: { not: null } },
        select: { id: true }
      });
      const trainedUserIds = usersWithTrainingCompletion.map((u) => u.id);

      // Combine and deduplicate (though overlap is unlikely, this is safe)
      const allUserIds = [...legacyProgressUserIds, ...trainedUserIds];
      affectedUserIds = [...new Set(allUserIds)];
    } else {
      // Non-required course - only legacy progress users (existing behavior)
      affectedUserIds = legacyProgressUserIds;
    }
  }

  await prisma.$transaction(async (tx) => {
    await deleteLessonCompletionsForCourse(courseId, userId, tx);
    await deleteProgressForCourse(courseId, userId, tx);

    if (course.isRequired && affectedUserIds.length > 0) {
      // This course's pass was contributing to trainingCompletedAt for these
      // users; without it they no longer meet the requirement, so deposits
      // must re-lock for them specifically (not for any other user).
      await tx.user.updateMany({
        where: { id: { in: affectedUserIds } },
        data: { trainingCompletedAt: null },
      });
    }
  });

  return { affectedUserCount: affectedUserIds.length };
}
