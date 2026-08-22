import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export function createReferral(
  data: Prisma.ReferralUncheckedCreateInput,
  client: Client = prisma
) {
  return client.referral.create({ data });
}

export function listReferralsMadeBy(referrerId: string) {
  return prisma.referral.findMany({
    where: { referrerId },
    include: { referredUser: { select: { fullName: true, createdAt: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function activateReferralFor(referredUserId: string, client: Client = prisma) {
  return client.referral.updateMany({
    where: { referredUserId, status: 'PENDING' },
    data: { status: 'ACTIVE' },
  });
}
