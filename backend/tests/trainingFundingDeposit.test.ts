import { describe, it, expect } from 'vitest';
import { registerAndLogin, createAdminAndLogin } from './helpers';
import { prisma } from '../src/lib/prisma';

type AdminSession = Awaited<ReturnType<typeof createAdminAndLogin>>;

// Every deposit-creating test needs the asset admin-enabled first — deposit
// methods start disabled/unconfigured in the test DB (see tests/setup.ts's
// resetCryptoAssets()), same precondition deposit.test.ts's own enableUsdt
// establishes for ordinary deposits.
async function enableUsdt(admin: AdminSession, address = 'TAddressExample123') {
  const res = await admin.agent
    .put('/api/admin/crypto-assets/USDT')
    .set('X-CSRF-Token', admin.csrfToken)
    .send({ address, isEnabled: true });
  expect(res.status).toBe(200);
  return res.body.data.asset;
}

async function setupVerifiedReferral() {
  const customer = await registerAndLogin();
  const referrer = await registerAndLogin();
  // Gold tier (200 orders / $2000 deposits) — eligible to sponsor training,
  // and deliberately never completed the training-task flow itself, so
  // these tests also prove the deposit gate bypass for funding deposits.
  await prisma.user.update({
    where: { id: referrer.body.data.user.id },
    data: { completedOrders: 200, totalDeposits: 2000 },
  });

  const verifyRes = await customer.agent
    .post('/api/referrals/training/verify')
    .set('X-CSRF-Token', customer.csrfToken)
    .send({ referralCode: referrer.body.data.user.referralCode });
  expect(verifyRes.status).toBe(200);

  return { customer, referrer, referralId: verifyRes.body.data.referral.referralId as string };
}

describe('training funding deposit flow', () => {
  it("lists the pending request only for the referral's own referrer", async () => {
    const { referrer, customer, referralId } = await setupVerifiedReferral();
    const outsider = await registerAndLogin();

    const mine = await referrer.agent.get('/api/referrals/training/funding-requests');
    expect(mine.status).toBe(200);
    expect(mine.body.data.requests).toHaveLength(1);
    expect(mine.body.data.requests[0].referralId).toBe(referralId);
    expect(mine.body.data.requests[0].customerName).toBe(customer.body.data.user.fullName);
    expect(mine.body.data.requests[0].amountRequired).toBe(1000);
    expect(mine.body.data.requests[0].depositStatus).toBe('NONE');

    const notMine = await outsider.agent.get('/api/referrals/training/funding-requests');
    expect(notMine.status).toBe(200);
    expect(notMine.body.data.requests).toHaveLength(0);
  });

  it('lets the referrer submit a training funding deposit despite never completing training themselves', async () => {
    const { referrer, referralId } = await setupVerifiedReferral();
    await enableUsdt(await createAdminAndLogin());

    const depositRes = await referrer.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', referrer.csrfToken)
      .send({ assetCode: 'USDT', amount: 1000, trainingFundingReferralId: referralId });

    expect(depositRes.status).toBe(201);
    expect(depositRes.body.data.deposit.status).toBe('PENDING');

    const pending = await referrer.agent.get('/api/referrals/training/funding-requests');
    expect(pending.body.data.requests[0].depositStatus).toBe('PENDING');
  });

  it('rejects a non-referrer submitting a deposit for someone else\'s referral', async () => {
    const { referralId } = await setupVerifiedReferral();
    const outsider = await registerAndLogin();
    await prisma.user.update({ where: { id: outsider.body.data.user.id }, data: { trainingCompletedAt: new Date() } });

    const attempt = await outsider.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', outsider.csrfToken)
      .send({ assetCode: 'USDT', amount: 1000, trainingFundingReferralId: referralId });

    expect(attempt.status).toBe(403);
  });

  it('rejects a training funding deposit that does not match the required amount', async () => {
    const { referrer, referralId } = await setupVerifiedReferral();

    const attempt = await referrer.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', referrer.csrfToken)
      .send({ assetCode: 'USDT', amount: 500, trainingFundingReferralId: referralId });

    expect(attempt.status).toBe(400);
  });

  it('prevents a second pending funding deposit for the same referral', async () => {
    const { referrer, referralId } = await setupVerifiedReferral();
    await enableUsdt(await createAdminAndLogin());

    const first = await referrer.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', referrer.csrfToken)
      .send({ assetCode: 'USDT', amount: 1000, trainingFundingReferralId: referralId });
    expect(first.status).toBe(201);

    const duplicate = await referrer.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', referrer.csrfToken)
      .send({ assetCode: 'USDT', amount: 1000, trainingFundingReferralId: referralId });
    expect(duplicate.status).toBe(409);
  });

  it('approving the deposit confirms funding, credits (not debits) the referrer, and unlocks the customer — leaving workbenchBalance untouched', async () => {
    const { referrer, customer, referralId } = await setupVerifiedReferral();
    const admin = await createAdminAndLogin();
    await enableUsdt(admin);

    const depositRes = await referrer.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', referrer.csrfToken)
      .send({ assetCode: 'USDT', amount: 1000, trainingFundingReferralId: referralId });
    const depositId = depositRes.body.data.deposit.id;

    const approveRes = await admin.agent
      .post(`/api/admin/deposits/${depositId}/approve`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.deposit.status).toBe('APPROVED');

    const status = await customer.agent.get('/api/referrals/training');
    expect(status.body.data.referral.fundingComplete).toBe(true);

    const updatedReferrer = await prisma.user.findUnique({ where: { id: referrer.body.data.user.id } });
    expect(Number(updatedReferrer!.balance)).toBe(1000);
    expect(Number(updatedReferrer!.totalDeposits)).toBe(3000);
    expect(Number(updatedReferrer!.workbenchBalance)).toBe(0);

    const stillPending = await referrer.agent.get('/api/referrals/training/funding-requests');
    expect(stillPending.body.data.requests).toHaveLength(0);

    const overview = await admin.agent.get('/api/admin/training-overview');
    const row = overview.body.data.rows.find((r: { referralId: string }) => r.referralId === referralId);
    expect(row.trainingFundedAt).not.toBeNull();
    expect(row.fundingDeposit.status).toBe('APPROVED');
  });

  it('rejecting the deposit leaves funding unconfirmed and allows the referrer to resubmit', async () => {
    const { referrer, customer, referralId } = await setupVerifiedReferral();
    const admin = await createAdminAndLogin();
    await enableUsdt(admin);

    const depositRes = await referrer.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', referrer.csrfToken)
      .send({ assetCode: 'USDT', amount: 1000, trainingFundingReferralId: referralId });
    const depositId = depositRes.body.data.deposit.id;

    const rejectRes = await admin.agent
      .post(`/api/admin/deposits/${depositId}/reject`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(rejectRes.status).toBe(200);

    const status = await customer.agent.get('/api/referrals/training');
    expect(status.body.data.referral.fundingComplete).toBe(false);

    const resubmit = await referrer.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', referrer.csrfToken)
      .send({ assetCode: 'USDT', amount: 1000, trainingFundingReferralId: referralId });
    expect(resubmit.status).toBe(201);
  });
});
