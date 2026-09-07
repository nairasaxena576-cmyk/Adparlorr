import type { Tier, TierInfo } from '@/types';

export const TIERS: Record<Tier, TierInfo> = {
  Bronze: { name: 'Bronze', minOrders: 0, minDeposits: 0, color: 'text-amber-600' },
  Silver: { name: 'Silver', minOrders: 50, minDeposits: 500, color: 'text-slate-500' },
  Gold: { name: 'Gold', minOrders: 200, minDeposits: 2000, color: 'text-amber-600' },
  Platinum: { name: 'Platinum', minOrders: 500, minDeposits: 5000, color: 'text-cyan-600' },
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

export function getTierProgress(completedOrders: number, totalDeposits: number, target: Tier): number {
  const info = TIERS[target];
  const orderPct = info.minOrders > 0 ? Math.min(100, (completedOrders / info.minOrders) * 100) : 100;
  const depositPct = info.minDeposits > 0 ? Math.min(100, (totalDeposits / info.minDeposits) * 100) : 100;
  return Math.round((orderPct + depositPct) / 2);
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
