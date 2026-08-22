import { AppError } from '../utils/AppError';
import { SIMULATION } from '../config/simulation';
import { listTransactionsForUser, createTransaction } from '../repositories/transaction.repository';
import { findUserById } from '../repositories/user.repository';

export async function listMyTransactions(userId: string) {
  const transactions = await listTransactionsForUser(userId);
  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    status: t.status,
    description: t.description,
    createdAt: t.createdAt,
  }));
}

// Deposit creation now lives in deposit.service.ts (per-asset, admin-reviewed
// workflow gated on training completion) — this file keeps the read-only
// transaction history and the (still fully simulated, unrelated) withdrawal
// request flow.

export type WithdrawOutcome =
  | { blocked: true; status: 'blocked'; message: string }
  | { blocked: false; status: 'pending_review'; message: string };

export async function requestSimulatedWithdrawal(userId: string): Promise<WithdrawOutcome> {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  const balance = Number(user.balance);

  if (balance < SIMULATION.MIN_WITHDRAWAL_BALANCE) {
    return {
      blocked: true,
      status: 'blocked',
      message: `Minimum balance of $${SIMULATION.MIN_WITHDRAWAL_BALANCE} required for withdrawal. Your current balance: $${balance.toFixed(2)}.`,
    };
  }

  await createTransaction({
    userId,
    type: 'WITHDRAW',
    amount: balance,
    status: 'PENDING',
    description:
      'Simulated withdrawal request (training exercise) — pending review, no funds transferred.',
  });

  return {
    blocked: false,
    status: 'pending_review',
    message: 'Your simulated withdrawal request has been submitted for review.',
  };
}
