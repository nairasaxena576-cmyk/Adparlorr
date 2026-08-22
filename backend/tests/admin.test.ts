import { describe, it, expect } from 'vitest';
import { registerAndLogin, createAdminAndLogin } from './helpers';

describe('admin', () => {
  it('credits a simulated balance and flags the response as simulated', async () => {
    const user = await registerAndLogin();
    const admin = await createAdminAndLogin();

    const res = await admin.agent
      .post(`/api/admin/users/${user.body.data.user.id}/credit`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ amount: 30 });

    expect(res.status).toBe(200);
    expect(res.body.data.user.balance).toBe(30);
    expect(res.body.meta.simulation).toBe(true);
  });

  it("resets a user's task and merge state", async () => {
    const user = await registerAndLogin();
    const admin = await createAdminAndLogin();

    const productsRes = await user.agent.get('/api/products');
    const product = productsRes.body.data.products[0];
    await user.agent.post('/api/orders').set('X-CSRF-Token', user.csrfToken).send({ productId: product.id });

    const res = await admin.agent
      .post(`/api/admin/users/${user.body.data.user.id}/reset`)
      .set('X-CSRF-Token', admin.csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.data.user.completedOrders).toBe(0);
    expect(res.body.data.user.isMerged).toBe(false);
  });

  it('rejects credit/reset attempts from a non-admin user', async () => {
    const user = await registerAndLogin();
    const other = await registerAndLogin();

    const res = await other.agent
      .post(`/api/admin/users/${user.body.data.user.id}/credit`)
      .set('X-CSRF-Token', other.csrfToken)
      .send({ amount: 10 });

    expect(res.status).toBe(403);
  });
});
