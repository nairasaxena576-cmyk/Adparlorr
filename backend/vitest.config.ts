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
    },
  },
});
