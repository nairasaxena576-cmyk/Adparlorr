import type { TrainingTaskSubmissionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { roundMoney } from '../utils/money';
import { listPublishedRequiredTasks, findPublishedTaskById } from '../repositories/trainingTask.repository';
import { listLatestSubmissionsForUser, createSubmission } from '../repositories/trainingTaskSubmission.repository';
import { listWorkbenchProducts } from '../repositories/product.repository';
import { findUserById, updateUser } from '../repositories/user.repository';
import { createTransaction } from '../repositories/transaction.repository';
import { getTrainingReferralStatus } from './referral.service';
import { evaluateAndSetTaskTrainingCompletion } from './trainingTaskCompletion.service';

// The one educational Merged Product task is identified by name, not a
// hardcoded order number — orders can be reordered by an admin; the name is
// the stable identity (see productAdmin.schema.ts / trainingTaskAdmin
// pattern, which already treats productName as the stable per-task key).
const MERGED_PRODUCT_TASK_NAME = 'Merged Product Balance';

// Every training-access endpoint below (list/get/progress/submit) requires
// this. Nothing here trusts the frontend — referral verification, referrer
// tier, and funding state are all resolved server-side (see
// referral.service.ts). Never bypassed by a client-supplied flag.
async function assertTrainingUnlocked(userId: string): Promise<void> {
  const status = await getTrainingReferralStatus(userId);
  if (!status.hasReferral) {
    throw AppError.forbidden('Enter your inviter referral code before starting training.');
  }
  if (!status.tierEligible) {
    throw AppError.forbidden('Your referral is not yet eligible — the inviter must be Gold or Platinum tier.');
  }
  if (!status.fundingComplete) {
    throw AppError.forbidden('Training is locked until your referrer\'s required training funding is confirmed.');
  }

  // Applies to every gated training endpoint (list/get/progress/submit),
  // not just submission — a training-induced negative balance (see
  // applyMergedProductTrainingEvent below) locks the whole training area
  // until an admin resolves it (admin.service.ts's
  // resolveTrainingNegativeBalance), separate from and never affecting the
  // unrelated workbench commission ledger (User.workbenchBalance).
  const user = await findUserById(userId);
  if (user && Number(user.balance) < 0) {
    throw AppError.forbidden(
      'Your account balance is negative from the Merged Product training event. An admin must resolve this before you can continue.'
    );
  }
}

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
  await assertTrainingUnlocked(userId);
  return buildCustomerTaskList(userId);
}

export interface CustomerTaskProgress {
  totalRequired: number;
  completedCount: number;
  completed: boolean;
  currentTaskId: string | null;
}

export async function getProgressForCustomer(userId: string): Promise<CustomerTaskProgress> {
  await assertTrainingUnlocked(userId);
  return buildProgressSummary(userId);
}

async function buildProgressSummary(userId: string): Promise<CustomerTaskProgress> {
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

// Unlike getProgressForCustomer, this is NOT gated by assertTrainingUnlocked
// — for admin visibility only (see admin.service.ts's training overview
// listing), which needs to see a customer's progress regardless of whether
// their own referral/funding gate is currently satisfied.
export async function getProgressForAdmin(userId: string): Promise<CustomerTaskProgress> {
  return buildProgressSummary(userId);
}

export async function getTaskForCustomer(taskId: string, userId: string): Promise<CustomerTaskSummary> {
  await assertTrainingUnlocked(userId);
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

// The one Merged Product educational task additionally triggers a real,
// server-computed negative-balance event on the customer's own real
// account — separate and independent from the unrelated workbench
// commission ledger (User.workbenchBalance), which is never touched
// here. Commission is 6x the normal 1% workbench rate (per the approved
// spec), computed from the customer's actual next 1-3 eligible workbench
// products — real Product rows, never a hardcoded amount. This never
// creates a TaskSubmission/order row; it's a standalone, auditable
// Transaction against the customer's real balance.
async function applyMergedProductTrainingEvent(userId: string): Promise<void> {
  const eligible = await listWorkbenchProducts();
  if (eligible.length === 0) return; // nothing real to compute from — no-op rather than inventing a number

  const bundle = eligible.slice(0, Math.min(3, eligible.length));
  const combinedPrice = roundMoney(bundle.reduce((sum, p) => sum + Number(p.price), 0));
  const commission = roundMoney(combinedPrice * 0.01 * 6); // six times the normal 1% rate
  const netAmount = roundMoney(commission - combinedPrice);
  if (netAmount === 0) return;

  const productNames = bundle.map((p) => p.name).join(', ');
  await prisma.$transaction(async (tx) => {
    await createTransaction(
      {
        userId,
        type: 'TASK_REWARD',
        amount: netAmount,
        status: 'COMPLETED',
        description: `Training: Merged Product event (${productNames}) — combined price $${combinedPrice.toFixed(2)}, commission $${commission.toFixed(2)} (6x normal rate).`,
      },
      tx
    );
    await updateUser(userId, { balance: { increment: netAmount } }, tx);
  });
}

export async function submitTaskAnswerForCustomer(
  taskId: string,
  userId: string,
  submittedAnswer: string
): Promise<SubmitTaskResult> {
  await assertTrainingUnlocked(userId);

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

  // Customer training submissions are auto-approved immediately — this
  // applies ONLY to this endpoint (customer TrainingTask submissions).
  // Order/workbench submissions (order.service.ts) and the legacy
  // admin-reviewed path (trainingTaskAdmin.service.ts's approve/reject,
  // still present for compatibility) are entirely untouched.
  const submission = await createSubmission({
    userId,
    taskId: task.id,
    submittedAnswer,
    isAutoMatch,
    productNameSnapshot: task.productName,
    imageUrlSnapshot: task.imageUrl,
    status: 'APPROVED',
    reviewedAt: new Date(),
  });

  if (task.productName === MERGED_PRODUCT_TASK_NAME) {
    await applyMergedProductTrainingEvent(userId);
  }

  // Mirrors what an admin approval already does (approveSubmissionForAdmin)
  // — idempotent by construction (early-returns once trainingCompletedAt is
  // already set), so this can never double-fire even if called again.
  await evaluateAndSetTaskTrainingCompletion(userId);

  return { submissionId: submission.id, status: submission.status };
}
