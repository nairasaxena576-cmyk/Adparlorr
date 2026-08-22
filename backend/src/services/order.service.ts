import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { SIMULATION } from '../config/simulation';
import { findProductById } from '../repositories/product.repository';
import {
  createSubmission,
  findSubmission,
  listSubmissionsForUser,
} from '../repositories/taskSubmission.repository';
import { createTransaction } from '../repositories/transaction.repository';
import { findUserById, updateUser } from '../repositories/user.repository';
import { activateReferralFor } from '../repositories/referral.repository';
import { toSafeUser, type SafeUser } from './auth.service';

export async function listMySubmissions(userId: string) {
  const submissions = await listSubmissionsForUser(userId);
  return submissions.map((s) => ({
    id: s.id,
    productId: s.productId,
    rewardAmount: Number(s.rewardAmount),
    costAmount: Number(s.costAmount),
    createdAt: s.createdAt,
  }));
}

export interface SubmitOrderResult {
  submission: { id: string; productId: string; rewardAmount: number; costAmount: number };
  user: SafeUser;
  mergeTriggered: boolean;
}

export async function submitOrder(userId: string, productId: string): Promise<SubmitOrderResult> {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  if (user.isMerged) {
    throw AppError.badRequest(
      'You have a merged product pending. Please contact Support to deposit and continue.'
    );
  }

  const product = await findProductById(productId);
  if (!product || !product.isActive) {
    throw AppError.notFound('Product not found.');
  }

  const already = await findSubmission(userId, productId);
  if (already) {
    throw AppError.conflict('Already submitted.');
  }

  const newCompleted = user.completedOrders + 1;
  const shouldTriggerMerge = newCompleted >= SIMULATION.MERGE_THRESHOLD && !user.mergeTriggered;
  const wasFirstTask = user.completedOrders === 0;
  const netAmount = Number(product.reward) - Number(product.cost);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const submission = await createSubmission(
        { userId, productId, rewardAmount: product.reward, costAmount: product.cost },
        tx
      );

      const updated = await updateUser(
        userId,
        {
          balance: { increment: netAmount },
          totalEarnings: { increment: product.reward },
          completedOrders: newCompleted,
          ...(shouldTriggerMerge ? { mergeTriggered: true, isMerged: true } : {}),
        },
        tx
      );

      if (!shouldTriggerMerge) {
        await createTransaction(
          {
            userId,
            type: 'TASK_REWARD',
            amount: netAmount,
            status: 'COMPLETED',
            description: `Submitted ${product.name}`,
          },
          tx
        );
      }

      if (wasFirstTask) {
        await activateReferralFor(userId, tx);
      }

      return { submission, updated };
    });

    return {
      submission: {
        id: result.submission.id,
        productId: result.submission.productId,
        rewardAmount: Number(result.submission.rewardAmount),
        costAmount: Number(result.submission.costAmount),
      },
      user: toSafeUser(result.updated),
      mergeTriggered: shouldTriggerMerge,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw AppError.conflict('Already submitted.');
    }
    throw err;
  }
}
