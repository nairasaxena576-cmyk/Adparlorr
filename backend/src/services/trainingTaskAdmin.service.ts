import type { TrainingTaskSubmissionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import {
  listAllTasks,
  findTaskById,
  createTask,
  updateTask,
  deleteTask,
} from '../repositories/trainingTask.repository';
import {
  findSubmissionById,
  listSubmissionsForAdmin,
  updateSubmissionStatus,
  countSubmissionsReferencingImageUrl,
} from '../repositories/trainingTaskSubmission.repository';
import { evaluateAndSetTaskTrainingCompletion } from './trainingTaskCompletion.service';
import type { SafeUser } from './auth.service';
import { uploadTrainingTaskImage, deleteTrainingTaskImage } from '../lib/supabaseStorage';

// ---- Tasks ----

export function listTasksForAdmin() {
  return listAllTasks();
}

export async function getTaskForAdmin(id: string) {
  const task = await findTaskById(id);
  if (!task) throw AppError.notFound('Task not found.');
  return task;
}

export interface CreateTaskInput {
  productName: string;
  imageUrl: string;
  instruction: string;
  isPublished?: boolean;
  isRequired?: boolean;
  order?: number;
}

export function createTaskForAdmin(input: CreateTaskInput) {
  return createTask({
    productName: input.productName,
    imageUrl: input.imageUrl,
    instruction: input.instruction,
    isPublished: input.isPublished ?? false,
    isRequired: input.isRequired ?? true,
    order: input.order ?? 0,
  });
}

export interface UpdateTaskInput {
  productName?: string;
  imageUrl?: string;
  instruction?: string;
  isPublished?: boolean;
  isRequired?: boolean;
  order?: number;
}

// Best-effort storage cleanup, gated on nothing still needing this exact
// image — a historical submission's own imageUrlSnapshot is untouched by
// either editing or deleting its task (TrainingTaskSubmission.taskId is
// onDelete: SetNull, not Cascade — submissions survive their task being
// deleted), so it's never safe to delete an image without checking first.
async function deleteImageIfUnreferenced(imageUrl: string) {
  const stillReferenced = await countSubmissionsReferencingImageUrl(imageUrl);
  if (stillReferenced === 0) {
    await deleteTrainingTaskImage(imageUrl);
  }
}

export async function updateTaskForAdmin(id: string, input: UpdateTaskInput) {
  const existing = await findTaskById(id);
  if (!existing) throw AppError.notFound('Task not found.');
  // Editing a task never rewrites past submissions — they keep their own
  // productNameSnapshot/imageUrlSnapshot taken at submit time.
  const updated = await updateTask(id, input);

  if (input.imageUrl && input.imageUrl !== existing.imageUrl) {
    await deleteImageIfUnreferenced(existing.imageUrl);
  }

  return updated;
}

export async function deleteTaskForAdmin(id: string) {
  const existing = await findTaskById(id);
  if (!existing) throw AppError.notFound('Task not found.');
  await deleteTask(id);
  // The task row is gone, but its submissions are NOT (onDelete: SetNull —
  // taskId is simply nulled on them) — their snapshots may still need this
  // exact image, so the same referenced-check applies here as on edit.
  await deleteImageIfUnreferenced(existing.imageUrl);
}

export async function uploadTaskImageForAdmin(file: Express.Multer.File): Promise<{ imageUrl: string }> {
  const { url } = await uploadTrainingTaskImage(file.buffer, file.mimetype);
  return { imageUrl: url };
}

export async function reorderTaskForAdmin(id: string, direction: 'up' | 'down') {
  const task = await findTaskById(id);
  if (!task) throw AppError.notFound('Task not found.');

  const siblings = (await listAllTasks()).sort((a, b) => a.order - b.order);
  const idx = siblings.findIndex((t) => t.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return findTaskById(id);

  const other = siblings[swapIdx];
  await prisma.$transaction([
    updateTask(id, { order: other.order }),
    updateTask(other.id, { order: task.order }),
  ]);
  return findTaskById(id);
}

// ---- Submissions ----

export function listSubmissionsForAdminService(status?: TrainingTaskSubmissionStatus) {
  return listSubmissionsForAdmin(status);
}

export async function getSubmissionForAdmin(id: string) {
  const submission = await findSubmissionById(id);
  if (!submission) throw AppError.notFound('Submission not found.');
  return submission;
}

async function requirePendingSubmission(id: string) {
  const submission = await findSubmissionById(id);
  if (!submission) throw AppError.notFound('Submission not found.');
  if (submission.status !== 'PENDING') {
    throw AppError.conflict('This submission has already been reviewed.');
  }
  return submission;
}

export interface ReviewSubmissionResult {
  submission: NonNullable<Awaited<ReturnType<typeof findSubmissionById>>>;
  user: SafeUser;
}

export async function approveSubmissionForAdmin(id: string, adminId: string): Promise<ReviewSubmissionResult> {
  const submission = await requirePendingSubmission(id);

  await updateSubmissionStatus(id, {
    status: 'APPROVED',
    reviewedById: adminId,
    reviewedAt: new Date(),
  });

  // Only an approval can ever complete training — see
  // trainingTaskCompletion.service.ts.
  const user = await evaluateAndSetTaskTrainingCompletion(submission.userId);
  const updated = await findSubmissionById(id);
  return { submission: updated!, user };
}

export async function rejectSubmissionForAdmin(
  id: string,
  adminId: string,
  rejectionReason: string
): Promise<NonNullable<Awaited<ReturnType<typeof findSubmissionById>>>> {
  await requirePendingSubmission(id);

  await updateSubmissionStatus(id, {
    status: 'REJECTED',
    reviewedById: adminId,
    reviewedAt: new Date(),
    rejectionReason,
  });

  return (await findSubmissionById(id))!;
}
