import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export function listSubmissionsForUser(userId: string, client: Client = prisma) {
  return client.taskSubmission.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
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
