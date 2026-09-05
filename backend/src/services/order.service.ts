import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { roundMoney } from '../utils/money';
import { SIMULATION } from '../config/simulation';
import { listWorkbenchProducts } from '../repositories/product.repository';
import {
  createSubmission,
  listSubmissionsForUser,
  listSubmittedProductIds,
  sumCommissionSince,
} from '../repositories/taskSubmission.repository';
import { findUserById, updateUser } from '../repositories/user.repository';
import { activateReferralFor } from '../repositories/referral.repository';
import { toSafeUser, type SafeUser } from './auth.service';

// ---------------------------------------------------------------------------
// Workbench business rules (server is the sole source of truth — the
// frontend only ever displays what these functions return). Everything
// here is DEMO/SIMULATION accounting, entirely separate from the real
// Wallet/crypto-deposit system:
//
//   One workbench set is always exactly SIMULATION.WORKBENCH_SET_SIZE (45)
//   product slots — the first N eligible (active + priced) products by
//   displayOrder, never derived from however many happen to exist. Fewer
//   than 45 eligible products means the workbench isn't ready yet.
//
//   Normal product:  commission = price * 1%
//   Merged product:  commission = combined value * 10%  (bundles the next
//                     1-3 not-yet-submitted slots; same one-time trigger as
//                     the pre-existing mergeTriggered/isMerged mechanic)
//   Every submission (normal or merged) deducts the product's full price
//   from User.workbenchBalance and adds the commission — this demo balance
//   can go negative (a "shortfall"), which blocks the *next* submission
//   until resolveDemoShortfall() is called (see below) — never a real
//   deposit. User.balance (the real Wallet balance) is never touched here.
// ---------------------------------------------------------------------------

export interface WorkbenchProductDto {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  price: number;
}

function toWorkbenchProductDto(p: {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  price: Prisma.Decimal;
}): WorkbenchProductDto {
  return { id: p.id, name: p.name, category: p.category, imageUrl: p.imageUrl, price: Number(p.price) };
}

export interface MergeBundleDto {
  products: WorkbenchProductDto[];
  combinedValue: number;
  commission: number;
}

export type WorkbenchStatus = 'NOT_READY' | 'SHORTFALL' | 'COMPLETED' | 'MERGE' | 'NORMAL';

export interface WorkbenchState {
  status: WorkbenchStatus;
  progress: { completed: number; total: number };
  eligibleCount: number;
  workbenchBalance: number;
  shortfall: number;
  todaysCommission: number;
  totalEarnings: number;
  // Pure display computation (totalEarnings * 20%) — there is no separate
  // subsidy ledger/account in the backend, so this is never credited
  // anywhere. See backend README / final report for why.
  subsidy: number;
  currentProduct: WorkbenchProductDto | null;
  mergeBundle: MergeBundleDto | null;
}

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// The current workbench SET is always the first WORKBENCH_SET_SIZE eligible
// products by displayOrder — capped, never sized by however many happen to
// exist. `ready` is false whenever fewer than that many are eligible.
async function loadWorkbenchSet(userId: string) {
  const eligible = await listWorkbenchProducts();
  const setSize = SIMULATION.WORKBENCH_SET_SIZE;
  const ready = eligible.length >= setSize;

  if (!ready) {
    return { ready, eligibleCount: eligible.length, workbenchSet: [], remaining: [] as typeof eligible };
  }

  const workbenchSet = eligible.slice(0, setSize);
  const submitted = await listSubmittedProductIds(
    userId,
    workbenchSet.map((p) => p.id)
  );
  const submittedIds = new Set(submitted.map((s) => s.productId));
  const remaining = workbenchSet.filter((p) => !submittedIds.has(p.id));
  return { ready, eligibleCount: eligible.length, workbenchSet, remaining };
}

export async function getWorkbenchState(userId: string): Promise<WorkbenchState> {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  const { ready, eligibleCount, workbenchSet, remaining } = await loadWorkbenchSet(userId);
  const completed = workbenchSet.length - remaining.length;
  const demoBalance = Number(user.workbenchBalance);
  const shortfall = demoBalance < 0 ? roundMoney(-demoBalance) : 0;

  const commissionAgg = await sumCommissionSince(userId, startOfUtcDay());
  const todaysCommission = roundMoney(Number(commissionAgg._sum.rewardAmount ?? 0));
  const totalEarnings = roundMoney(Number(user.totalEarnings));
  const subsidy = roundMoney(totalEarnings * 0.2);

  const willMerge = user.completedOrders + 1 >= SIMULATION.MERGE_THRESHOLD && !user.mergeTriggered;

  let status: WorkbenchStatus;
  let currentProduct: WorkbenchProductDto | null = null;
  let mergeBundle: MergeBundleDto | null = null;

  if (!ready) {
    // Fewer than WORKBENCH_SET_SIZE eligible products exist — never report
    // a false completed (or any other) progress state in this case.
    status = 'NOT_READY';
  } else if (shortfall > 0) {
    status = 'SHORTFALL';
  } else if (remaining.length === 0) {
    status = 'COMPLETED';
  } else if (willMerge) {
    status = 'MERGE';
    const bundleProducts = remaining.slice(0, Math.min(3, remaining.length));
    const combinedValue = roundMoney(bundleProducts.reduce((sum, p) => sum + Number(p.price), 0));
    mergeBundle = {
      products: bundleProducts.map(toWorkbenchProductDto),
      combinedValue,
      commission: roundMoney(combinedValue * 0.1),
    };
  } else {
    status = 'NORMAL';
    currentProduct = toWorkbenchProductDto(remaining[0]);
  }

  return {
    status,
    progress: { completed, total: SIMULATION.WORKBENCH_SET_SIZE },
    eligibleCount,
    workbenchBalance: roundMoney(demoBalance),
    shortfall,
    todaysCommission,
    totalEarnings,
    subsidy,
    currentProduct,
    mergeBundle,
  };
}

export interface SubmitOrderResult {
  status: Extract<WorkbenchStatus, 'NORMAL' | 'MERGE'>;
  submittedCount: number;
  commissionEarned: number;
  workbench: WorkbenchState;
  user: SafeUser;
}

export async function submitOrder(userId: string, productId: string): Promise<SubmitOrderResult> {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  const { ready, remaining } = await loadWorkbenchSet(userId);
  if (!ready) {
    throw AppError.conflict(
      `The workbench is not ready yet — ${SIMULATION.WORKBENCH_SET_SIZE} eligible products are required.`
    );
  }

  if (Number(user.workbenchBalance) < 0) {
    throw AppError.forbidden(
      'Your demo working balance is negative. Resolve it with demo credits before continuing.'
    );
  }

  if (remaining.length === 0) {
    throw AppError.conflict('You have already completed every product in this workbench set.');
  }
  // The server — never the client — decides which product is "current".
  // Rejecting any other id prevents a customer from assigning themselves a
  // different (e.g. cheaper) product than the one actually next in line.
  if (remaining[0].id !== productId) {
    throw AppError.badRequest('This is not your current assigned product.');
  }

  const willMerge = user.completedOrders + 1 >= SIMULATION.MERGE_THRESHOLD && !user.mergeTriggered;
  const bundle = willMerge ? remaining.slice(0, Math.min(3, remaining.length)) : [remaining[0]];

  const rows = bundle.map((product) => {
    const price = Number(product.price);
    const commission = roundMoney(price * (willMerge ? 0.1 : 0.01));
    return { product, price, commission };
  });

  const totalPrice = roundMoney(rows.reduce((sum, r) => sum + r.price, 0));
  const totalCommission = roundMoney(rows.reduce((sum, r) => sum + r.commission, 0));
  const netAmount = roundMoney(totalCommission - totalPrice);
  const wasFirstTask = user.completedOrders === 0;
  const newCompletedOrders = user.completedOrders + rows.length;

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        await createSubmission(
          {
            userId,
            productId: row.product.id,
            rewardAmount: row.commission,
            costAmount: row.price,
            isMergedOrder: willMerge,
          },
          tx
        );
      }

      // Demo-only ledger — never the real Wallet balance, and (deliberately)
      // no Transaction row: Transaction/balance represent real Wallet
      // activity (deposits, withdrawals, admin credits); mixing simulated
      // workbench events into that history would misrepresent the real
      // balance's audit trail. TaskSubmission rows are this simulation's
      // own record (see Records page / listMySubmissions below).
      const updated = await updateUser(
        userId,
        {
          workbenchBalance: { increment: netAmount },
          totalEarnings: { increment: totalCommission },
          completedOrders: newCompletedOrders,
          ...(willMerge ? { mergeTriggered: true, isMerged: true } : {}),
        },
        tx
      );

      if (wasFirstTask) {
        await activateReferralFor(userId, tx);
      }

      return updated;
    });

    const workbench = await getWorkbenchState(userId);

    return {
      status: willMerge ? 'MERGE' : 'NORMAL',
      submittedCount: rows.length,
      commissionEarned: totalCommission,
      workbench,
      user: toSafeUser(updatedUser),
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw AppError.conflict('Already submitted.');
    }
    throw err;
  }
}

// The workbench's own shortfall-resolution action — a direct, instant,
// simulation-only credit. Adds simulated credits to resolve the shortfall.
// Never creates a Deposit, never touches User.balance/totalDeposits, never
// involves crypto asset selection or admin approval. Completely separate from
// deposit.service.ts.
export async function resolveDemoShortfall(userId: string): Promise<SafeUser> {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  if (Number(user.workbenchBalance) >= 0) {
    throw AppError.conflict('There is no demo balance shortfall to resolve.');
  }

  // Calculate the shortfall amount and add it as simulated credits
  const shortfallAmount = roundMoney(-Number(user.workbenchBalance));
  const updated = await updateUser(userId, {
    workbenchBalance: { increment: shortfallAmount }, // This will bring it to 0
    ...(user.isMerged ? { isMerged: false } : {}),
  });

  return toSafeUser(updated);
}

export async function listMySubmissions(userId: string) {
  const submissions = await listSubmissionsForUser(userId);
  return submissions.map((s) => ({
    id: s.id,
    productId: s.productId,
    productName: s.product.name,
    productCategory: s.product.category,
    rewardAmount: Number(s.rewardAmount),
    costAmount: Number(s.costAmount),
    isMergedOrder: s.isMergedOrder,
    createdAt: s.createdAt,
  }));
}
