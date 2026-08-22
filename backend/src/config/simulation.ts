import { env } from './env';

/**
 * All values here configure the training simulation only. Nothing in this
 * file (or anything it feeds into) connects to a real payment processor,
 * bank, or blockchain network.
 */
export const SIMULATION = {
  MERGE_THRESHOLD: env.SIMULATION_MERGE_THRESHOLD,
  MIN_WITHDRAWAL_BALANCE: env.SIMULATION_MIN_WITHDRAWAL_BALANCE,
  MAX_DEPOSIT_AMOUNT: env.SIMULATION_MAX_DEPOSIT_AMOUNT,
  DISCLAIMER: 'This is a simulated training transaction from an authorized security-awareness exercise. No real funds, accounts, or payment systems are involved.',
  FAKE_DEPOSIT_ADDRESSES: {
    USDT: 'TX9z8mK2nLp4qR7vB3cF6dH1jW5yG0sA8b',
    BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  },
} as const;
