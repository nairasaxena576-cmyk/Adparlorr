import { describe, it, expect } from 'vitest';
import { registerAndLogin, createFixtureProduct, createFixtureWorkbenchSet } from './helpers';

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

    // Create enough products to make workbench ready (test override is 5)
    const products = await createFixtureWorkbenchSet(5);
    const product = products[0];
    await referred.agent.post('/api/orders').set('X-CSRF-Token', referred.csrfToken).send({ productId: product.id });

    const res = await referrer.agent.get('/api/referrals');
    expect(res.body.data.referrals[0].status).toBe('ACTIVE');
  });
});
