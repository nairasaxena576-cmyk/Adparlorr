import type { CryptoAssetCode, Deposit, DepositStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { findUserById, updateUser } from '../repositories/user.repository';
import { findAssetByCode } from '../repositories/cryptoAsset.repository';
import { createTransaction, updateTransactionStatus } from '../repositories/transaction.repository';
import {
  createDeposit,
  findDepositById,
  listDepositsForAdmin as listDepositsForAdminRepo,
  updateDepositStatus,
} from '../repositories/deposit.repository';
import { toSafeUser, type SafeUser } from './auth.service';

export interface DepositDto {
  id: string;
  assetCode: CryptoAssetCode;
  amount: number;
  addressShown: string;
  status: DepositStatus;
  createdAt: Date;
  reviewedAt: Date | null;
}

function toDto(deposit: Deposit): DepositDto {
  return {
    id: deposit.id,
    assetCode: deposit.assetCode,
    amount: Number(deposit.amount),
    addressShown: deposit.addressShown,
    status: deposit.status,
    createdAt: deposit.createdAt,
    reviewedAt: deposit.reviewedAt,
  };
}

export interface CreateDepositInput {
  assetCode: CryptoAssetCode;
  amount: number;
}

export interface CreateDepositResult {
  deposit: DepositDto;
  user: SafeUser;
}

export async function createDepositRequest(
  userId: string,
  input: CreateDepositInput
): Promise<CreateDepositResult> {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  if (!user.trainingCompletedAt) {
    throw AppError.forbidden('Complete the required training before making a deposit.');
  }

  const asset = await findAssetByCode(input.assetCode);
  if (!asset || !asset.isEnabled) {
    throw AppError.badRequest('This deposit method is currently unavailable.');
  }
  if (!asset.address) {
    throw AppError.badRequest('This deposit method is not yet configured. Please choose another option.');
  }

  const description = `Simulated deposit (training exercise) — ${input.assetCode} $${input.amount.toFixed(2)}`;

  const deposit = await prisma.$transaction(async (tx) => {
    const transaction = await createTransaction(
      { userId, type: 'DEPOSIT', amount: input.amount, status: 'PENDING', description },
      tx
    );

    return createDeposit(
      {
        userId,
        assetCode: input.assetCode,
        amount: input.amount,
        addressShown: asset.address as string,
        status: 'PENDING',
        transactionId: transaction.id,
      },
      tx
    );
  });

  return { deposit: toDto(deposit), user: toSafeUser(user) };
}

export interface AdminDepositDto extends DepositDto {
  user: { id: string; fullName: string; email: string };
}

export async function listDepositsForAdmin(status?: DepositStatus): Promise<AdminDepositDto[]> {
  const deposits = await listDepositsForAdminRepo(status);
  return deposits.map((d) => ({
    ...toDto(d),
    user: { id: d.user.id, fullName: d.user.fullName, email: d.user.email },
  }));
}

async function requirePendingDeposit(depositId: string) {
  const deposit = await findDepositById(depositId);
  if (!deposit) throw AppError.notFound('Deposit not found.');
  if (deposit.status !== 'PENDING') {
    throw AppError.conflict('This deposit has already been reviewed.');
  }
  return deposit;
}

export async function approveDeposit(depositId: string, adminId: string): Promise<DepositDto> {
  const deposit = await requirePendingDeposit(depositId);
  const user = await findUserById(deposit.userId);
  if (!user) throw AppError.notFound('User not found.');

  const amount = Number(deposit.amount);
  // Real deposits only ever affect the real Wallet balance/totalDeposits —
  // they have no bearing on the workbench's separate demo simulation
  // (User.workbenchBalance/isMerged), which can only be resolved via
  // order.service.ts's resolveDemoShortfall(). See schema.prisma's
  // workbenchBalance doc comment for the full separation rationale.
  const updated = await prisma.$transaction(async (tx) => {
    await updateTransactionStatus(deposit.transactionId, 'COMPLETED', tx);
    await updateUser(
      deposit.userId,
      {
        balance: { increment: amount },
        totalDeposits: { increment: amount },
      },
      tx
    );
    return updateDepositStatus(
      depositId,
      { status: 'APPROVED', reviewedById: adminId, reviewedAt: new Date() },
      tx
    );
  });

  return toDto(updated);
}

export async function rejectDeposit(depositId: string, adminId: string): Promise<DepositDto> {
  const deposit = await requirePendingDeposit(depositId);

  const updated = await prisma.$transaction(async (tx) => {
    await updateTransactionStatus(deposit.transactionId, 'FAILED', tx);
    return updateDepositStatus(
      depositId,
      { status: 'REJECTED', reviewedById: adminId, reviewedAt: new Date() },
      tx
    );
  });

  return toDto(updated);
}
