import type { DepositStatus, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export function createDeposit(data: Prisma.DepositUncheckedCreateInput, client: Client = prisma) {
  return client.deposit.create({ data });
}

export function findDepositById(id: string, client: Client = prisma) {
  return client.deposit.findUnique({ where: { id } });
}

export function listDepositsForAdmin(status: DepositStatus | undefined, client: Client = prisma) {
  return client.deposit.findMany({
    where: status ? { status } : undefined,
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function updateDepositStatus(
  id: string,
  data: Prisma.DepositUncheckedUpdateInput,
  client: Client = prisma
) {
  return client.deposit.update({ where: { id }, data });
}
