import { SIMULATION } from '../config/simulation';

// Server-side port of the EXACT thresholds in src/utils/tiers.ts (frontend).
// The frontend tier calculation is display-only; anything that gates real
// behavior (e.g. referrer-tier verification for training access — see
// referral.service.ts) must recompute the tier here, from the user's real
// completedOrders/totalDeposits, never trusting a tier value from a client.
export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

interface TierThreshold {
  // Cumulative — never a per-tier delta. minOrders/minDeposits are this
  // tier's own starting point; maxOrders/maxDeposits are this tier's own
  // ceiling (identical to the next tier's min, except Platinum, whose max
  // is a real, final ceiling used for its own completable progress bar).
  minOrders: number;
  maxOrders: number;
  minDeposits: number;
  maxDeposits: number;
}

const TIER_ORDER: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

// Builds the continuous 4-tier ladder from the configured band widths/caps
// (SIMULATION.TIER_ORDER_BANDS / TIER_DEPOSIT_CAPS) — one source of numbers,
// never duplicated. Production defaults yield exactly 0→40→45→50→55 orders
// and $0→100→500→2000→5000 deposits; tests shrink the bands via env.
function buildTiers(): Record<Tier, TierThreshold> {
  const result = {} as Record<Tier, TierThreshold>;
  let orderCursor = 0;
  let depositCursor = 0;
  for (const t of TIER_ORDER) {
    const minOrders = orderCursor;
    const minDeposits = depositCursor;
    orderCursor += SIMULATION.TIER_ORDER_BANDS[t];
    depositCursor = SIMULATION.TIER_DEPOSIT_CAPS[t];
    result[t] = { minOrders, maxOrders: orderCursor, minDeposits, maxDeposits: depositCursor };
  }
  return result;
}

export const TIERS: Record<Tier, TierThreshold> = buildTiers();

export function getCurrentTier(completedOrders: number, totalDeposits: number): Tier {
  let tier: Tier = 'Bronze';
  for (const t of TIER_ORDER) {
    const info = TIERS[t];
    if (completedOrders >= info.minOrders && totalDeposits >= info.minDeposits) {
      tier = t;
    }
  }
  return tier;
}

export function isEligibleReferrerTier(tier: Tier): boolean {
  return tier === 'Gold' || tier === 'Platinum';
}

// The pay-to-unlock amount shown for a given tier — reuses the exact same
// minDeposits threshold already used by automatic progression above; no
// separate pricing to invent or keep in sync.
export function tierUnlockAmount(tier: Tier): number {
  return TIERS[tier].minDeposits;
}

export function tierRank(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

// The tier a customer actually has is the higher-ranked of (a) automatic
// progression from real completedOrders/totalDeposits and (b) an
// admin-granted manualTier override (see admin.service.ts's
// grantTierForUser) — never just one or the other. manualTier can only
// raise the effective tier, never lower it.
export function resolveEffectiveTier(
  completedOrders: number,
  totalDeposits: number,
  manualTier: Tier | null | undefined
): Tier {
  const computed = getCurrentTier(completedOrders, totalDeposits);
  if (!manualTier) return computed;
  return tierRank(manualTier) > tierRank(computed) ? manualTier : computed;
}
