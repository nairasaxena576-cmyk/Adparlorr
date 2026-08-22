import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

// ---- Courses ----

export function listAllCourses(client: Client = prisma) {
  return client.trainingCourse.findMany({
    orderBy: { order: 'asc' },
    include: {
      chapters: { select: { id: true, isPublished: true } },
      assessment: { select: { id: true, isPublished: true } },
    },
  });
}

export function listPublishedCourses(client: Client = prisma) {
  return client.trainingCourse.findMany({
    where: { isPublished: true },
    orderBy: { order: 'asc' },
    include: {
      chapters: {
        where: { isPublished: true },
        select: { id: true, lessons: { where: { isPublished: true }, select: { id: true } } },
      },
      assessment: { select: { id: true, isPublished: true } },
    },
  });
}

export function findCourseById(id: string, client: Client = prisma) {
  return client.trainingCourse.findUnique({
    where: { id },
    include: {
      chapters: { orderBy: { order: 'asc' }, include: { lessons: { orderBy: { order: 'asc' } } } },
      assessment: { include: { questions: { orderBy: { order: 'asc' }, include: { answers: { orderBy: { order: 'asc' } } } } } },
    },
  });
}

export function findPublishedCourseWithContent(id: string, client: Client = prisma) {
  return client.trainingCourse.findFirst({
    where: { id, isPublished: true },
    include: {
      chapters: {
        where: { isPublished: true },
        orderBy: { order: 'asc' },
        include: { lessons: { where: { isPublished: true }, orderBy: { order: 'asc' } } },
      },
      assessment: { select: { id: true, title: true, passingScore: true, isPublished: true } },
    },
  });
}

export function findCourseBySlug(slug: string, client: Client = prisma) {
  return client.trainingCourse.findUnique({ where: { slug } });
}

export function createCourse(data: Prisma.TrainingCourseCreateInput, client: Client = prisma) {
  return client.trainingCourse.create({ data });
}

export function updateCourse(id: string, data: Prisma.TrainingCourseUpdateInput, client: Client = prisma) {
  return client.trainingCourse.update({ where: { id }, data });
}

export function deleteCourse(id: string, client: Client = prisma) {
  return client.trainingCourse.delete({ where: { id } });
}

export function listRequiredPublishedCourses(client: Client = prisma) {
  return client.trainingCourse.findMany({ where: { isPublished: true, isRequired: true } });
}

// ---- Chapters ----

export function findChapterById(id: string, client: Client = prisma) {
  return client.trainingChapter.findUnique({ where: { id } });
}

export function listChaptersByCourse(courseId: string, client: Client = prisma) {
  return client.trainingChapter.findMany({ where: { courseId }, orderBy: { order: 'asc' } });
}

export function createChapter(data: Prisma.TrainingChapterUncheckedCreateInput, client: Client = prisma) {
  return client.trainingChapter.create({ data });
}

export function updateChapter(id: string, data: Prisma.TrainingChapterUpdateInput, client: Client = prisma) {
  return client.trainingChapter.update({ where: { id }, data });
}

export function deleteChapter(id: string, client: Client = prisma) {
  return client.trainingChapter.delete({ where: { id } });
}

// ---- Lessons ----

export function findLessonById(id: string, client: Client = prisma) {
  return client.trainingLesson.findUnique({
    where: { id },
    include: { chapter: { include: { course: true } } },
  });
}

export function listLessonsByChapter(chapterId: string, client: Client = prisma) {
  return client.trainingLesson.findMany({ where: { chapterId }, orderBy: { order: 'asc' } });
}

export function createLesson(data: Prisma.TrainingLessonUncheckedCreateInput, client: Client = prisma) {
  return client.trainingLesson.create({ data });
}

export function updateLesson(id: string, data: Prisma.TrainingLessonUpdateInput, client: Client = prisma) {
  return client.trainingLesson.update({ where: { id }, data });
}

export function deleteLesson(id: string, client: Client = prisma) {
  return client.trainingLesson.delete({ where: { id } });
}
