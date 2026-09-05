import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export function listSubmissionsForUser(userId: string, client: Client = prisma) {
  return client.taskSubmission.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { product: { select: { name: true, category: true } } },
  });
}

export function findSubmission(userId: string, productId: string, client: Client = prisma) {
  return client.taskSubmission.findUnique({
    where: { userId_productId: { userId, productId } },
  });
}

export function createSubmission(
  data: Prisma.TaskSubmissionUncheckedCreateInput,
  client: Client = prisma
) {
  return client.taskSubmission.create({ data });
}

export function deleteSubmissionsForUser(userId: string, client: Client = prisma) {
  return client.taskSubmission.deleteMany({ where: { userId } });
}

// ---- Workbench ----

// The specific productIds (within a given set) a user has already
// submitted — used to determine the workbench's current/remaining product.
export function listSubmittedProductIds(userId: string, productIds: string[], client: Client = prisma) {
  return client.taskSubmission.findMany({
    where: { userId, productId: { in: productIds } },
    select: { productId: true },
  });
}

export function sumCommissionSince(userId: string, since: Date, client: Client = prisma) {
  return client.taskSubmission.aggregate({
    where: { userId, createdAt: { gte: since } },
    _sum: { rewardAmount: true },
  });
}
