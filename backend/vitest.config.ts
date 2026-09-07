import 'dotenv/config';
import { defineConfig } from 'vitest/config';

function deriveTestDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL or TEST_DATABASE_URL must be set to run tests.');
  if (/test/i.test(base)) return base;
  return base.replace(/\/([^/?]+)(\?.*)?$/, (_m, dbName, query) => `/${dbName}_test${query || ''}`);
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: deriveTestDatabaseUrl(),
      // Real (pre-override) app DATABASE_URL, carried through only so
      // tests/setup.ts can verify the test database isn't literally the
      // same database as production — never used to open a connection.
      APP_DATABASE_URL_FOR_SAFETY_CHECK: process.env.DATABASE_URL ?? '',
      // Continuous 4-tier workbench bands (see utils/tiers.ts), shrunk for
      // fast fixtures — Bronze stays wide enough (36) to exercise all 3
      // fixed Merged Product milestones (orders 10/20/30, never
      // env-configurable) with a few spare normal-only slots afterward to
      // confirm no 4th merge ever fires.
      SIMULATION_BRONZE_ORDER_BAND: '36',
      SIMULATION_SILVER_ORDER_BAND: '2',
      SIMULATION_GOLD_ORDER_BAND: '2',
      SIMULATION_PLATINUM_ORDER_BAND: '2',
      // Deposit caps are cheap to set directly via fixtures regardless of
      // size, so these stay at their real production values.
      SIMULATION_BRONZE_DEPOSIT_CAP: '100',
      SIMULATION_SILVER_DEPOSIT_CAP: '500',
      SIMULATION_GOLD_DEPOSIT_CAP: '2000',
      SIMULATION_PLATINUM_DEPOSIT_CAP: '5000',
    },
  },
});
