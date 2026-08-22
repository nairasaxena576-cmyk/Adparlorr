import type { Prisma, PrismaClient, TransactionStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export function listTransactionsForUser(userId: string, client: Client = prisma) {
  return client.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export function createTransaction(
  data: Prisma.TransactionUncheckedCreateInput,
  client: Client = prisma
) {
  return client.transaction.create({ data });
}

export function updateTransactionStatus(id: string, status: TransactionStatus, client: Client = prisma) {
  return client.transaction.update({ where: { id }, data: { status } });
}
