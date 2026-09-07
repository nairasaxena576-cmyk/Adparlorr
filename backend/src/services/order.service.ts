import { Prisma, type User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { roundMoney } from '../utils/money';
import { SIMULATION } from '../config/simulation';
import { TIERS, resolveEffectiveTier, type Tier } from '../utils/tiers';
import { listWorkbenchProductsForTier } from '../repositories/product.repository';
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
// Wallet/crypto-deposit system.
//
// The workbench is one continuous 55-order ladder (production defaults —
// see config/simulation.ts's TIER_ORDER_BANDS) split into 4 tier "bands":
// Bronze (orders 0-40), Silver (40-45), Gold (45-50), Platinum (50-55).
// Which band a customer draws products from is their current effective
// tier (utils/tiers.ts's resolveEffectiveTier) — never a second,
// order-only tier concept. Each band pulls from that tier's own eligible
// (active + priced + tierEligibility-matched) product pool, sequentially
// by displayOrder, exactly like the old flat 45-product system did.
//
//   Normal product:  commission = price * 1%
//   Merged product:  commission = combined value * 10%  — fires exactly 3
//                     times, at cumulative order counts 10/20/30 (see
//                     SIMULATION.MERGE_ORDER_MILESTONES), never again after.
//   Every submission (normal or merged) credits ONLY its commission to
//   User.workbenchBalance — the product's price is never deducted (there is
//   no real cost of goods in this simulation, only a commission-earning
//   task), so this demo ledger is monotonically non-decreasing and can never
//   go negative from legitimate order completion. User.balance (the real
//   Wallet balance) is never touched here, in either direction.
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

export type WorkbenchStatus = 'NOT_READY' | 'TIER_LOCKED' | 'COMPLETED' | 'MERGE' | 'NORMAL';

export interface WorkbenchState {
  status: WorkbenchStatus;
  // GLOBAL cumulative progress across the entire 55-order ladder — never a
  // per-band/per-tier reset.
  progress: { completed: number; total: number };
  tier: Tier;
  nextTier: Tier | null;
  // Eligible-product count and required size for the CURRENT tier's band
  // specifically (not the grand total) — what an admin needs to stock next.
  eligibleCount: number;
  bandRequired: number;
  // Only meaningful while status is TIER_LOCKED (or generally informative
  // otherwise) — how much more real deposit is needed to reach the next
  // tier's band. Null once at Platinum (no further tier to unlock).
  depositsNeededForNextTier: number | null;
  // Demo/simulation-only — entirely separate from the real Wallet balance
  // (User.balance). See order.service.ts / schema.prisma for the full
  // real-vs-simulated separation. A completed task only ever credits its
  // commission here (see submitOrder) — the full product price is never
  // deducted, so this can never go negative from legitimate use.
  workbenchBalance: number;
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

function getNextTier(tier: Tier): Tier | null {
  const order: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];
  const idx = order.indexOf(tier);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
}

// The current workbench band is always the first `bandSize` eligible
// products (for the customer's current tier) by displayOrder — capped,
// never sized by however many happen to exist. `ready` is false whenever
// fewer than that many are eligible for this specific tier.
async function loadWorkbenchSet(user: Pick<User, 'id' | 'completedOrders' | 'totalDeposits' | 'manualTier'>) {
  const tier = resolveEffectiveTier(user.completedOrders, Number(user.totalDeposits), user.manualTier);
  const band = TIERS[tier];
  const bandSize = band.maxOrders - band.minOrders;

  const eligible = await listWorkbenchProductsForTier(tier);
  const ready = eligible.length >= bandSize;

  if (!ready) {
    return { ready, tier, bandSize, eligibleCount: eligible.length, workbenchSet: [], remaining: [] as typeof eligible };
  }

  const workbenchSet = eligible.slice(0, bandSize);
  const submitted = await listSubmittedProductIds(
    user.id,
    workbenchSet.map((p) => p.id)
  );
  const submittedIds = new Set(submitted.map((s) => s.productId));
  const remaining = workbenchSet.filter((p) => !submittedIds.has(p.id));
  return { ready, tier, bandSize, eligibleCount: eligible.length, workbenchSet, remaining };
}

export async function getWorkbenchState(userId: string): Promise<WorkbenchState> {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  const { ready, tier, bandSize, eligibleCount, remaining } = await loadWorkbenchSet(user);
  const nextTier = getNextTier(tier);
  const demoBalance = Number(user.workbenchBalance);

  const commissionAgg = await sumCommissionSince(userId, startOfUtcDay());
  const todaysCommission = roundMoney(Number(commissionAgg._sum.rewardAmount ?? 0));
  const totalEarnings = roundMoney(Number(user.totalEarnings));
  const subsidy = roundMoney(totalEarnings * 0.2);

  const nextMilestone = SIMULATION.MERGE_ORDER_MILESTONES[user.mergedMilestonesReached];
  const willMerge = nextMilestone !== undefined && user.completedOrders + 1 >= nextMilestone;

  const depositsNeededForNextTier = nextTier
    ? roundMoney(Math.max(0, TIERS[nextTier].minDeposits - Number(user.totalDeposits)))
    : null;

  let status: WorkbenchStatus;
  let currentProduct: WorkbenchProductDto | null = null;
  let mergeBundle: MergeBundleDto | null = null;

  const grandTotal = TIERS.Platinum.maxOrders;

  if (!ready) {
    // Fewer than this band's required eligible products exist — never
    // report a false completed (or any other) progress state.
    status = 'NOT_READY';
  } else if (remaining.length === 0) {
    // This band's slots are all submitted. If the customer's effective
    // tier has already advanced (orders AND deposits both cleared this
    // band), the very next call resolves a fresh, non-empty next band —
    // this branch is only reachable at the true end (Platinum) or when
    // deposits haven't caught up to the order milestone yet.
    status = tier === 'Platinum' && user.completedOrders >= grandTotal ? 'COMPLETED' : 'TIER_LOCKED';
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
    progress: { completed: Math.min(user.completedOrders, grandTotal), total: grandTotal },
    tier,
    nextTier,
    eligibleCount,
    bandRequired: bandSize,
    depositsNeededForNextTier,
    workbenchBalance: roundMoney(demoBalance),
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

  const { ready, tier, bandSize, remaining } = await loadWorkbenchSet(user);
  if (!ready) {
    throw AppError.conflict(
      `The workbench is not ready yet — ${bandSize} eligible ${tier}-tier products are required.`
    );
  }

  const grandTotal = TIERS.Platinum.maxOrders;
  if (remaining.length === 0) {
    if (tier === 'Platinum' && user.completedOrders >= grandTotal) {
      throw AppError.conflict('You have already completed every product in this workbench.');
    }
    throw AppError.conflict(
      'You have completed every available product for your current tier — increase your deposits to unlock the next tier.'
    );
  }
  // The server — never the client — decides which product is "current".
  // Rejecting any other id prevents a customer from assigning themselves a
  // different (e.g. cheaper, or wrong-tier) product than the one actually
  // next in line.
  if (remaining[0].id !== productId) {
    throw AppError.badRequest('This is not your current assigned product.');
  }

  const nextMilestone = SIMULATION.MERGE_ORDER_MILESTONES[user.mergedMilestonesReached];
  const willMerge = nextMilestone !== undefined && user.completedOrders + 1 >= nextMilestone;
  const bundle = willMerge ? remaining.slice(0, Math.min(3, remaining.length)) : [remaining[0]];

  const rows = bundle.map((product) => {
    const price = Number(product.price);
    const commission = roundMoney(price * (willMerge ? 0.1 : 0.01));
    return { product, price, commission };
  });

  const totalCommission = roundMoney(rows.reduce((sum, r) => sum + r.commission, 0));
  // A completed task credits only its commission to the demo workbench
  // ledger — the product's full price is never deducted (there is no real
  // cost of goods here, only a simulated commission-earning task), so this
  // ledger can never go negative from legitimate order completion.
  const netAmount = totalCommission;
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
          ...(willMerge
            ? { mergeTriggered: true, isMerged: true, mergedMilestonesReached: { increment: 1 } }
            : {}),
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
