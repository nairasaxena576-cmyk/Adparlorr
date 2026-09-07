import { env } from './env';

/**
 * All values here configure the training simulation only. Nothing in this
 * file (or anything it feeds into) connects to a real payment processor,
 * bank, or blockchain network.
 */
export const SIMULATION = {
  MIN_WITHDRAWAL_BALANCE: env.SIMULATION_MIN_WITHDRAWAL_BALANCE,
  MAX_DEPOSIT_AMOUNT: env.SIMULATION_MAX_DEPOSIT_AMOUNT,
  // Continuous 4-tier workbench bands — see utils/tiers.ts, which derives
  // the cumulative order/deposit milestones from these same numbers (never
  // a second hardcoded set).
  TIER_ORDER_BANDS: {
    Bronze: env.SIMULATION_BRONZE_ORDER_BAND,
    Silver: env.SIMULATION_SILVER_ORDER_BAND,
    Gold: env.SIMULATION_GOLD_ORDER_BAND,
    Platinum: env.SIMULATION_PLATINUM_ORDER_BAND,
  },
  TIER_DEPOSIT_CAPS: {
    Bronze: env.SIMULATION_BRONZE_DEPOSIT_CAP,
    Silver: env.SIMULATION_SILVER_DEPOSIT_CAP,
    Gold: env.SIMULATION_GOLD_DEPOSIT_CAP,
    Platinum: env.SIMULATION_PLATINUM_DEPOSIT_CAP,
  },
  // Exactly 3 Merged Product events, fixed at these cumulative order counts
  // — a business rule, not a tunable simulation knob, so it is not
  // env-configurable like the bands above.
  MERGE_ORDER_MILESTONES: [10, 20, 30] as const,
  DISCLAIMER: 'This is a simulated training transaction from an authorized security-awareness exercise. No real funds, accounts, or payment systems are involved.',
  FAKE_DEPOSIT_ADDRESSES: {
    USDT: 'TX9z8mK2nLp4qR7vB3cF6dH1jW5yG0sA8b',
    BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  },
} as const;
