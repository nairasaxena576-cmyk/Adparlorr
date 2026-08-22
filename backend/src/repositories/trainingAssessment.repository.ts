import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export function findAssessmentByCourseId(courseId: string, client: Client = prisma) {
  return client.trainingAssessment.findUnique({
    where: { courseId },
    include: { questions: { orderBy: { order: 'asc' }, include: { answers: { orderBy: { order: 'asc' } } } } },
  });
}

export function findAssessmentById(id: string, client: Client = prisma) {
  return client.trainingAssessment.findUnique({ where: { id } });
}

export function createAssessment(data: Prisma.TrainingAssessmentUncheckedCreateInput, client: Client = prisma) {
  return client.trainingAssessment.create({ data });
}

export function updateAssessment(
  id: string,
  data: Prisma.TrainingAssessmentUpdateInput,
  client: Client = prisma
) {
  return client.trainingAssessment.update({ where: { id }, data });
}

// ---- Questions ----

export function findQuestionById(id: string, client: Client = prisma) {
  return client.trainingQuestion.findUnique({ where: { id }, include: { answers: true } });
}

export function listQuestionsByAssessment(assessmentId: string, client: Client = prisma) {
  return client.trainingQuestion.findMany({ where: { assessmentId }, orderBy: { order: 'asc' } });
}

export function createQuestion(data: Prisma.TrainingQuestionUncheckedCreateInput, client: Client = prisma) {
  return client.trainingQuestion.create({ data, include: { answers: true } });
}

export function updateQuestion(id: string, data: Prisma.TrainingQuestionUpdateInput, client: Client = prisma) {
  return client.trainingQuestion.update({ where: { id }, data });
}

export function deleteQuestion(id: string, client: Client = prisma) {
  return client.trainingQuestion.delete({ where: { id } });
}

// ---- Answers ----

export function createAnswer(data: Prisma.TrainingAnswerUncheckedCreateInput, client: Client = prisma) {
  return client.trainingAnswer.create({ data });
}

export function updateAnswer(id: string, data: Prisma.TrainingAnswerUpdateInput, client: Client = prisma) {
  return client.trainingAnswer.update({ where: { id }, data });
}

export function deleteAnswer(id: string, client: Client = prisma) {
  return client.trainingAnswer.delete({ where: { id } });
}

export function deleteAnswersByQuestion(questionId: string, client: Client = prisma) {
  return client.trainingAnswer.deleteMany({ where: { questionId } });
}
