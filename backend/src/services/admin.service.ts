import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { listAllUsers, findUserById, updateUser } from '../repositories/user.repository';
import { deleteSubmissionsForUser } from '../repositories/taskSubmission.repository';
import { createTransaction } from '../repositories/transaction.repository';
import { findReferralById, setReferralTrainingFunding } from '../repositories/referral.repository';
import { toSafeUser, type SafeUser } from './auth.service';
import { roundMoney } from '../utils/money';
import { resolveEffectiveTier, tierRank, tierUnlockAmount, type Tier } from '../utils/tiers';
import { getProgressForAdmin } from './trainingTask.service';

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

// ---- Training-access admin actions ----
// Both actions below are admin-only (see admin.routes.ts's requireRole),
// transactional, and never overwrite a balance directly — every change goes
// through a real Transaction row, same pattern as creditUserSimulated above
// and approveDeposit in deposit.service.ts.

export interface TrainingFundingResult {
  referralId: string;
  fundedAmount: number;
  referrerBalance: number;
  transactionId: string;
}

// The referrer's own real balance is debited by the required funding
// amount (recorded on the Referral row when the referral was verified for
// training — see referral.service.ts) — this represents the referrer
// actually providing that funding, not money being invented from nowhere.
export async function confirmTrainingFunding(referralId: string, adminId: string): Promise<TrainingFundingResult> {
  const referral = await findReferralById(referralId);
  if (!referral) throw AppError.notFound('Referral not found.');
  if (referral.trainingFundedAt) throw AppError.conflict('Training funding has already been confirmed for this referral.');
  if (referral.trainingFundingRequired === null) {
    throw AppError.badRequest('This referral has not been verified for training yet — no funding is required.');
  }

  const amount = roundMoney(Number(referral.trainingFundingRequired));
  const referrerBalance = Number(referral.referrer.balance);
  if (referrerBalance < amount) {
    throw AppError.conflict(
      `The referrer does not have sufficient balance to fund training — $${amount.toFixed(2)} required, $${referrerBalance.toFixed(2)} available.`
    );
  }

  const admin = await findUserById(adminId);
  const description = `Training funding provided for ${referral.referredUser.fullName} (confirmed by admin ${admin?.fullName ?? adminId}).`;

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await createTransaction(
      { userId: referral.referrerId, type: 'WITHDRAW', amount, status: 'COMPLETED', description },
      tx
    );
    const updatedReferrer = await updateUser(referral.referrerId, { balance: { decrement: amount } }, tx);
    await setReferralTrainingFunding(
      referralId,
      { trainingFundedAt: new Date(), trainingFundingTxId: transaction.id },
      tx
    );
    return { transactionId: transaction.id, referrerBalance: Number(updatedReferrer.balance) };
  });

  return {
    referralId,
    fundedAmount: amount,
    referrerBalance: result.referrerBalance,
    transactionId: result.transactionId,
  };
}

export interface ResolveNegativeBalanceResult {
  userId: string;
  amountResolved: number;
  newBalance: number;
  transactionId: string;
}

// Resolves a negative real balance caused by the training Merged Product
// event (see trainingTask.service.ts's applyMergedProductTrainingEvent) —
// the only mechanism in the app that can put a real User.balance below
// zero. Unrelated to the workbench's own demo ledger (User.workbenchBalance,
// see order.service.ts), which only ever credits commission and can no
// longer go negative.
export async function resolveTrainingNegativeBalance(
  userId: string,
  adminId: string
): Promise<ResolveNegativeBalanceResult> {
  const user = await findUserById(userId);
  if (!user) throw AppError.notFound('User not found.');

  const balance = Number(user.balance);
  if (balance >= 0) throw AppError.conflict('This account does not have a negative balance to resolve.');

  const amountResolved = roundMoney(-balance);
  const admin = await findUserById(adminId);
  const description = `Admin resolution of training-related negative balance — $${amountResolved.toFixed(2)} credited (resolved by admin ${admin?.fullName ?? adminId}).`;

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await createTransaction(
      { userId, type: 'ADMIN_CREDIT', amount: amountResolved, status: 'COMPLETED', description },
      tx
    );
    const updated = await updateUser(userId, { balance: { increment: amountResolved } }, tx);
    return { transactionId: transaction.id, newBalance: Number(updated.balance) };
  });

  return { userId, amountResolved, newBalance: result.newBalance, transactionId: result.transactionId };
}

export interface TrainingOverviewRow {
  referralId: string;
  customer: { id: string; fullName: string; email: string; balance: number };
  referrer: { id: string; fullName: string; tier: Tier } | null;
  referralCode: string;
  trainingFundingRequired: number | null;
  trainingFundedAt: string | null;
  trainingProgress: { completedCount: number; totalRequired: number };
  trainingCompletedAt: string | null;
  hasNegativeBalance: boolean;
  // The referrer's most recent training-funding deposit for this referral
  // (see deposit.service.ts) — the "submitted proof/details" an admin
  // reviews before approving. Null until the referrer actually deposits.
  fundingDeposit: {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    amount: number;
    assetCode: string;
    createdAt: string;
  } | null;
}

// Minimum-necessary admin visibility for the training/referral workflow
// (item 17 of the approved spec) — read-only, reuses existing repositories/
// services rather than adding new admin UI surface.
export async function listTrainingOverviewForAdmin(): Promise<TrainingOverviewRow[]> {
  const referrals = await prisma.referral.findMany({
    include: {
      referrer: {
        select: { id: true, fullName: true, referralCode: true, completedOrders: true, totalDeposits: true, manualTier: true },
      },
      referredUser: { select: { id: true, fullName: true, email: true, balance: true, trainingCompletedAt: true } },
      fundingDeposits: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  const rows: TrainingOverviewRow[] = [];
  for (const r of referrals) {
    const progress = await getProgressForAdmin(r.referredUserId);
    const latestDeposit = r.fundingDeposits[0] ?? null;
    rows.push({
      referralId: r.id,
      customer: {
        id: r.referredUser.id,
        fullName: r.referredUser.fullName,
        email: r.referredUser.email,
        balance: Number(r.referredUser.balance),
      },
      referrer: {
        id: r.referrer.id,
        fullName: r.referrer.fullName,
        tier: resolveEffectiveTier(r.referrer.completedOrders, Number(r.referrer.totalDeposits), r.referrer.manualTier),
      },
      referralCode: r.referrer.referralCode,
      trainingFundingRequired: r.trainingFundingRequired ? Number(r.trainingFundingRequired) : null,
      trainingFundedAt: r.trainingFundedAt ? r.trainingFundedAt.toISOString() : null,
      trainingProgress: { completedCount: progress.completedCount, totalRequired: progress.totalRequired },
      trainingCompletedAt: r.referredUser.trainingCompletedAt ? r.referredUser.trainingCompletedAt.toISOString() : null,
      hasNegativeBalance: Number(r.referredUser.balance) < 0,
      fundingDeposit: latestDeposit
        ? {
            id: latestDeposit.id,
            status: latestDeposit.status,
            amount: Number(latestDeposit.amount),
            assetCode: latestDeposit.assetCode,
            createdAt: latestDeposit.createdAt.toISOString(),
          }
        : null,
    });
  }
  return rows;
}

// ---- Pay-to-unlock tier admin action ----
// A customer can reach a higher tier either by the existing automatic
// completedOrders+totalDeposits progression (unchanged), or by depositing
// at least that tier's existing minDeposits amount through the existing
// real deposit flow and having an admin confirm it here. This never
// invents money or overwrites balance — it only sets a tier override,
// auditable via a zero-amount Transaction row recording who granted it.
export async function grantTierForUser(userId: string, tier: Tier, adminId: string): Promise<SafeUser> {
  if (tier === 'Bronze') {
    throw AppError.badRequest('Bronze is the default tier and cannot be granted.');
  }

  const user = await findUserById(userId);
  if (!user) throw AppError.notFound('User not found.');

  const currentEffective = resolveEffectiveTier(user.completedOrders, Number(user.totalDeposits), user.manualTier);
  if (tierRank(tier) <= tierRank(currentEffective)) {
    throw AppError.conflict(`This user is already at or above ${tier} tier (current: ${currentEffective}).`);
  }

  const admin = await findUserById(adminId);
  const unlockAmount = tierUnlockAmount(tier);
  const description = `Tier unlocked: ${tier} (requires $${unlockAmount.toFixed(2)} deposited — granted by admin ${admin?.fullName ?? adminId}).`;

  const updated = await prisma.$transaction(async (tx) => {
    await createTransaction({ userId, type: 'ADMIN_CREDIT', amount: 0, status: 'COMPLETED', description }, tx);
    return updateUser(userId, { manualTier: tier, manualTierGrantedAt: new Date() }, tx);
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
      { completedOrders: 0, mergeTriggered: false, mergedMilestonesReached: 0, isMerged: false },
      tx
    );
  });

  return toSafeUser(updated);
}
