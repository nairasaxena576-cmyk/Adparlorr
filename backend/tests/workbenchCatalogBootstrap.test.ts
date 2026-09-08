import { describe, it, expect, vi, beforeEach } from 'vitest';

// Pure unit tests for the startup bootstrap gate itself — no real database,
// no real seeding. The underlying seedWorkbenchCatalog() idempotency
// (re-running never creates duplicates or touches historical
// TaskSubmission rows) is already proven end-to-end against a real
// database in workbenchCatalog.test.ts; this file proves the separate
// concern of whether/when the gate calls it at all.
const mockSeedWorkbenchCatalog = vi.fn();

vi.mock('../src/lib/workbenchCatalog', () => ({
  seedWorkbenchCatalog: (...args: unknown[]) => mockSeedWorkbenchCatalog(...args),
}));

// env varies per test (NODE_ENV / the flag), so it's mocked fresh via
// vi.doMock() + vi.resetModules() + a dynamic import inside each test,
// rather than a single hoisted vi.mock() — same reasoning as
// supabaseStorage.test.ts, which needs per-test-file env values.
async function loadBootstrap(envOverrides: { NODE_ENV: string; WORKBENCH_CATALOG_BOOTSTRAP: boolean }) {
  vi.resetModules();
  vi.doMock('../src/config/env', () => ({ env: envOverrides }));
  const mod = await import('../src/bootstrap/workbenchCatalogBootstrap');
  return mod.runWorkbenchCatalogBootstrapIfEnabled;
}

describe('runWorkbenchCatalogBootstrapIfEnabled', () => {
  beforeEach(() => {
    mockSeedWorkbenchCatalog.mockReset();
  });

  it('does not seed when the flag is absent/false in production', async () => {
    const run = await loadBootstrap({ NODE_ENV: 'production', WORKBENCH_CATALOG_BOOTSTRAP: false });
    await run({} as never);
    expect(mockSeedWorkbenchCatalog).not.toHaveBeenCalled();
  });

  it('never seeds outside production, even if the flag is true (test env safety)', async () => {
    const run = await loadBootstrap({ NODE_ENV: 'test', WORKBENCH_CATALOG_BOOTSTRAP: true });
    await run({} as never);
    expect(mockSeedWorkbenchCatalog).not.toHaveBeenCalled();
  });

  it('never seeds in development, even if the flag is true', async () => {
    const run = await loadBootstrap({ NODE_ENV: 'development', WORKBENCH_CATALOG_BOOTSTRAP: true });
    await run({} as never);
    expect(mockSeedWorkbenchCatalog).not.toHaveBeenCalled();
  });

  it('seeds exactly once, with the given client, when NODE_ENV=production and the flag is true', async () => {
    mockSeedWorkbenchCatalog.mockResolvedValue([{ id: '1' }]);
    const run = await loadBootstrap({ NODE_ENV: 'production', WORKBENCH_CATALOG_BOOTSTRAP: true });
    const client = { product: {} } as never;

    await run(client);

    expect(mockSeedWorkbenchCatalog).toHaveBeenCalledTimes(1);
    expect(mockSeedWorkbenchCatalog).toHaveBeenCalledWith(client);
  });

  it('propagates a seeding failure instead of swallowing it (fails loudly)', async () => {
    mockSeedWorkbenchCatalog.mockRejectedValue(new Error('seed exploded'));
    const run = await loadBootstrap({ NODE_ENV: 'production', WORKBENCH_CATALOG_BOOTSTRAP: true });

    await expect(run({} as never)).rejects.toThrow('seed exploded');
  });

  it('calling it again with the flag still enabled seeds again without throwing (the underlying seed is what makes this safe/idempotent)', async () => {
    mockSeedWorkbenchCatalog.mockResolvedValue([]);
    const run = await loadBootstrap({ NODE_ENV: 'production', WORKBENCH_CATALOG_BOOTSTRAP: true });
    const client = {} as never;

    await run(client);
    await run(client);

    expect(mockSeedWorkbenchCatalog).toHaveBeenCalledTimes(2);
  });
});
