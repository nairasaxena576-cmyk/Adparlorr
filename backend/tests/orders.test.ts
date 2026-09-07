import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { TIERS } from '../src/utils/tiers';
import { registerAndLogin, createAdminAndLogin, createFixtureWorkbenchSet, completeTrainingTasks } from './helpers';

type Session = Awaited<ReturnType<typeof registerAndLogin>>;
type AdminSession = Awaited<ReturnType<typeof createAdminAndLogin>>;

// tests/setup.ts's global beforeEach clears users/submissions/etc. but
// deliberately never touches Product (only each file's own beforeAll/
// afterAll do, via resetDb()) — so fixture products created by one test in
// this file would otherwise silently persist into the next one and inflate
// eligibleCount. Fixture products always default to category 'Fixture'
// (see helpers.ts), which the 45 seeded synthetic products never use, so
// this can clean up exactly the former without touching the latter.
afterEach(async () => {
  // TaskSubmission.productId is ON DELETE RESTRICT — must clear
  // submissions against Fixture products before the products themselves.
  await prisma.taskSubmission.deleteMany({ where: { product: { category: 'Fixture' } } });
  await prisma.product.deleteMany({ where: { category: 'Fixture' } });
});

// vitest.config.ts shrinks the tier order bands for fast fixtures — Bronze
// stays wide enough (32, see that file's comment) to exercise all 3 fixed
// Merged Product milestones (orders 10/20/30) inside a single band. Every
// number below is read from the real tiers util rather than hardcoded, so
// these tests stay correct no matter how the bands are configured.
const BRONZE_BAND_SIZE = TIERS.Bronze.maxOrders - TIERS.Bronze.minOrders;

async function enableUsdt(admin: AdminSession, address = 'TAddressExample123') {
  const res = await admin.agent
    .put('/api/admin/crypto-assets/USDT')
    .set('X-CSRF-Token', admin.csrfToken)
    .send({ address, isEnabled: true });
  expect(res.status).toBe(200);
  return res.body.data.asset;
}

async function completeTraining(user: Session) {
  await completeTrainingTasks(user);
}

describe('workbench — fixed band size per tier (never derived from catalog size)', () => {
  it('reports the total as the sum of every tier band, not the number of products returned', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE);
    const { agent } = await registerAndLogin();

    const res = await agent.get('/api/orders/workbench');
    expect(res.body.data.workbench.progress.total).toBe(TIERS.Platinum.maxOrders);
    expect(res.body.data.workbench.status).not.toBe('NOT_READY');
    expect(res.body.data.workbench.tier).toBe('Bronze');
  });

  it('never falsely reports a smaller "eligible == required" match when fewer than the band needs exist', async () => {
    // 3 eligible Bronze products, but the Bronze band requires BRONZE_BAND_SIZE.
    await createFixtureWorkbenchSet(3);
    const { agent } = await registerAndLogin();

    const res = await agent.get('/api/orders/workbench');
    expect(res.body.data.workbench.status).toBe('NOT_READY');
    expect(res.body.data.workbench.eligibleCount).toBe(3);
    expect(res.body.data.workbench.bandRequired).toBe(BRONZE_BAND_SIZE);
    expect(res.body.data.workbench.progress).toEqual({ completed: 0, total: TIERS.Platinum.maxOrders });
    expect(res.body.data.workbench.currentProduct).toBeNull();
  });

  it('blocks submission entirely while the workbench is not ready', async () => {
    const products = await createFixtureWorkbenchSet(2);
    const { agent, csrfToken } = await registerAndLogin();

    const state = await agent.get('/api/orders/workbench');
    expect(state.body.data.workbench.status).toBe('NOT_READY');
    expect(state.body.data.workbench.currentProduct).toBeNull();

    // Try to submit a valid product - should be blocked when workbench not ready
    const res = await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({ productId: products[0].id });
    expect(res.status).toBe(409);
  });

  it('tracks global completed/total correctly through a full Bronze band, ending at BRONZE_BAND_SIZE/grandTotal', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE);
    const { agent, csrfToken, body } = await registerAndLogin();
    // High enough to absorb the 3 merge events naturally occurring inside
    // the Bronze band (orders 10/20/30) without ever going negative — this
    // test is only about completed/total tracking, not shortfall behavior.
    await prisma.user.update({ where: { id: body.data.user.id }, data: { workbenchBalance: 100_000 } });

    let completed = 0;
    while (completed < BRONZE_BAND_SIZE - 1) {
      const state = await agent.get('/api/orders/workbench');
      const wb = state.body.data.workbench;
      const productId = wb.status === 'MERGE' ? wb.mergeBundle.products[0].id : wb.currentProduct.id;
      const res = await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({ productId });
      completed += res.body.data.submittedCount;
    }

    const almostDone = await agent.get('/api/orders/workbench');
    expect(almostDone.body.data.workbench.progress).toEqual({
      completed: BRONZE_BAND_SIZE - 1,
      total: TIERS.Platinum.maxOrders,
    });
    expect(almostDone.body.data.workbench.status).toBe('NORMAL');

    const last = almostDone.body.data.workbench.currentProduct;
    await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({ productId: last.id });

    // Bronze's own band is now exhausted. Deposits ($0) haven't reached
    // Silver's requirement, so the customer is TIER_LOCKED, not falsely
    // reported as fully COMPLETED.
    const finished = await agent.get('/api/orders/workbench');
    expect(finished.body.data.workbench.progress.completed).toBe(BRONZE_BAND_SIZE);
    expect(finished.body.data.workbench.status).toBe('TIER_LOCKED');
    expect(finished.body.data.workbench.depositsNeededForNextTier).toBeCloseTo(TIERS.Silver.minDeposits, 5);
  });
});

describe('workbench — commission (server-side, simulated)', () => {
  it('computes normal commission as exactly 1% of the full product price', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 100);
    const { agent, csrfToken } = await registerAndLogin();

    const state = await agent.get('/api/orders/workbench');
    const product = state.body.data.workbench.currentProduct;

    const res = await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({ productId: product.id });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('NORMAL');
    expect(res.body.data.commissionEarned).toBeCloseTo(1.0, 5);
    expect(res.body.data.user.totalEarnings).toBeCloseTo(1.0, 5);
  });

  it('computes merged commission as exactly 10% of the combined bundled value', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 100);
    const { agent, csrfToken, body } = await registerAndLogin();
    await prisma.user.update({
      where: { id: body.data.user.id },
      data: { completedOrders: 9, workbenchBalance: 1000 }, // 1 short of the order-10 milestone
    });

    const state = await agent.get('/api/orders/workbench');
    expect(state.body.data.workbench.status).toBe('MERGE');
    expect(state.body.data.workbench.mergeBundle.combinedValue).toBeCloseTo(300, 5);
    expect(state.body.data.workbench.mergeBundle.commission).toBeCloseTo(30, 5);

    const first = state.body.data.workbench.mergeBundle.products[0];
    const res = await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({ productId: first.id });
    expect(res.body.data.status).toBe('MERGE');
    expect(res.body.data.commissionEarned).toBeCloseTo(30, 5);
    expect(res.body.data.submittedCount).toBe(3);
  });

  it('never trusts a client-supplied commission amount', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 50);
    const { agent, csrfToken } = await registerAndLogin();
    const state = await agent.get('/api/orders/workbench');
    const product = state.body.data.workbench.currentProduct;

    const res = await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: product.id, commission: 999999 });
    expect(res.status).toBe(201);
    expect(res.body.data.commissionEarned).toBeCloseTo(0.5, 5); // real 1% of $50
  });
});

describe('workbench — Merged Product: exactly 3, fixed at orders 10/20/30', () => {
  it('fires exactly at order 10, 20, and 30 — never before, never after 30, never a 4th time', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 100);
    const { agent, csrfToken, body } = await registerAndLogin();
    await prisma.user.update({ where: { id: body.data.user.id }, data: { workbenchBalance: 100_000 } });

    const mergeOrdersSeen: number[] = [];
    let i = 0;
    while (mergeOrdersSeen.length < 3) {
      const state = await agent.get('/api/orders/workbench');
      const wb = state.body.data.workbench;
      expect(wb.status).not.toBe('COMPLETED');
      expect(wb.status).not.toBe('TIER_LOCKED');

      const isMerge = wb.status === 'MERGE';
      const productId = isMerge ? wb.mergeBundle.products[0].id : wb.currentProduct.id;
      const before = i;
      const res = await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({ productId });
      expect(res.status).toBe(201);
      if (isMerge) {
        mergeOrdersSeen.push(before + 1); // the order count the merge landed on
      }
      i += res.body.data.submittedCount;
    }

    expect(mergeOrdersSeen).toEqual([10, 20, 30]);

    const user = await prisma.user.findUnique({ where: { id: body.data.user.id } });
    expect(user!.mergedMilestonesReached).toBe(3);

    // Every remaining Bronze slot (orders 31 through BRONZE_BAND_SIZE) must
    // contain only normal products — no 4th merge, ever.
    for (; i < BRONZE_BAND_SIZE; ) {
      const state = await agent.get('/api/orders/workbench');
      expect(state.body.data.workbench.status).toBe('NORMAL');
      const res = await agent
        .post('/api/orders')
        .set('X-CSRF-Token', csrfToken)
        .send({ productId: state.body.data.workbench.currentProduct.id });
      expect(res.body.data.status).toBe('NORMAL');
      i += res.body.data.submittedCount;
    }
  });

  it('cannot be forged by the client — merge status is only ever server-decided', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 100);
    const { agent, csrfToken } = await registerAndLogin();
    const state = await agent.get('/api/orders/workbench');
    expect(state.body.data.workbench.status).toBe('NORMAL');

    // Nothing in the submit endpoint accepts a client-supplied merge flag —
    // sending one has no effect and the normal 1% commission still applies.
    const res = await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: state.body.data.workbench.currentProduct.id, isMergedOrder: true, status: 'MERGE' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('NORMAL');
    expect(res.body.data.commissionEarned).toBeCloseTo(1.0, 5);
  });
});

describe('workbench — product value increases by tier', () => {
  it('a Bronze customer only ever receives Bronze-eligible products', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 10, 'Bronze');
    await createFixtureWorkbenchSet(TIERS.Silver.maxOrders - TIERS.Silver.minOrders, 999, 'Silver');
    const { agent } = await registerAndLogin();

    const state = await agent.get('/api/orders/workbench');
    expect(state.body.data.workbench.tier).toBe('Bronze');
    expect(state.body.data.workbench.currentProduct.price).toBe(10);
  });

  it('a Silver-tier customer draws from the Silver pool, not Bronze, once their band is reached', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 10, 'Bronze');
    const silverBandSize = TIERS.Silver.maxOrders - TIERS.Silver.minOrders;
    await createFixtureWorkbenchSet(silverBandSize, 999, 'Silver');
    const { agent, body } = await registerAndLogin();
    await prisma.user.update({
      where: { id: body.data.user.id },
      // completedOrders is past all 3 fixed merge milestones (10/20/30) —
      // mergedMilestonesReached must reflect that, or the workbench thinks
      // milestone #1 is still due and wrongly reports MERGE instead of
      // NORMAL. A real user reaching this many orders would necessarily
      // have already triggered all 3 along the way.
      data: { completedOrders: TIERS.Silver.minOrders, totalDeposits: TIERS.Silver.minDeposits, mergedMilestonesReached: 3 },
    });

    const state = await agent.get('/api/orders/workbench');
    expect(state.body.data.workbench.tier).toBe('Silver');
    expect(state.body.data.workbench.currentProduct.price).toBe(999);
  });

  it('a Gold-tier customer draws from the Gold pool, a higher value range than Silver/Bronze', async () => {
    await createFixtureWorkbenchSet(TIERS.Gold.maxOrders - TIERS.Gold.minOrders, 5000, 'Gold');
    const { agent, body } = await registerAndLogin();
    await prisma.user.update({
      where: { id: body.data.user.id },
      data: { completedOrders: TIERS.Gold.minOrders, totalDeposits: TIERS.Gold.minDeposits, mergedMilestonesReached: 3 },
    });

    const state = await agent.get('/api/orders/workbench');
    expect(state.body.data.workbench.tier).toBe('Gold');
    expect(state.body.data.workbench.currentProduct.price).toBe(5000);
  });

  it('a Platinum-tier customer draws from the Platinum pool, the highest value range', async () => {
    await createFixtureWorkbenchSet(TIERS.Platinum.maxOrders - TIERS.Platinum.minOrders, 10_000, 'Platinum');
    const { agent, body } = await registerAndLogin();
    await prisma.user.update({
      where: { id: body.data.user.id },
      data: { completedOrders: TIERS.Platinum.minOrders, totalDeposits: TIERS.Platinum.minDeposits, mergedMilestonesReached: 3 },
    });

    const state = await agent.get('/api/orders/workbench');
    expect(state.body.data.workbench.tier).toBe('Platinum');
    expect(state.body.data.workbench.currentProduct.price).toBe(10_000);
  });

  it('reports NOT_READY for a tier whose own band lacks enough eligible products, independent of other bands', async () => {
    // Plenty of Bronze products, but zero tagged Silver — a customer who
    // has already reached Silver's order/deposit thresholds must not be
    // silently handed Bronze products instead.
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 10, 'Bronze');
    const { agent, body } = await registerAndLogin();
    await prisma.user.update({
      where: { id: body.data.user.id },
      data: { completedOrders: TIERS.Silver.minOrders, totalDeposits: TIERS.Silver.minDeposits },
    });

    const state = await agent.get('/api/orders/workbench');
    expect(state.body.data.workbench.tier).toBe('Silver');
    expect(state.body.data.workbench.status).toBe('NOT_READY');
    expect(state.body.data.workbench.currentProduct).toBeNull();
  });

  it('cannot be spoofed from the client — submitting a wrong-tier productId is rejected', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 10, 'Bronze');
    const [silverProduct] = await createFixtureWorkbenchSet(2, 999, 'Silver');
    const { agent, csrfToken } = await registerAndLogin(); // Bronze tier

    const res = await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: silverProduct.id });
    expect(res.status).toBe(400);
  });
});

describe('workbench — continuous tier progression (never resets)', () => {
  it('starts every fresh customer at Bronze, 0 orders, $0 deposits', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE);
    const { agent } = await registerAndLogin();
    const state = await agent.get('/api/orders/workbench');
    expect(state.body.data.workbench.tier).toBe('Bronze');
    expect(state.body.data.workbench.nextTier).toBe('Silver');
    expect(state.body.data.workbench.progress.completed).toBe(0);
  });

  it('advances tier exactly at the band boundary, using the SAME cumulative counter — no per-tier reset', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE);
    const { agent, body } = await registerAndLogin();

    // One order short of Silver's boundary — still Bronze. Also past all 3
    // fixed merge milestones (10/20/30) — see the tier-by-tier fixtures
    // above for why mergedMilestonesReached must be kept consistent.
    await prisma.user.update({
      where: { id: body.data.user.id },
      data: {
        completedOrders: TIERS.Silver.minOrders - 1,
        totalDeposits: TIERS.Silver.minDeposits,
        mergedMilestonesReached: 3,
      },
    });
    const before = await agent.get('/api/orders/workbench');
    expect(before.body.data.workbench.tier).toBe('Bronze');
    expect(before.body.data.workbench.progress.completed).toBe(TIERS.Silver.minOrders - 1);

    // Exactly at the boundary (same global counter, not reset) — now Silver.
    await prisma.user.update({
      where: { id: body.data.user.id },
      data: { completedOrders: TIERS.Silver.minOrders, mergedMilestonesReached: 3 },
    });
    const after = await agent.get('/api/orders/workbench');
    expect(after.body.data.workbench.tier).toBe('Silver');
    expect(after.body.data.workbench.progress.completed).toBe(TIERS.Silver.minOrders);
  });

  it('reaches Platinum and reports the final grand-total state once every band is complete', async () => {
    const { agent, body } = await registerAndLogin();
    await prisma.user.update({
      where: { id: body.data.user.id },
      data: {
        completedOrders: TIERS.Platinum.maxOrders,
        totalDeposits: TIERS.Platinum.maxDeposits,
        mergedMilestonesReached: 3,
      },
    });
    const state = await agent.get('/api/orders/workbench');
    expect(state.body.data.workbench.tier).toBe('Platinum');
    expect(state.body.data.workbench.nextTier).toBeNull();
    expect(state.body.data.workbench.progress).toEqual({
      completed: TIERS.Platinum.maxOrders,
      total: TIERS.Platinum.maxOrders,
    });
  });

  it('cannot be spoofed — a client-supplied tier/order count on the request body has no effect', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 10, 'Bronze');
    const { agent, csrfToken } = await registerAndLogin();
    const state = await agent.get('/api/orders/workbench');

    const res = await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: state.body.data.workbench.currentProduct.id, tier: 'Platinum', completedOrders: 9999 });
    expect(res.status).toBe(201);
    expect(res.body.data.user.completedOrders).toBe(1);
  });
});

describe('workbench — simulated negative balance (demo-only, never real crypto)', () => {
  it('a merged product can drive the demo working balance negative, producing an exact shortfall', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 100);
    const { agent, csrfToken, body } = await registerAndLogin();
    await prisma.user.update({
      where: { id: body.data.user.id },
      data: { completedOrders: 9, workbenchBalance: 40 },
    });

    const state = await agent.get('/api/orders/workbench');
    const first = state.body.data.workbench.mergeBundle.products[0];

    const res = await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({ productId: first.id });
    // 40 + 30 - 300 = -230
    expect(res.body.data.user.workbenchBalance).toBeCloseTo(-230, 5);
    expect(res.body.data.workbench.status).toBe('SHORTFALL');
    expect(res.body.data.workbench.shortfall).toBeCloseTo(230, 5);

    // The REAL Wallet balance must be completely untouched by this.
    expect(res.body.data.user.balance).toBe(0);
  });

  it('a simulated shortfall never creates a real Deposit or Transaction record', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 100);
    const { agent, csrfToken, body } = await registerAndLogin();

    const state = await agent.get('/api/orders/workbench');
    const product = state.body.data.workbench.currentProduct;
    await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({ productId: product.id });

    const deposits = await prisma.deposit.findMany({ where: { userId: body.data.user.id } });
    const transactions = await prisma.transaction.findMany({ where: { userId: body.data.user.id } });
    expect(deposits).toHaveLength(0);
    expect(transactions).toHaveLength(0);
  });

  it('blocks the next submission while the demo balance is negative', async () => {
    // Create products we will use for submission
    const products = await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 100);
    const { agent, csrfToken } = await registerAndLogin();

    // Submit first product - this will make the workbench balance negative
    await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: products[0].id });

    // Now try to submit the second product - should be blocked due to negative balance
    const blocked = await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({
      productId: products[1].id
    });
    expect(blocked.status).toBe(403);
  });
});

describe('workbench — demo-credit shortfall resolution (simulation only)', () => {
  it('resolves a simulated shortfall instantly with demo credits, touching only workbenchBalance', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 100);
    const { agent, csrfToken, body } = await registerAndLogin();

    const state = await agent.get('/api/orders/workbench');
    await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: state.body.data.workbench.currentProduct.id });

    const beforeResolve = await agent.get('/api/orders/workbench');
    expect(beforeResolve.body.data.workbench.status).toBe('SHORTFALL');

    const resolve = await agent.post('/api/orders/resolve-demo-shortfall').set('X-CSRF-Token', csrfToken);
    expect(resolve.status).toBe(200);
    expect(resolve.body.data.user.workbenchBalance).toBe(0);
    expect(resolve.body.data.workbench.status).not.toBe('SHORTFALL');

    // Real balance/totalDeposits/isMerged history must be completely
    // unaffected — no Deposit ever existed for this user.
    const me = await agent.get('/api/auth/me');
    expect(me.body.data.user.balance).toBe(0);
    expect(me.body.data.user.totalDeposits).toBe(0);
    const deposits = await prisma.deposit.findMany({ where: { userId: body.data.user.id } });
    expect(deposits).toHaveLength(0);
  });

  it('rejects resolving when there is no shortfall to resolve', async () => {
    const { agent, csrfToken } = await registerAndLogin();
    const res = await agent.post('/api/orders/resolve-demo-shortfall').set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(409);
  });

  it('a customer cannot fake the demo balance directly — only the resolve endpoint can clear a shortfall', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 100);
    const { agent, csrfToken } = await registerAndLogin();
    const state = await agent.get('/api/orders/workbench');
    await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: state.body.data.workbench.currentProduct.id });

    // No endpoint accepts a client-supplied balance/workbenchBalance value
    // anywhere — submitOrderSchema only ever accepts { productId }.
    const attempt = await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: 'anything', workbenchBalance: 5000, balance: 5000 });
    expect(attempt.status).not.toBe(201);
  });
});

describe('workbench — real deposit system stays fully separate', () => {
  it('the real deposit flow (PENDING -> admin approval) is completely unchanged and never touches workbenchBalance', async () => {
    const admin = await createAdminAndLogin();
    await enableUsdt(admin);
    const user = await registerAndLogin();
    await completeTraining(user);

    const depositRes = await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'USDT', amount: 50 });
    expect(depositRes.status).toBe(201);
    expect(depositRes.body.data.deposit.status).toBe('PENDING');

    const pending = await admin.agent.get('/api/admin/deposits?status=PENDING');
    const depositId = pending.body.data.deposits[0].id;
    const approve = await admin.agent
      .post(`/api/admin/deposits/${depositId}/approve`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(approve.status).toBe(200);

    const me = await user.agent.get('/api/auth/me');
    expect(me.body.data.user.balance).toBeCloseTo(50, 5); // real balance credited
    expect(me.body.data.user.workbenchBalance).toBe(0); // simulation untouched
  });

  it('a simulated workbench shortfall does not block or alter the real deposit flow, and vice versa', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 100);
    const admin = await createAdminAndLogin();
    await enableUsdt(admin);
    const user = await registerAndLogin();
    await completeTraining(user);

    // Create a workbench shortfall.
    const state = await user.agent.get('/api/orders/workbench');
    await user.agent
      .post('/api/orders')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ productId: state.body.data.workbench.currentProduct.id });
    const shortfallCheck = await user.agent.get('/api/orders/workbench');
    expect(shortfallCheck.body.data.workbench.status).toBe('SHORTFALL');

    // The real deposit flow works exactly as if the workbench didn't exist.
    const depositRes = await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'USDT', amount: 200 });
    expect(depositRes.status).toBe(201);

    // Approving that real deposit must NOT resolve the simulated shortfall.
    const pending = await admin.agent.get('/api/admin/deposits?status=PENDING');
    const depositId = pending.body.data.deposits[0].id;
    await admin.agent.post(`/api/admin/deposits/${depositId}/approve`).set('X-CSRF-Token', admin.csrfToken);

    const stillShortfall = await user.agent.get('/api/orders/workbench');
    expect(stillShortfall.body.data.workbench.status).toBe('SHORTFALL');
    const me = await user.agent.get('/api/auth/me');
    expect(me.body.data.user.balance).toBeCloseTo(200, 5); // real deposit credited
    expect(me.body.data.user.workbenchBalance).toBeLessThan(0); // simulation still negative
  });

  it('still enforces the training gate on the real deposit flow, independent of workbench state', async () => {
    const user = await registerAndLogin(); // training NOT completed
    const admin = await createAdminAndLogin();
    await enableUsdt(admin);

    const res = await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'USDT', amount: 50 });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Complete the required training before making a deposit.');
  });
});

describe('workbench — anti-bypass', () => {
  it('cannot fake progress: submitting an id other than the server-assigned current product is rejected', async () => {
    const products = await createFixtureWorkbenchSet(BRONZE_BAND_SIZE, 20);
    const { agent, csrfToken } = await registerAndLogin();
    const state = await agent.get('/api/orders/workbench');
    const current = state.body.data.workbench.currentProduct;
    const notCurrent = products.find((p) => p.id !== current.id)!;

    const res = await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: notCurrent.id });
    expect(res.status).toBe(400);
  });

  it('cannot mark the set complete without real backend submissions', async () => {
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE);
    const { agent } = await registerAndLogin();
    const res = await agent.get('/api/orders/workbench');
    expect(res.body.data.workbench.status).not.toBe('COMPLETED');
    expect(res.body.data.workbench.progress.completed).toBe(0);
  });
});

describe('workbench — supporting systems remain intact', () => {
  it('existing authentication (register/login/session) continues to work and now includes workbenchBalance', async () => {
    const { agent, body } = await registerAndLogin();
    expect(body.data.user.workbenchBalance).toBe(0);
    expect(body.data.user.balance).toBe(0);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(body.data.user.email);
  });

  it('existing admin product controls (create/price/publish) remain intact and reflect in the workbench', async () => {
    const admin = await createAdminAndLogin();
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE - 1, 100); // one short of ready
    const { agent } = await registerAndLogin();

    const before = await agent.get('/api/orders/workbench');
    expect(before.body.data.workbench.status).toBe('NOT_READY');
    expect(before.body.data.workbench.eligibleCount).toBe(BRONZE_BAND_SIZE - 1);

    const create = await admin.agent
      .post('/api/admin/products')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ name: 'Fixture Product Extra', category: 'Fixture', reward: 1, cost: 0.3, price: 100, isActive: true });
    expect(create.status).toBe(201);
    expect(create.body.data.product.tierEligibility).toBe('Bronze');

    const after = await agent.get('/api/orders/workbench');
    expect(after.body.data.workbench.eligibleCount).toBe(BRONZE_BAND_SIZE);
    expect(after.body.data.workbench.status).not.toBe('NOT_READY');
  });

  it('admin sees per-tier workbench readiness on the products list', async () => {
    const admin = await createAdminAndLogin();
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE - 2, 100);

    const res = await admin.agent.get('/api/admin/products');
    const bronzeRow = res.body.data.workbenchReadiness.tiers.find((t: { tier: string }) => t.tier === 'Bronze');
    expect(bronzeRow).toEqual({ tier: 'Bronze', eligibleCount: BRONZE_BAND_SIZE - 2, required: BRONZE_BAND_SIZE, ready: false });
    expect(res.body.data.workbenchReadiness.ready).toBe(false);
  });

  it('admin can set a product\'s tier eligibility explicitly', async () => {
    const admin = await createAdminAndLogin();
    const create = await admin.agent
      .post('/api/admin/products')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        name: 'Gold Fixture',
        category: 'Fixture',
        reward: 1,
        cost: 0.3,
        price: 500,
        tierEligibility: 'Gold',
        isActive: true,
      });
    expect(create.status).toBe(201);
    expect(create.body.data.product.tierEligibility).toBe('Gold');

    const update = await admin.agent
      .put(`/api/admin/products/${create.body.data.product.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ tierEligibility: 'Platinum' });
    expect(update.status).toBe(200);
    expect(update.body.data.product.tierEligibility).toBe('Platinum');
  });
});
