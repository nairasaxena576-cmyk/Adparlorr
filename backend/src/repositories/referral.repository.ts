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

// At most one row can ever exist per referred user (referredUserId is
// @unique) — this is what makes "the referrer cannot be casually replaced"
// enforceable: once a row exists, verifyReferralForTraining only ever
// updates it if it matches the same referrer, never re-points it.
export function findReferralByReferredUserId(referredUserId: string, client: Client = prisma) {
  return client.referral.findUnique({
    where: { referredUserId },
    include: { referrer: { select: { id: true, fullName: true, completedOrders: true, totalDeposits: true } } },
  });
}

export function findReferralById(id: string, client: Client = prisma) {
  return client.referral.findUnique({
    where: { id },
    include: {
      referrer: { select: { id: true, fullName: true, balance: true } },
      referredUser: { select: { id: true, fullName: true } },
    },
  });
}

export function setReferralTrainingFunding(
  id: string,
  data: Prisma.ReferralUncheckedUpdateInput,
  client: Client = prisma
) {
  return client.referral.update({ where: { id }, data });
}
