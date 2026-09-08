import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { TIERS } from '../src/utils/tiers';
import { buildWorkbenchCatalog, seedWorkbenchCatalog } from '../src/lib/workbenchCatalog';
import { registerAndLogin } from './helpers';

// Exercises the exact function prisma/seed.ts calls in production — not a
// re-implementation of it — so this proves the real seed mechanism itself,
// end to end, against the dedicated local test database only.

describe('workbench catalog data (pure — no DB)', () => {
  const catalog = buildWorkbenchCatalog();

  it('contains exactly 55 products', () => {
    expect(catalog).toHaveLength(55);
  });

  it('assigns exactly 40 Bronze, 5 Silver, 5 Gold, 5 Platinum', () => {
    const byTier = { Bronze: 0, Silver: 0, Gold: 0, Platinum: 0 };
    for (const p of catalog) byTier[p.tierEligibility] += 1;
    expect(byTier).toEqual({ Bronze: 40, Silver: 5, Gold: 5, Platinum: 5 });
  });

  it('assigns a contiguous, unique displayOrder from 1 to 55', () => {
    const orders = catalog.map((p) => p.displayOrder).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 55 }, (_, i) => i + 1));
  });

  it('every product has a unique, non-empty, real-component name', () => {
    const names = catalog.map((p) => p.name);
    expect(new Set(names).size).toBe(55);
    for (const name of names) {
      expect(name.length).toBeGreaterThan(0);
      expect(name).not.toMatch(/^Product \d+$/);
      expect(name).not.toMatch(/Fixture/i);
    }
  });

  it('every product has a non-empty, valid image URL well under the admin schema length cap', () => {
    for (const p of catalog) {
      expect(p.imageUrl.length).toBeGreaterThan(0);
      expect(() => new URL(p.imageUrl)).not.toThrow();
      expect(p.imageUrl.length).toBeLessThanOrEqual(500);
    }
  });

  it('every product is active and priced above zero', () => {
    for (const p of catalog) {
      expect(p.isActive).toBe(true);
      expect(p.price).toBeGreaterThan(0);
    }
  });

  it('prices strictly increase from tier to tier (max of a lower tier < min of the next)', () => {
    const priceRange = (tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum') => {
      const prices = catalog.filter((p) => p.tierEligibility === tier).map((p) => p.price);
      return { min: Math.min(...prices), max: Math.max(...prices) };
    };
    const bronze = priceRange('Bronze');
    const silver = priceRange('Silver');
    const gold = priceRange('Gold');
    const platinum = priceRange('Platinum');
    expect(bronze.max).toBeLessThan(silver.min);
    expect(silver.max).toBeLessThan(gold.min);
    expect(gold.max).toBeLessThan(platinum.min);
  });
});

describe('workbench catalog seeding (DB, idempotent, non-destructive)', () => {
  beforeAll(async () => {
    // The shared test setup already seeded the generic 45-item fixture
    // catalog (buildSyntheticProducts) at displayOrder 1-45 — this upserts
    // the real 55-item catalog over/alongside it by the same displayOrder
    // key, exactly like prisma/seed.ts does in production.
    await seedWorkbenchCatalog(prisma);
  });

  it('creates exactly 55 products in the database', async () => {
    const total = await prisma.product.count();
    expect(total).toBe(55);
  });

  it('running the seed a second time does not create duplicates', async () => {
    await seedWorkbenchCatalog(prisma);
    await seedWorkbenchCatalog(prisma);
    const total = await prisma.product.count();
    expect(total).toBe(55);
  });

  it('reports the Workbench as ready for every tier, with the exact required band sizes', async () => {
    for (const tier of ['Bronze', 'Silver', 'Gold', 'Platinum'] as const) {
      const eligible = await prisma.product.count({
        where: { isActive: true, price: { gt: 0 }, tierEligibility: tier },
      });
      const required = TIERS[tier].maxOrders - TIERS[tier].minOrders;
      expect(eligible).toBeGreaterThanOrEqual(required);
    }
  });

  it('a fresh Bronze customer is served a real seeded Bronze product, never "Not Ready"', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.get('/api/orders/workbench');
    expect(res.status).toBe(200);
    expect(res.body.data.workbench.status).not.toBe('NOT_READY');
    expect(res.body.data.workbench.tier).toBe('Bronze');
    expect(res.body.data.workbench.currentProduct).not.toBeNull();
    expect(res.body.data.workbench.currentProduct.name).not.toMatch(/Fixture|^Product \d+$/);
  });

  it('a Silver-tier customer is served a real seeded Silver product, not a Bronze one', async () => {
    const { agent, body } = await registerAndLogin();
    await prisma.user.update({
      where: { id: body.data.user.id },
      data: { completedOrders: TIERS.Silver.minOrders, totalDeposits: TIERS.Silver.minDeposits, mergedMilestonesReached: 3 },
    });
    const res = await agent.get('/api/orders/workbench');
    expect(res.body.data.workbench.tier).toBe('Silver');
    expect(res.body.data.workbench.status).not.toBe('NOT_READY');
    const product = await prisma.product.findUnique({ where: { id: res.body.data.workbench.currentProduct.id } });
    expect(product?.tierEligibility).toBe('Silver');
  });

  it('a Gold-tier customer is served a real seeded Gold product', async () => {
    const { agent, body } = await registerAndLogin();
    await prisma.user.update({
      where: { id: body.data.user.id },
      data: { completedOrders: TIERS.Gold.minOrders, totalDeposits: TIERS.Gold.minDeposits, mergedMilestonesReached: 3 },
    });
    const res = await agent.get('/api/orders/workbench');
    expect(res.body.data.workbench.tier).toBe('Gold');
    const product = await prisma.product.findUnique({ where: { id: res.body.data.workbench.currentProduct.id } });
    expect(product?.tierEligibility).toBe('Gold');
  });

  it('a Platinum-tier customer is served a real seeded Platinum product, priced higher than Bronze', async () => {
    const { agent, body } = await registerAndLogin();
    await prisma.user.update({
      where: { id: body.data.user.id },
      data: { completedOrders: TIERS.Platinum.minOrders, totalDeposits: TIERS.Platinum.minDeposits, mergedMilestonesReached: 3 },
    });
    const res = await agent.get('/api/orders/workbench');
    expect(res.body.data.workbench.tier).toBe('Platinum');
    const product = await prisma.product.findUnique({ where: { id: res.body.data.workbench.currentProduct.id } });
    expect(product?.tierEligibility).toBe('Platinum');
    expect(Number(product?.price)).toBeGreaterThan(100);
  });

  it('normal-order commission on a real seeded product is exactly 1% of its real price', async () => {
    const { agent, csrfToken } = await registerAndLogin();
    const state = await agent.get('/api/orders/workbench');
    const product = state.body.data.workbench.currentProduct;
    const dbProduct = await prisma.product.findUnique({ where: { id: product.id } });

    const res = await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({ productId: product.id });
    expect(res.status).toBe(201);
    const expectedCommission = Math.round(Number(dbProduct!.price) * 0.01 * 100) / 100;
    expect(res.body.data.commissionEarned).toBeCloseTo(expectedCommission, 5);
  });

  it('merged-order commission on real seeded products is exactly 10% of their combined real price', async () => {
    const { agent, csrfToken, body } = await registerAndLogin();
    await prisma.user.update({ where: { id: body.data.user.id }, data: { completedOrders: 9 } });
    const state = await agent.get('/api/orders/workbench');
    expect(state.body.data.workbench.status).toBe('MERGE');
    const bundle = state.body.data.workbench.mergeBundle;
    // Allow for the same cent-level rounding the server applies per bundled
    // item before summing (see order.service.ts's submitOrder) — the point
    // here is confirming the real 10% merge rate on real catalog prices,
    // not re-deriving its exact per-item rounding order.
    expect(bundle.commission).toBeCloseTo(bundle.combinedValue * 0.1, 1);

    const res = await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: bundle.products[0].id });
    expect(res.status).toBe(201);
    expect(res.body.data.commissionEarned).toBeCloseTo(bundle.combinedValue * 0.1, 1);
  });

  it('a client cannot spoof a real seeded productId to jump ahead in the sequence', async () => {
    const { agent, csrfToken } = await registerAndLogin();
    // Any real, valid product id (e.g. a Platinum-tier one) other than the
    // server-assigned current product must be rejected.
    const platinumProduct = await prisma.product.findFirst({ where: { tierEligibility: 'Platinum' } });
    const res = await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: platinumProduct!.id });
    expect(res.status).toBe(400);
  });

  it('a client cannot spoof its tier to receive a higher-tier real product', async () => {
    const { agent } = await registerAndLogin(); // Bronze
    const res = await agent.get('/api/orders/workbench');
    // The request has no tier parameter at all — there is nothing for a
    // client to spoof; the server always resolves tier from real
    // completedOrders/totalDeposits (see order.service.ts).
    expect(res.body.data.workbench.tier).toBe('Bronze');
    const platinumProduct = await prisma.product.findFirst({ where: { tierEligibility: 'Platinum' } });
    expect(res.body.data.workbench.currentProduct.id).not.toBe(platinumProduct!.id);
  });

  it('does not delete historical submissions or products when the seed is re-run', async () => {
    const { agent, csrfToken } = await registerAndLogin();
    const state = await agent.get('/api/orders/workbench');
    const product = state.body.data.workbench.currentProduct;

    const submitRes = await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({ productId: product.id });
    expect(submitRes.status).toBe(201);

    const submissionBefore = await prisma.taskSubmission.findFirst({ where: { productId: product.id } });
    expect(submissionBefore).not.toBeNull();

    // Re-run the exact same production seed mechanism.
    await seedWorkbenchCatalog(prisma);

    const productAfter = await prisma.product.findUnique({ where: { id: product.id } });
    const submissionAfter = await prisma.taskSubmission.findUnique({ where: { id: submissionBefore!.id } });
    expect(productAfter).not.toBeNull(); // same id — never deleted/recreated
    expect(submissionAfter).not.toBeNull(); // historical submission untouched
    expect(Number(submissionAfter!.rewardAmount)).toBe(Number(submissionBefore!.rewardAmount));
    expect(Number(submissionAfter!.costAmount)).toBe(Number(submissionBefore!.costAmount));
  });
});
