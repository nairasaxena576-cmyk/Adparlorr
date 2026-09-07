import { describe, it, expect } from 'vitest';
import { prisma } from '../src/lib/prisma';
import {
  registerAndLogin,
  createAdminAndLogin,
  createFixtureTask,
  createFixtureProduct,
} from './helpers';

// Raises a freshly-registered user to a specific tier by directly setting
// the real columns the (server-side) tier calculation reads — completely
// independent of, and never trusting, anything the frontend could claim.
async function setTier(userId: string, tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum') {
  const thresholds = {
    Bronze: { completedOrders: 0, totalDeposits: 0 },
    Silver: { completedOrders: 50, totalDeposits: 500 },
    Gold: { completedOrders: 200, totalDeposits: 2000 },
    Platinum: { completedOrders: 500, totalDeposits: 5000 },
  } as const;
  await prisma.user.update({ where: { id: userId }, data: thresholds[tier] });
}

async function verifyReferral(user: Awaited<ReturnType<typeof registerAndLogin>>, referralCode: string) {
  return user.agent
    .post('/api/referrals/training/verify')
    .set('X-CSRF-Token', user.csrfToken)
    .send({ referralCode });
}

describe('training access gate — referral + tier', () => {
  it('rejects an invalid referral code', async () => {
    const customer = await registerAndLogin();
    const res = await verifyReferral(customer, 'NOTAREALCODE');
    expect(res.status).toBe(400);

    const locked = await customer.agent.get('/api/training/tasks');
    expect(locked.status).toBe(403);
  });

  it('rejects a Bronze-tier referrer', async () => {
    const referrer = await registerAndLogin();
    await setTier(referrer.body.data.user.id, 'Bronze');
    const customer = await registerAndLogin();

    const res = await verifyReferral(customer, referrer.body.data.user.referralCode);
    expect(res.status).toBe(403);

    const locked = await customer.agent.get('/api/training/tasks');
    expect(locked.status).toBe(403);
  });

  it('rejects a Silver-tier referrer', async () => {
    const referrer = await registerAndLogin();
    await setTier(referrer.body.data.user.id, 'Silver');
    const customer = await registerAndLogin();

    const res = await verifyReferral(customer, referrer.body.data.user.referralCode);
    expect(res.status).toBe(403);
  });

  it('accepts a Gold-tier referrer and records the referral', async () => {
    const referrer = await registerAndLogin();
    await setTier(referrer.body.data.user.id, 'Gold');
    const customer = await registerAndLogin();

    const res = await verifyReferral(customer, referrer.body.data.user.referralCode);
    expect(res.status).toBe(200);
    expect(res.body.data.referral.hasReferral).toBe(true);
    expect(res.body.data.referral.tierEligible).toBe(true);
    expect(res.body.data.referral.referrerTier).toBe('Gold');
    expect(res.body.data.referral.fundingComplete).toBe(false);

    // Training remains locked until funding is confirmed — referral alone
    // is not enough.
    const stillLocked = await customer.agent.get('/api/training/tasks');
    expect(stillLocked.status).toBe(403);
  });

  it('accepts a Platinum-tier referrer', async () => {
    const referrer = await registerAndLogin();
    await setTier(referrer.body.data.user.id, 'Platinum');
    const customer = await registerAndLogin();

    const res = await verifyReferral(customer, referrer.body.data.user.referralCode);
    expect(res.status).toBe(200);
    expect(res.body.data.referral.referrerTier).toBe('Platinum');
    expect(res.body.data.referral.tierEligible).toBe(true);
  });

  it('does not allow the referrer to be replaced once verified for training', async () => {
    const referrerA = await registerAndLogin();
    await setTier(referrerA.body.data.user.id, 'Gold');
    const referrerB = await registerAndLogin();
    await setTier(referrerB.body.data.user.id, 'Gold');
    const customer = await registerAndLogin();

    const first = await verifyReferral(customer, referrerA.body.data.user.referralCode);
    expect(first.status).toBe(200);

    const second = await verifyReferral(customer, referrerB.body.data.user.referralCode);
    expect(second.status).toBe(409);
  });
});

describe('training access gate — funding', () => {
  async function setUpVerifiedReferral(referrerTier: 'Gold' | 'Platinum' = 'Gold', referrerBalance = 1500) {
    const referrer = await registerAndLogin();
    await setTier(referrer.body.data.user.id, referrerTier);
    await prisma.user.update({ where: { id: referrer.body.data.user.id }, data: { balance: referrerBalance } });
    const customer = await registerAndLogin();
    const verifyRes = await verifyReferral(customer, referrer.body.data.user.referralCode);
    expect(verifyRes.status).toBe(200);
    return { referrer, customer, referralId: verifyRes.body.data.referral.referralId as string };
  }

  it('keeps training locked until an admin confirms funding', async () => {
    const { customer } = await setUpVerifiedReferral();
    const locked = await customer.agent.get('/api/training/tasks');
    expect(locked.status).toBe(403);
  });

  it('unlocks training once an admin confirms the referrer funded it', async () => {
    const { customer, referralId } = await setUpVerifiedReferral();
    const admin = await createAdminAndLogin();

    const confirmRes = await admin.agent
      .post(`/api/admin/referrals/${referralId}/confirm-funding`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.fundedAmount).toBe(1000);

    const unlocked = await customer.agent.get('/api/training/tasks');
    expect(unlocked.status).toBe(200);
  });

  it('rejects funding confirmation when the referrer lacks sufficient balance', async () => {
    const { referralId } = await setUpVerifiedReferral('Gold', 50); // below the $1000 requirement
    const admin = await createAdminAndLogin();

    const confirmRes = await admin.agent
      .post(`/api/admin/referrals/${referralId}/confirm-funding`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(confirmRes.status).toBe(409);
  });

  it('debits the referrer and records an auditable transaction when funding is confirmed', async () => {
    const { referrer, referralId } = await setUpVerifiedReferral('Gold', 1500);
    const admin = await createAdminAndLogin();

    await admin.agent
      .post(`/api/admin/referrals/${referralId}/confirm-funding`)
      .set('X-CSRF-Token', admin.csrfToken);

    const referrerTxs = await prisma.transaction.findMany({ where: { userId: referrer.body.data.user.id } });
    expect(referrerTxs).toHaveLength(1);
    expect(Number(referrerTxs[0].amount)).toBe(1000);
    expect(referrerTxs[0].status).toBe('COMPLETED');

    const updatedReferrer = await prisma.user.findUnique({ where: { id: referrer.body.data.user.id } });
    expect(Number(updatedReferrer!.balance)).toBe(500);
  });

  it('rejects a non-admin from confirming training funding', async () => {
    const { customer, referralId } = await setUpVerifiedReferral();
    const confirmRes = await customer.agent
      .post(`/api/admin/referrals/${referralId}/confirm-funding`)
      .set('X-CSRF-Token', customer.csrfToken);
    expect(confirmRes.status).toBe(403);
  });

  it('prevents funding from being confirmed twice', async () => {
    const { referralId } = await setUpVerifiedReferral('Gold', 2500);
    const admin = await createAdminAndLogin();

    const first = await admin.agent
      .post(`/api/admin/referrals/${referralId}/confirm-funding`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(first.status).toBe(200);

    const second = await admin.agent
      .post(`/api/admin/referrals/${referralId}/confirm-funding`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(second.status).toBe(409);
  });
});

describe('training task flow — no typing, auto-approve, negative balance', () => {
  async function unlockedCustomer() {
    const referrer = await registerAndLogin();
    await prisma.user.update({
      where: { id: referrer.body.data.user.id },
      data: { completedOrders: 200, totalDeposits: 2000, balance: 1500 },
    });
    const customer = await registerAndLogin();
    const verifyRes = await customer.agent
      .post('/api/referrals/training/verify')
      .set('X-CSRF-Token', customer.csrfToken)
      .send({ referralCode: referrer.body.data.user.referralCode });
    const referralId = verifyRes.body.data.referral.referralId as string;

    const admin = await createAdminAndLogin();
    await admin.agent
      .post(`/api/admin/referrals/${referralId}/confirm-funding`)
      .set('X-CSRF-Token', admin.csrfToken);

    return { customer, referrer, admin };
  }

  it('lets the customer submit without typing a product name, immediately approved', async () => {
    const { customer } = await unlockedCustomer();
    await createFixtureTask({ order: 1, productName: 'Sofa' });

    const list = await customer.agent.get('/api/training/tasks');
    const current = list.body.data.tasks.find((t: { status: string }) => t.status === 'current');

    const submitRes = await customer.agent
      .post(`/api/training/tasks/${current.id}/submit`)
      .set('X-CSRF-Token', customer.csrfToken)
      .send({ answer: 'Submitted' });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.status).toBe('APPROVED');

    const submission = await prisma.trainingTaskSubmission.findUnique({ where: { id: submitRes.body.data.submissionId } });
    expect(submission?.status).toBe('APPROVED');
    expect(submission?.reviewedAt).not.toBeNull();
  });

  it('automatically advances to the next task after submitting', async () => {
    const { customer } = await unlockedCustomer();
    await createFixtureTask({ order: 1, productName: 'Sofa' });
    await createFixtureTask({ order: 2, productName: 'Desk' });

    const before = await customer.agent.get('/api/training/tasks');
    const firstCurrent = before.body.data.tasks.find((t: { status: string }) => t.status === 'current');
    expect(firstCurrent.order).toBe(1);

    await customer.agent
      .post(`/api/training/tasks/${firstCurrent.id}/submit`)
      .set('X-CSRF-Token', customer.csrfToken)
      .send({ answer: 'Submitted' });

    const after = await customer.agent.get('/api/training/tasks');
    const nextCurrent = after.body.data.tasks.find((t: { status: string }) => t.status === 'current');
    expect(nextCurrent.order).toBe(2);
  });

  it('does not require admin review for the new customer training submission', async () => {
    const { customer } = await unlockedCustomer();
    await createFixtureTask({ order: 1, productName: 'Sofa' });

    const list = await customer.agent.get('/api/training/tasks');
    const current = list.body.data.tasks.find((t: { status: string }) => t.status === 'current');
    await customer.agent
      .post(`/api/training/tasks/${current.id}/submit`)
      .set('X-CSRF-Token', customer.csrfToken)
      .send({ answer: 'Submitted' });

    const pending = await prisma.trainingTaskSubmission.findMany({ where: { status: 'PENDING' } });
    expect(pending).toHaveLength(0);
  });

  it('completes training and sets trainingCompletedAt only after every required task is approved', async () => {
    const { customer } = await unlockedCustomer();
    await createFixtureTask({ order: 1, productName: 'Sofa' });
    await createFixtureTask({ order: 2, productName: 'Desk' });

    let list = await customer.agent.get('/api/training/tasks');
    let current = list.body.data.tasks.find((t: { status: string }) => t.status === 'current');
    await customer.agent
      .post(`/api/training/tasks/${current.id}/submit`)
      .set('X-CSRF-Token', customer.csrfToken)
      .send({ answer: 'Submitted' });

    const midway = await customer.agent.get('/api/auth/me');
    expect(midway.body.data.user.trainingCompletedAt).toBeNull();

    list = await customer.agent.get('/api/training/tasks');
    current = list.body.data.tasks.find((t: { status: string }) => t.status === 'current');
    await customer.agent
      .post(`/api/training/tasks/${current.id}/submit`)
      .set('X-CSRF-Token', customer.csrfToken)
      .send({ answer: 'Submitted' });

    const done = await customer.agent.get('/api/auth/me');
    expect(done.body.data.user.trainingCompletedAt).not.toBeNull();
  });

  it('causes a real negative balance when the Merged Product task is submitted', async () => {
    const { customer } = await unlockedCustomer();
    await createFixtureProduct({ price: 100 });
    await createFixtureTask({ order: 1, productName: 'Merged Product Balance' });

    const list = await customer.agent.get('/api/training/tasks');
    const current = list.body.data.tasks.find((t: { status: string }) => t.status === 'current');
    await customer.agent
      .post(`/api/training/tasks/${current.id}/submit`)
      .set('X-CSRF-Token', customer.csrfToken)
      .send({ answer: 'Submitted' });

    const updated = await prisma.user.findUnique({ where: { id: customer.body.data.user.id } });
    expect(Number(updated!.balance)).toBeLessThan(1500); // started at 0 real balance, now net-negative from the event
  });

  it('blocks further task submission while the training-induced balance is negative', async () => {
    const { customer } = await unlockedCustomer();
    await createFixtureProduct({ price: 100 });
    await createFixtureTask({ order: 1, productName: 'Merged Product Balance' });
    await createFixtureTask({ order: 2, productName: 'Sofa' });

    const list = await customer.agent.get('/api/training/tasks');
    const merged = list.body.data.tasks.find((t: { status: string }) => t.status === 'current');
    await customer.agent
      .post(`/api/training/tasks/${merged.id}/submit`)
      .set('X-CSRF-Token', customer.csrfToken)
      .send({ answer: 'Submitted' });

    const blocked = await customer.agent.get('/api/training/tasks');
    expect(blocked.status).toBe(403);
  });

  it('lets an authorized admin resolve the negative training balance, recording amount/admin/transaction', async () => {
    const { customer, admin } = await unlockedCustomer();
    await createFixtureProduct({ price: 100 });
    await createFixtureTask({ order: 1, productName: 'Merged Product Balance' });

    const list = await customer.agent.get('/api/training/tasks');
    const current = list.body.data.tasks.find((t: { status: string }) => t.status === 'current');
    await customer.agent
      .post(`/api/training/tasks/${current.id}/submit`)
      .set('X-CSRF-Token', customer.csrfToken)
      .send({ answer: 'Submitted' });

    const negativeUser = await prisma.user.findUnique({ where: { id: customer.body.data.user.id } });
    expect(Number(negativeUser!.balance)).toBeLessThan(0);

    const resolveRes = await admin.agent
      .post(`/api/admin/users/${customer.body.data.user.id}/resolve-negative-balance`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.amountResolved).toBeCloseTo(-Number(negativeUser!.balance), 5);
    expect(resolveRes.body.data.newBalance).toBe(0);

    const resolvedTx = await prisma.transaction.findUnique({ where: { id: resolveRes.body.data.transactionId } });
    expect(resolvedTx?.type).toBe('ADMIN_CREDIT');
    expect(resolvedTx?.description).toContain('admin');

    // Balance restored to 0 (never negative) — training can continue.
    const after = await prisma.user.findUnique({ where: { id: customer.body.data.user.id } });
    expect(Number(after!.balance)).toBe(0);
  });

  it('rejects a non-admin from resolving a negative training balance', async () => {
    const { customer } = await unlockedCustomer();
    await createFixtureProduct({ price: 100 });
    await createFixtureTask({ order: 1, productName: 'Merged Product Balance' });

    const list = await customer.agent.get('/api/training/tasks');
    const current = list.body.data.tasks.find((t: { status: string }) => t.status === 'current');
    await customer.agent
      .post(`/api/training/tasks/${current.id}/submit`)
      .set('X-CSRF-Token', customer.csrfToken)
      .send({ answer: 'Submitted' });

    const attempt = await customer.agent
      .post(`/api/admin/users/${customer.body.data.user.id}/resolve-negative-balance`)
      .set('X-CSRF-Token', customer.csrfToken);
    expect(attempt.status).toBe(403);
  });

  it('rejects resolving a balance that is not negative', async () => {
    const { customer, admin } = await unlockedCustomer();
    const attempt = await admin.agent
      .post(`/api/admin/users/${customer.body.data.user.id}/resolve-negative-balance`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(attempt.status).toBe(409);
  });
});
