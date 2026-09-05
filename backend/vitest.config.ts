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
      // Exercises the exact same "first N eligible products" workbench
      // logic as production (default 45) with a much smaller, fast,
      // deterministic N — no other test depends on this value.
      SIMULATION_WORKBENCH_SET_SIZE: '5',
    },
  },
});
