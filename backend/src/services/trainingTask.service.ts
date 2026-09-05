import type { TrainingTaskSubmissionStatus } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { listPublishedRequiredTasks, findPublishedTaskById } from '../repositories/trainingTask.repository';
import { listLatestSubmissionsForUser, createSubmission } from '../repositories/trainingTaskSubmission.repository';

// The customer-facing training path only ever consists of published +
// required tasks, walked in `order` — optional (isRequired: false) tasks
// are not part of this sequence and are never shown to customers. Keeping
// this simple was an explicit requirement: no course/chapter browsing, one
// task at a time.

export type CustomerTaskStatus = 'locked' | 'current' | 'completed';

export interface CustomerTaskSummary {
  id: string;
  order: number;
  status: CustomerTaskStatus;
  // productName doubles as the answer key — never sent to the customer
  // except for a task they've already had approved.
  productName: string | null;
  imageUrl: string | null;
  instruction: string | null;
  submissionStatus: TrainingTaskSubmissionStatus | null;
  rejectionReason: string | null;
}

async function buildCustomerTaskList(userId: string): Promise<CustomerTaskSummary[]> {
  const tasks = await listPublishedRequiredTasks();
  if (tasks.length === 0) return [];

  const taskIds = tasks.map((t) => t.id);
  const submissions = await listLatestSubmissionsForUser(userId, taskIds);

  // submissions is ordered createdAt desc, so the first occurrence per
  // taskId is that task's most recent submission. taskId can be null in
  // general (a submission survives its task being deleted — see
  // TrainingTaskSubmission's onDelete: SetNull), but every row here came
  // from a `taskId: { in: taskIds }` filter, which by definition can never
  // match a null column — the guard below is just satisfying the type
  // checker for that DB-level guarantee, not a real runtime possibility.
  const latestByTask = new Map<string, (typeof submissions)[number]>();
  for (const s of submissions) {
    if (!s.taskId) continue;
    if (!latestByTask.has(s.taskId)) latestByTask.set(s.taskId, s);
  }

  let currentAssigned = false;
  return tasks.map((task) => {
    const latest = latestByTask.get(task.id) ?? null;

    if (latest?.status === 'APPROVED') {
      return {
        id: task.id,
        order: task.order,
        status: 'completed' as const,
        productName: task.productName,
        imageUrl: task.imageUrl,
        instruction: task.instruction,
        submissionStatus: null,
        rejectionReason: null,
      };
    }

    if (!currentAssigned) {
      currentAssigned = true;
      return {
        id: task.id,
        order: task.order,
        status: 'current' as const,
        productName: null,
        imageUrl: task.imageUrl,
        instruction: task.instruction,
        submissionStatus: latest?.status ?? null,
        rejectionReason: latest?.status === 'REJECTED' ? latest.rejectionReason : null,
      };
    }

    return {
      id: task.id,
      order: task.order,
      status: 'locked' as const,
      productName: null,
      imageUrl: null,
      instruction: null,
      submissionStatus: null,
      rejectionReason: null,
    };
  });
}

export async function listTasksForCustomer(userId: string): Promise<CustomerTaskSummary[]> {
  return buildCustomerTaskList(userId);
}

export interface CustomerTaskProgress {
  totalRequired: number;
  completedCount: number;
  completed: boolean;
  currentTaskId: string | null;
}

export async function getProgressForCustomer(userId: string): Promise<CustomerTaskProgress> {
  const list = await buildCustomerTaskList(userId);
  const completedCount = list.filter((t) => t.status === 'completed').length;
  const current = list.find((t) => t.status === 'current');
  return {
    totalRequired: list.length,
    completedCount,
    completed: list.length > 0 && completedCount === list.length,
    currentTaskId: current?.id ?? null,
  };
}

export async function getTaskForCustomer(taskId: string, userId: string): Promise<CustomerTaskSummary> {
  const task = await findPublishedTaskById(taskId);
  if (!task || !task.isRequired) throw AppError.notFound('Task not found.');

  const list = await buildCustomerTaskList(userId);
  const entry = list.find((t) => t.id === taskId);
  if (!entry || entry.status === 'locked') throw AppError.notFound('Task not found.');

  return entry;
}

// Case-insensitive, whitespace-normalized exact match — deliberately not
// fuzzy. This is only a triage hint (isAutoMatch) shown to the reviewing
// admin; it never decides completion on its own.
function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface SubmitTaskResult {
  submissionId: string;
  status: TrainingTaskSubmissionStatus;
}

export async function submitTaskAnswerForCustomer(
  taskId: string,
  userId: string,
  submittedAnswer: string
): Promise<SubmitTaskResult> {
  const task = await findPublishedTaskById(taskId);
  if (!task || !task.isRequired) throw AppError.notFound('Task not found.');

  const list = await buildCustomerTaskList(userId);
  const entry = list.find((t) => t.id === taskId);
  if (!entry || entry.status === 'locked') throw AppError.notFound('Task not found.');
  if (entry.status === 'completed') throw AppError.conflict('This task has already been completed.');
  if (entry.submissionStatus === 'PENDING') {
    throw AppError.conflict('Your previous submission for this task is awaiting review.');
  }

  const isAutoMatch = normalizeAnswer(submittedAnswer) === normalizeAnswer(task.productName);

  const submission = await createSubmission({
    userId,
    taskId: task.id,
    submittedAnswer,
    isAutoMatch,
    productNameSnapshot: task.productName,
    imageUrlSnapshot: task.imageUrl,
    status: 'PENDING',
  });

  return { submissionId: submission.id, status: submission.status };
}
