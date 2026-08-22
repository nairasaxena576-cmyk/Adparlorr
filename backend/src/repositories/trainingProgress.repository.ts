import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export function findProgress(userId: string, courseId: string, client: Client = prisma) {
  return client.userTrainingProgress.findUnique({ where: { userId_courseId: { userId, courseId } } });
}

export function listProgressForUser(userId: string, courseIds: string[], client: Client = prisma) {
  return client.userTrainingProgress.findMany({ where: { userId, courseId: { in: courseIds } } });
}

export function upsertProgressResult(
  userId: string,
  courseId: string,
  input: { score: number; passed: boolean },
  client: Client = prisma
) {
  return client.userTrainingProgress.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: {
      userId,
      courseId,
      score: input.score,
      passed: input.passed,
      attempts: 1,
      completedAt: input.passed ? new Date() : null,
    },
    update: {
      score: input.score,
      passed: input.passed,
      attempts: { increment: 1 },
      completedAt: input.passed ? new Date() : undefined,
    },
  });
}

export function deleteProgressForCourse(courseId: string, userId: string | undefined, client: Client = prisma) {
  return client.userTrainingProgress.deleteMany({
    where: { courseId, ...(userId ? { userId } : {}) },
  });
}

export function listUserIdsWithProgressForCourse(courseId: string, client: Client = prisma) {
  return client.userTrainingProgress.findMany({ where: { courseId }, select: { userId: true } });
}

// ---- Lesson completions ----

export function findLessonCompletion(userId: string, lessonId: string, client: Client = prisma) {
  return client.userLessonCompletion.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
}

export function listCompletedLessonIds(userId: string, lessonIds: string[], client: Client = prisma) {
  return client.userLessonCompletion.findMany({
    where: { userId, lessonId: { in: lessonIds } },
    select: { lessonId: true },
  });
}

export function markLessonComplete(userId: string, lessonId: string, client: Client = prisma) {
  return client.userLessonCompletion.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId },
    update: {},
  });
}

export function deleteLessonCompletionsForCourse(
  courseId: string,
  userId: string | undefined,
  client: Client = prisma
) {
  return client.userLessonCompletion.deleteMany({
    where: {
      userId: userId ?? undefined,
      lesson: { chapter: { courseId } },
    },
  });
}
