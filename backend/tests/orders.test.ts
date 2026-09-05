import { describe, it, expect, afterEach } from 'vitest';
import { prisma } from '../src/lib/prisma';
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

// vitest.config.ts overrides SIMULATION_WORKBENCH_SET_SIZE to 5 for tests —
// exercises the exact same "fixed set size, never derived from catalog"
// logic as the real default (45) without needing 45 fixture products per
// scenario.
const SET_SIZE = 5;

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

describe('workbench — fixed set size (never derived from catalog size)', () => {
  it('reports the total as the fixed configured set size, not the number of products returned', async () => {
    await createFixtureWorkbenchSet(SET_SIZE);
    const { agent } = await registerAndLogin();

    const res = await agent.get('/api/orders/workbench');
    expect(res.body.data.workbench.progress.total).toBe(SET_SIZE);
    expect(res.body.data.workbench.status).not.toBe('NOT_READY');
  });

  it('never falsely reports a smaller "eligible == total" match when fewer than the required count exist', async () => {
    // 3 eligible products, but the set size requires 5.
    await createFixtureWorkbenchSet(3);
    const { agent } = await registerAndLogin();

    const res = await agent.get('/api/orders/workbench');
    expect(res.body.data.workbench.status).toBe('NOT_READY');
    expect(res.body.data.workbench.eligibleCount).toBe(3);
    expect(res.body.data.workbench.progress).toEqual({ completed: 0, total: SET_SIZE });
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

  it('tracks completed/total correctly through a full set, ending at exactly N/N', async () => {
    await createFixtureWorkbenchSet(SET_SIZE);
    const { agent, csrfToken, body } = await registerAndLogin();
    await prisma.user.update({ where: { id: body.data.user.id }, data: { workbenchBalance: 1000 } });

    for (let i = 0; i < SET_SIZE - 1; i += 1) {
      const state = await agent.get('/api/orders/workbench');
      const current = state.body.data.workbench.currentProduct;
      await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({ productId: current.id });
    }

    const almostDone = await agent.get('/api/orders/workbench');
    expect(almostDone.body.data.workbench.progress).toEqual({ completed: SET_SIZE - 1, total: SET_SIZE });
    expect(almostDone.body.data.workbench.status).toBe('NORMAL');

    const last = almostDone.body.data.workbench.currentProduct;
    await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({ productId: last.id });

    const finished = await agent.get('/api/orders/workbench');
    expect(finished.body.data.workbench.progress).toEqual({ completed: SET_SIZE, total: SET_SIZE });
    expect(finished.body.data.workbench.status).toBe('COMPLETED');
  });
});

describe('workbench — commission (server-side, simulated)', () => {
  it('computes normal commission as exactly 1% of the full product price', async () => {
    await createFixtureWorkbenchSet(SET_SIZE, 100);
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
    await createFixtureWorkbenchSet(SET_SIZE, 100);
    const { agent, csrfToken, body } = await registerAndLogin();
    await prisma.user.update({
      where: { id: body.data.user.id },
      data: { completedOrders: 14, workbenchBalance: 1000 },
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
    await createFixtureWorkbenchSet(SET_SIZE, 50);
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

describe('workbench — simulated negative balance (demo-only, never real crypto)', () => {
  it('a merged product can drive the demo working balance negative, producing an exact shortfall', async () => {
    await createFixtureWorkbenchSet(SET_SIZE, 100);
    const { agent, csrfToken, body } = await registerAndLogin();
    await prisma.user.update({
      where: { id: body.data.user.id },
      data: { completedOrders: 14, workbenchBalance: 40 },
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
    await createFixtureWorkbenchSet(SET_SIZE, 100);
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
    const products = await createFixtureWorkbenchSet(SET_SIZE + 1, 100);
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
    await createFixtureWorkbenchSet(SET_SIZE, 100);
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
    await createFixtureWorkbenchSet(SET_SIZE, 100);
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
    await createFixtureWorkbenchSet(SET_SIZE, 100);
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
    const products = await createFixtureWorkbenchSet(SET_SIZE, 20);
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
    await createFixtureWorkbenchSet(SET_SIZE);
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
    await createFixtureWorkbenchSet(SET_SIZE - 1, 100); // one short of ready
    const { agent } = await registerAndLogin();

    const before = await agent.get('/api/orders/workbench');
    expect(before.body.data.workbench.status).toBe('NOT_READY');
    expect(before.body.data.workbench.eligibleCount).toBe(SET_SIZE - 1);

    const create = await admin.agent
      .post('/api/admin/products')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ name: 'Fixture Product Extra', category: 'Fixture', reward: 1, cost: 0.3, price: 100, isActive: true });
    expect(create.status).toBe(201);

    const after = await agent.get('/api/orders/workbench');
    expect(after.body.data.workbench.eligibleCount).toBe(SET_SIZE);
    expect(after.body.data.workbench.status).not.toBe('NOT_READY');
  });

  it("admin sees workbench readiness on the products list", async () => {
    const admin = await createAdminAndLogin();
    await createFixtureWorkbenchSet(SET_SIZE - 2, 100);

    const res = await admin.agent.get('/api/admin/products');
    expect(res.body.data.workbenchReadiness).toEqual({
      eligibleCount: SET_SIZE - 2,
      required: SET_SIZE,
      ready: false,
    });
  });
});