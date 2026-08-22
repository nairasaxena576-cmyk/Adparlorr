import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { listAllUsers, findUserById, updateUser } from '../repositories/user.repository';
import { deleteSubmissionsForUser } from '../repositories/taskSubmission.repository';
import { createTransaction } from '../repositories/transaction.repository';
import { toSafeUser, type SafeUser } from './auth.service';

export async function listUsersForAdmin(): Promise<SafeUser[]> {
  const users = await listAllUsers();
  return users.map(toSafeUser);
}

export async function creditUserSimulated(userId: string, amount: number): Promise<SafeUser> {
  const user = await findUserById(userId);
  if (!user) throw AppError.notFound('User not found.');

  const description = `Simulated admin credit (training exercise) — $${amount.toFixed(2)}`;

  const updated = await prisma.$transaction(async (tx) => {
    await createTransaction(
      { userId, type: 'ADMIN_CREDIT', amount, status: 'COMPLETED', description },
      tx
    );
    return updateUser(
      userId,
      { balance: { increment: amount }, totalDeposits: { increment: amount } },
      tx
    );
  });

  return toSafeUser(updated);
}

export async function resetUserTasksAdmin(userId: string): Promise<SafeUser> {
  const user = await findUserById(userId);
  if (!user) throw AppError.notFound('User not found.');

  const updated = await prisma.$transaction(async (tx) => {
    await deleteSubmissionsForUser(userId, tx);
    return updateUser(
      userId,
      { completedOrders: 0, mergeTriggered: false, isMerged: false },
      tx
    );
  });

  return toSafeUser(updated);
}
