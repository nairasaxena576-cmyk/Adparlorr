import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { findUserById } from '../repositories/user.repository';
import { findPublishedCourseWithContent } from '../repositories/trainingCourse.repository';
import {
  findAssessmentByCourseId,
  findAssessmentById,
  updateAssessment,
  findQuestionById,
  listQuestionsByAssessment,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  deleteAnswersByQuestion,
} from '../repositories/trainingAssessment.repository';
import { upsertProgressResult } from '../repositories/trainingProgress.repository';
import { toSafeUser, type SafeUser } from './auth.service';
import { evaluateAndSetTrainingCompletion } from './training.service';

async function requirePublishedCourse(courseId: string) {
  const course = await findPublishedCourseWithContent(courseId);
  if (!course) throw AppError.notFound('Course not found.');
  return course;
}

// ---- Customer-facing ----

export interface CustomerAssessment {
  id: string;
  title: string;
  passingScore: number;
  questions: { id: string; question: string; points: number; answers: { id: string; answer: string }[] }[];
}

export async function getAssessmentForCustomer(courseId: string): Promise<CustomerAssessment> {
  await requirePublishedCourse(courseId);
  const assessment = await findAssessmentByCourseId(courseId);
  if (!assessment || !assessment.isPublished) throw AppError.notFound('Assessment not found.');

  return {
    id: assessment.id,
    title: assessment.title,
    passingScore: assessment.passingScore,
    questions: assessment.questions.map((q) => ({
      id: q.id,
      question: q.question,
      points: q.points,
      // isCorrect deliberately omitted — never expose correct answers to customers.
      answers: q.answers.map((a) => ({ id: a.id, answer: a.answer })),
    })),
  };
}

export interface SubmitAssessmentInput {
  answers: { questionId: string; answerId: string }[];
}

export interface SubmitAssessmentResult {
  score: number;
  passingScore: number;
  passed: boolean;
  user: SafeUser;
}

export async function submitAssessmentForCustomer(
  userId: string,
  courseId: string,
  input: SubmitAssessmentInput
): Promise<SubmitAssessmentResult> {
  await requirePublishedCourse(courseId);
  const assessment = await findAssessmentByCourseId(courseId);
  if (!assessment || !assessment.isPublished) throw AppError.notFound('Assessment not found.');
  if (assessment.questions.length === 0) {
    throw AppError.badRequest('This assessment has no questions configured yet.');
  }
  if (input.answers.length !== assessment.questions.length) {
    throw AppError.badRequest('All questions must be answered.');
  }

  // Scoring is computed entirely server-side from the stored correct-answer
  // flags — the client only ever supplies which answerId it picked per
  // question, never a score or pass/fail verdict.
  let earned = 0;
  let total = 0;
  for (const question of assessment.questions) {
    total += question.points;
    const submitted = input.answers.find((a) => a.questionId === question.id);
    if (!submitted) throw AppError.badRequest('All questions must be answered.');
    const chosen = question.answers.find((a) => a.id === submitted.answerId);
    if (!chosen) throw AppError.badRequest('Invalid answer selection.');
    if (chosen.isCorrect) earned += question.points;
  }

  const score = total > 0 ? Math.round((earned / total) * 100) : 0;
  const passed = score >= assessment.passingScore;

  await upsertProgressResult(userId, courseId, { score, passed });

  const user = passed
    ? await evaluateAndSetTrainingCompletion(userId)
    : toSafeUser((await findUserById(userId))!);

  return { score, passingScore: assessment.passingScore, passed, user };
}

// ---- Admin ----

export async function getAssessmentForAdmin(courseId: string) {
  const assessment = await findAssessmentByCourseId(courseId);
  if (!assessment) throw AppError.notFound('Assessment not found for this course.');
  return assessment;
}

export interface UpdateAssessmentInput {
  title?: string;
  passingScore?: number;
  isPublished?: boolean;
}

export async function updateAssessmentForAdmin(courseId: string, input: UpdateAssessmentInput) {
  const assessment = await findAssessmentByCourseId(courseId);
  if (!assessment) throw AppError.notFound('Assessment not found for this course.');
  return updateAssessment(assessment.id, input);
}

export interface AnswerInput {
  answer: string;
  isCorrect: boolean;
  order: number;
}

export interface CreateQuestionInput {
  question: string;
  points: number;
  order: number;
  answers: AnswerInput[];
}

export async function createQuestionForAdmin(assessmentId: string, input: CreateQuestionInput) {
  const assessment = await findAssessmentById(assessmentId);
  if (!assessment) throw AppError.notFound('Assessment not found.');

  return createQuestion({
    assessmentId,
    question: input.question,
    points: input.points,
    order: input.order,
    answers: { create: input.answers },
  });
}

export interface UpdateQuestionInput {
  question?: string;
  points?: number;
  order?: number;
  answers?: AnswerInput[];
}

export async function updateQuestionForAdmin(questionId: string, input: UpdateQuestionInput) {
  const existing = await findQuestionById(questionId);
  if (!existing) throw AppError.notFound('Question not found.');

  if (input.answers) {
    await prisma.$transaction(async (tx) => {
      await deleteAnswersByQuestion(questionId, tx);
      await updateQuestion(
        questionId,
        {
          question: input.question,
          points: input.points,
          order: input.order,
          answers: { create: input.answers },
        },
        tx
      );
    });
  } else {
    await updateQuestion(questionId, {
      question: input.question,
      points: input.points,
      order: input.order,
    });
  }

  return findQuestionById(questionId);
}

export async function deleteQuestionForAdmin(questionId: string) {
  const existing = await findQuestionById(questionId);
  if (!existing) throw AppError.notFound('Question not found.');
  await deleteQuestion(questionId);
}

export async function reorderQuestionForAdmin(questionId: string, direction: 'up' | 'down') {
  const question = await findQuestionById(questionId);
  if (!question) throw AppError.notFound('Question not found.');

  const siblings = (await listQuestionsByAssessment(question.assessmentId)).sort((a, b) => a.order - b.order);
  const idx = siblings.findIndex((q) => q.id === questionId);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) {
    return findQuestionById(questionId);
  }

  const other = siblings[swapIdx];
  await prisma.$transaction([
    updateQuestion(questionId, { order: other.order }),
    updateQuestion(other.id, { order: question.order }),
  ]);

  return findQuestionById(questionId);
}
