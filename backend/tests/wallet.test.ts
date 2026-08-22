import { describe, it, expect } from 'vitest';
import { registerAndLogin, createAdminAndLogin } from './helpers';

// Deposit creation itself (training gate, per-asset config, admin
// approve/reject) is covered in deposit.test.ts. This file covers what's
// unchanged by that rework: withdrawal requests and transaction history.
describe('wallet (withdrawals and transaction history)', () => {
  it('blocks the simulated withdrawal below the configured minimum balance', async () => {
    const { agent, csrfToken } = await registerAndLogin();
    const res = await agent.post('/api/wallet/withdraw').set('X-CSRF-Token', csrfToken).send({});

    expect(res.status).toBe(200);
    expect(res.body.data.blocked).toBe(true);
  });

  it('returns a simulated pending-review state at/above the minimum, without moving balance', async () => {
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();
    await admin.agent
      .post(`/api/admin/users/${user.body.data.user.id}/credit`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ amount: 150 });

    const res = await user.agent.post('/api/wallet/withdraw').set('X-CSRF-Token', user.csrfToken).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.blocked).toBe(false);
    expect(res.body.data.status).toBe('pending_review');

    const me = await user.agent.get('/api/auth/me');
    expect(me.body.data.user.balance).toBe(150);
  });

  it("only returns the requesting user's own transactions", async () => {
    const admin = await createAdminAndLogin();
    const userA = await registerAndLogin();
    const userB = await registerAndLogin();
    await admin.agent
      .post(`/api/admin/users/${userA.body.data.user.id}/credit`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ amount: 20 });

    const resB = await userB.agent.get('/api/wallet/transactions');
    expect(resB.body.data.transactions).toHaveLength(0);

    const resA = await userA.agent.get('/api/wallet/transactions');
    expect(resA.body.data.transactions).toHaveLength(1);
  });
});
