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
