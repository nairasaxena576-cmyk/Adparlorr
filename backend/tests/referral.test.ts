import { describe, it, expect } from 'vitest';
import { registerAndLogin, createFixtureProduct, createFixtureWorkbenchSet } from './helpers';
import { TIERS } from '../src/utils/tiers';

// Bronze band width — the workbench only reports NORMAL/ready once at
// least this many Bronze-eligible products exist (order.service.ts's
// loadWorkbenchSet). Previously a flat SIMULATION_WORKBENCH_SET_SIZE=5.
const BRONZE_BAND_SIZE = TIERS.Bronze.maxOrders - TIERS.Bronze.minOrders;

describe('referrals', () => {
  it('links a new user to the referrer identified by the entered code', async () => {
    const referrer = await registerAndLogin();
    const referrerCode = referrer.body.data.user.referralCode;

    const referred = await registerAndLogin({ referralCode: referrerCode });
    expect(referred.body.success).toBe(true);

    const res = await referrer.agent.get('/api/referrals');
    expect(res.body.data.referrals).toHaveLength(1);
    expect(res.body.data.stats.joined).toBe(1);
  });

  it('does not block registration when the referral code is unknown', async () => {
    const res = await registerAndLogin({ referralCode: 'NOTREAL' });
    expect(res.body.success).toBe(true);
  });

  it("does not overwrite the new user's own referral code with the entered one", async () => {
    const referrer = await registerAndLogin();
    const referred = await registerAndLogin({ referralCode: referrer.body.data.user.referralCode });
    expect(referred.body.data.user.referralCode).not.toBe(referrer.body.data.user.referralCode);
  });

  it('marks a referral ACTIVE once the referred user completes their first task', async () => {
    const referrer = await registerAndLogin();
    const referred = await registerAndLogin({ referralCode: referrer.body.data.user.referralCode });

    // Create enough Bronze-eligible products to make the workbench ready.
    await createFixtureWorkbenchSet(BRONZE_BAND_SIZE);
    const workbenchRes = await referred.agent.get('/api/orders/workbench');
    const currentProduct = workbenchRes.body.data.workbench.currentProduct;
    const submitRes = await referred.agent
      .post('/api/orders')
      .set('X-CSRF-Token', referred.csrfToken)
      .send({ productId: currentProduct.id });
    expect(submitRes.status).toBe(201);

    const res = await referrer.agent.get('/api/referrals');
    expect(res.body.data.referrals[0].status).toBe('ACTIVE');
  });
});
