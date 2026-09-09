import { describe, it, expect, vi } from 'vitest';
import type { CorsOptions } from 'cors';
import { parseCorsOrigins } from '../src/config/env';

describe('parseCorsOrigins', () => {
  it('parses a comma-separated list, trimming whitespace around each entry', () => {
    expect(parseCorsOrigins('https://a.com, https://b.com ,https://c.com')).toEqual([
      'https://a.com',
      'https://b.com',
      'https://c.com',
    ]);
  });

  it('a single origin (no comma) parses to a one-element array', () => {
    expect(parseCorsOrigins('https://adparlorr.com')).toEqual(['https://adparlorr.com']);
  });

  it('drops empty entries from stray/trailing commas', () => {
    expect(parseCorsOrigins('https://a.com,,https://b.com,')).toEqual(['https://a.com', 'https://b.com']);
    expect(parseCorsOrigins(',,,')).toEqual([]);
  });

  it('drops whitespace-only entries entirely', () => {
    expect(parseCorsOrigins('https://a.com,   ,https://b.com')).toEqual(['https://a.com', 'https://b.com']);
  });
});

// corsOptions reads env.CORS_ORIGIN once at module load (see config/cors.ts),
// so each scenario needs a fresh module registry with env re-mocked for that
// CORS_ORIGIN value — same vi.doMock + vi.resetModules + dynamic import
// pattern as workbenchCatalogBootstrap.test.ts. The real parseCorsOrigins is
// reused in the mock (imported above) rather than re-implemented, so this
// test exercises the exact same parsing config/cors.ts relies on.
async function loadCorsOptions(corsOriginRaw: string): Promise<CorsOptions> {
  vi.resetModules();
  vi.doMock('../src/config/env', () => ({
    env: { CORS_ORIGIN: corsOriginRaw },
    parseCorsOrigins,
  }));
  const mod = await import('../src/config/cors');
  return mod.corsOptions;
}

function checkOrigin(corsOptions: CorsOptions, origin: string | undefined): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const originFn = corsOptions.origin as (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => void;
    originFn(origin, (err, allow) => {
      if (err) reject(err);
      else resolve(Boolean(allow));
    });
  });
}

describe('corsOptions (multi-origin allowlist)', () => {
  const PROD = 'https://adparlorr.com';
  const TEST_ORIGIN = 'https://test.adparlorr.com';
  const UNKNOWN = 'https://evil.example.com';

  it('allows the production origin when both origins are configured', async () => {
    const corsOptions = await loadCorsOptions(`${PROD},${TEST_ORIGIN}`);
    await expect(checkOrigin(corsOptions, PROD)).resolves.toBe(true);
  });

  it('allows the Namecheap test origin when both origins are configured', async () => {
    const corsOptions = await loadCorsOptions(`${PROD},${TEST_ORIGIN}`);
    await expect(checkOrigin(corsOptions, TEST_ORIGIN)).resolves.toBe(true);
  });

  it('rejects an origin that is not in the allowlist', async () => {
    const corsOptions = await loadCorsOptions(`${PROD},${TEST_ORIGIN}`);
    await expect(checkOrigin(corsOptions, UNKNOWN)).resolves.toBe(false);
  });

  it('keeps credentials enabled regardless of how many origins are configured', async () => {
    const corsOptions = await loadCorsOptions(`${PROD},${TEST_ORIGIN}`);
    expect(corsOptions.credentials).toBe(true);
  });

  it('never falls back to a wildcard, however many origins are configured', async () => {
    const corsOptions = await loadCorsOptions(`${PROD},${TEST_ORIGIN}`);
    expect(corsOptions.origin).not.toBe('*');
  });

  it('a single-origin configuration still allows exactly that origin and rejects everything else', async () => {
    const corsOptions = await loadCorsOptions(PROD);
    await expect(checkOrigin(corsOptions, PROD)).resolves.toBe(true);
    await expect(checkOrigin(corsOptions, TEST_ORIGIN)).resolves.toBe(false);
    await expect(checkOrigin(corsOptions, UNKNOWN)).resolves.toBe(false);
  });

  it('a comma-separated configuration with surrounding whitespace still parses and matches correctly', async () => {
    const corsOptions = await loadCorsOptions(` ${PROD} , ${TEST_ORIGIN} `);
    await expect(checkOrigin(corsOptions, PROD)).resolves.toBe(true);
    await expect(checkOrigin(corsOptions, TEST_ORIGIN)).resolves.toBe(true);
  });

  it('a trailing comma / empty entry in CORS_ORIGIN does not become an accidental allow-all', async () => {
    const corsOptions = await loadCorsOptions(`${PROD},`);
    await expect(checkOrigin(corsOptions, TEST_ORIGIN)).resolves.toBe(false);
    await expect(checkOrigin(corsOptions, UNKNOWN)).resolves.toBe(false);
  });

  it('a request with no Origin header (server-to-server / curl) is let through, unaffected by the allowlist', async () => {
    const corsOptions = await loadCorsOptions(PROD);
    await expect(checkOrigin(corsOptions, undefined)).resolves.toBe(true);
  });
});
