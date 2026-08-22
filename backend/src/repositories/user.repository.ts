import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export function findUserByEmail(email: string, client: Client = prisma) {
  return client.user.findUnique({ where: { email: email.toLowerCase() } });
}

export function findUserById(id: string, client: Client = prisma) {
  return client.user.findUnique({ where: { id } });
}

export function findUserByReferralCode(referralCode: string, client: Client = prisma) {
  return client.user.findUnique({ where: { referralCode } });
}

export function createUser(data: Prisma.UserCreateInput, client: Client = prisma) {
  return client.user.create({ data });
}

export function listAllUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
}

export function incrementSessionVersion(userId: string, client: Client = prisma) {
  return client.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
}

export function updateUser(id: string, data: Prisma.UserUpdateInput, client: Client = prisma) {
  return client.user.update({ where: { id }, data });
}
