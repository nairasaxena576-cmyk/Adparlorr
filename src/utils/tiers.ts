import type { Tier, TierInfo } from '@/types';

// Mirrors backend/src/utils/tiers.ts's production defaults exactly (0/40/
// 45/50/55 orders, $0/100/500/2000/5000 deposits) — display-only here, the
// backend is the sole source of truth for anything that gates real
// behavior. See that file's TIER_ORDER_BANDS/TIER_DEPOSIT_CAPS comment.
export const TIERS: Record<Tier, TierInfo> = {
  Bronze: { name: 'Bronze', minOrders: 0, maxOrders: 40, minDeposits: 0, maxDeposits: 100, color: 'text-amber-600' },
  Silver: { name: 'Silver', minOrders: 40, maxOrders: 45, minDeposits: 100, maxDeposits: 500, color: 'text-slate-500' },
  Gold: { name: 'Gold', minOrders: 45, maxOrders: 50, minDeposits: 500, maxDeposits: 2000, color: 'text-amber-600' },
  Platinum: { name: 'Platinum', minOrders: 50, maxOrders: 55, minDeposits: 2000, maxDeposits: 5000, color: 'text-cyan-600' },
};

export const TIER_ORDER: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

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

export function getNextTier(current: Tier): Tier | null {
  const idx = TIER_ORDER.indexOf(current);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

// Progress toward the CURRENT tier's own ceiling — never a per-tier reset
// to 0, and never toward the next tier's absolute threshold (which is the
// same number, but framing it as "this tier's own max" is what makes
// Platinum's own 50→55 / $2000→$5000 bar work with no "next tier" to point
// at).
export function getTierProgress(completedOrders: number, totalDeposits: number, tier: Tier): number {
  const info = TIERS[tier];
  const orderSpan = info.maxOrders - info.minOrders;
  const depositSpan = info.maxDeposits - info.minDeposits;
  const orderPct = orderSpan > 0 ? Math.min(100, ((completedOrders - info.minOrders) / orderSpan) * 100) : 100;
  const depositPct = depositSpan > 0 ? Math.min(100, ((totalDeposits - info.minDeposits) / depositSpan) * 100) : 100;
  return Math.round((Math.max(0, orderPct) + Math.max(0, depositPct)) / 2);
}

// The pay-to-unlock amount shown for a tier — reuses the exact same
// minDeposits threshold already used by automatic progression above.
export function tierUnlockAmount(tier: Tier): number {
  return TIERS[tier].minDeposits;
}

export function tierRank(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

// Mirrors the backend's resolveEffectiveTier exactly (backend/src/utils/tiers.ts)
// — the tier a customer actually has is the higher-ranked of automatic
// progression and an admin-granted manualTier override.
export function resolveEffectiveTier(
  completedOrders: number,
  totalDeposits: number,
  manualTier: Tier | null | undefined
): Tier {
  const computed = getCurrentTier(completedOrders, totalDeposits);
  if (!manualTier) return computed;
  return tierRank(manualTier) > tierRank(computed) ? manualTier : computed;
}
