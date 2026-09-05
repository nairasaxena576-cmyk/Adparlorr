import type { Prisma, PrismaClient, TrainingTaskSubmissionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export function createSubmission(data: Prisma.TrainingTaskSubmissionUncheckedCreateInput, client: Client = prisma) {
  return client.trainingTaskSubmission.create({ data });
}

export function findSubmissionById(id: string, client: Client = prisma) {
  return client.trainingTaskSubmission.findUnique({
    where: { id },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });
}

// Most recent submission a user has made for a given task, regardless of
// status — used to decide whether the customer currently has a pending
// review blocking resubmission, or an approved result already on file.
export function findLatestSubmissionForUserTask(userId: string, taskId: string, client: Client = prisma) {
  return client.trainingTaskSubmission.findFirst({
    where: { userId, taskId },
    orderBy: { createdAt: 'desc' },
  });
}

export function listLatestSubmissionsForUser(userId: string, taskIds: string[], client: Client = prisma) {
  return client.trainingTaskSubmission.findMany({
    where: { userId, taskId: { in: taskIds } },
    orderBy: { createdAt: 'desc' },
  });
}

export function listApprovedTaskIdsForUser(userId: string, taskIds: string[], client: Client = prisma) {
  return client.trainingTaskSubmission.findMany({
    where: { userId, taskId: { in: taskIds }, status: 'APPROVED' },
    select: { taskId: true },
    distinct: ['taskId'],
  });
}

// Used to decide whether it's safe to delete a storage object for an
// image that's being replaced/removed — never delete one still snapshotted
// by a historical submission.
export function countSubmissionsReferencingImageUrl(imageUrl: string, client: Client = prisma) {
  return client.trainingTaskSubmission.count({ where: { imageUrlSnapshot: imageUrl } });
}

export function listSubmissionsForAdmin(status: TrainingTaskSubmissionStatus | undefined, client: Client = prisma) {
  return client.trainingTaskSubmission.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function updateSubmissionStatus(
  id: string,
  data: Prisma.TrainingTaskSubmissionUncheckedUpdateInput,
  client: Client = prisma
) {
  return client.trainingTaskSubmission.update({ where: { id }, data });
}
