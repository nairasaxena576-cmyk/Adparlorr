import type { CryptoAssetCode, Deposit, DepositStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { roundMoney } from '../utils/money';
import { findUserById, updateUser } from '../repositories/user.repository';
import { findAssetByCode } from '../repositories/cryptoAsset.repository';
import { createTransaction, updateTransactionStatus } from '../repositories/transaction.repository';
import {
  createDeposit,
  findDepositById,
  findPendingTrainingFundingDeposit,
  listDepositsForAdmin as listDepositsForAdminRepo,
  updateDepositStatus,
} from '../repositories/deposit.repository';
import { findReferralById, setReferralTrainingFunding } from '../repositories/referral.repository';
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
  // Set only when this deposit is a referrer paying their $1,000 training
  // funding obligation for a specific referral (see referral.service.ts) —
  // reuses this same deposit/approval flow rather than a separate payment
  // mechanism. Validated below against the caller's own referrals.
  trainingFundingReferralId?: string;
}

export interface CreateDepositResult {
  deposit: DepositDto;
  user: SafeUser;
}

async function validateTrainingFundingLink(userId: string, referralId: string, amount: number) {
  const referral = await findReferralById(referralId);
  if (!referral) throw AppError.notFound('Training referral not found.');
  if (referral.referrerId !== userId) {
    throw AppError.forbidden('You are not the referrer for this training funding request.');
  }
  if (referral.trainingFundingRequired === null) {
    throw AppError.badRequest('This referral has no training funding requirement.');
  }
  if (referral.trainingFundedAt) {
    throw AppError.conflict('Training funding has already been confirmed for this referral.');
  }
  if (roundMoney(amount) !== roundMoney(Number(referral.trainingFundingRequired))) {
    throw AppError.badRequest(
      `The training funding deposit must be exactly $${Number(referral.trainingFundingRequired).toFixed(2)}.`
    );
  }
  const existingPending = await findPendingTrainingFundingDeposit(referralId);
  if (existingPending) {
    throw AppError.conflict('A training funding deposit is already pending admin review for this referral.');
  }
}

export async function createDepositRequest(
  userId: string,
  input: CreateDepositInput
): Promise<CreateDepositResult> {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  // Funding someone else's training is not the same thing as "you must
  // complete your own training before depositing" — a referrer sponsoring a
  // trainee's $1,000 requirement is exempt from that ordinary customer gate.
  if (!input.trainingFundingReferralId && !user.trainingCompletedAt) {
    throw AppError.forbidden('Complete the required training before making a deposit.');
  }

  if (input.trainingFundingReferralId) {
    await validateTrainingFundingLink(userId, input.trainingFundingReferralId, input.amount);
  }

  const asset = await findAssetByCode(input.assetCode);
  if (!asset || !asset.isEnabled) {
    throw AppError.badRequest('This deposit method is currently unavailable.');
  }
  if (!asset.address) {
    throw AppError.badRequest('This deposit method is not yet configured. Please choose another option.');
  }

  const description = input.trainingFundingReferralId
    ? `Training funding deposit (training exercise) — ${input.assetCode} $${input.amount.toFixed(2)}`
    : `Simulated deposit (training exercise) — ${input.assetCode} $${input.amount.toFixed(2)}`;

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
        trainingFundingReferralId: input.trainingFundingReferralId ?? null,
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
    const result = await updateDepositStatus(
      depositId,
      { status: 'APPROVED', reviewedById: adminId, reviewedAt: new Date() },
      tx
    );

    // Approving the linked deposit IS what confirms the referral's training
    // funding — no separate debit/confirm step (see referral.service.ts's
    // training-access gate, which reads trainingFundedAt).
    if (deposit.trainingFundingReferralId) {
      await setReferralTrainingFunding(
        deposit.trainingFundingReferralId,
        { trainingFundedAt: new Date(), trainingFundingTxId: deposit.transactionId },
        tx
      );
    }

    return result;
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
