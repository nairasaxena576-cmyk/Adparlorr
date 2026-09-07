// Server-side port of the EXACT thresholds in src/utils/tiers.ts (frontend).
// The frontend tier calculation is display-only; anything that gates real
// behavior (e.g. referrer-tier verification for training access — see
// referral.service.ts) must recompute the tier here, from the user's real
// completedOrders/totalDeposits, never trusting a tier value from a client.
export type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

interface TierThreshold {
  minOrders: number;
  minDeposits: number;
}

const TIERS: Record<Tier, TierThreshold> = {
  Bronze: { minOrders: 0, minDeposits: 0 },
  Silver: { minOrders: 50, minDeposits: 500 },
  Gold: { minOrders: 200, minDeposits: 2000 },
  Platinum: { minOrders: 500, minDeposits: 5000 },
};

const TIER_ORDER: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

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
