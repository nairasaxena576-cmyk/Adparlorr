import { describe, it, expect } from 'vitest';
import { registerAndLogin } from './helpers';

describe('orders (task submissions)', () => {
  it('submits a task and updates balance/earnings/completedOrders', async () => {
    const { agent, csrfToken } = await registerAndLogin();
    const productsRes = await agent.get('/api/products');
    const product = productsRes.body.data.products[0];

    const res = await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: product.id });

    expect(res.status).toBe(201);
    expect(res.body.data.user.completedOrders).toBe(1);
    expect(res.body.data.user.balance).toBeCloseTo(product.reward - product.cost, 5);
    expect(res.body.data.user.totalEarnings).toBeCloseTo(product.reward, 5);
  });

  it('rejects submitting the same product twice', async () => {
    const { agent, csrfToken } = await registerAndLogin();
    const productsRes = await agent.get('/api/products');
    const product = productsRes.body.data.products[0];

    await agent.post('/api/orders').set('X-CSRF-Token', csrfToken).send({ productId: product.id });
    const res = await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: product.id });

    expect(res.status).toBe(409);
  });

  it('triggers the simulated merge state at the configured threshold and then blocks further submissions', async () => {
    const { agent, csrfToken } = await registerAndLogin();
    const productsRes = await agent.get('/api/products');
    const products = productsRes.body.data.products;

    let lastRes;
    for (let i = 0; i < 15; i += 1) {
      lastRes = await agent
        .post('/api/orders')
        .set('X-CSRF-Token', csrfToken)
        .send({ productId: products[i].id });
    }

    expect(lastRes!.body.data.mergeTriggered).toBe(true);
    expect(lastRes!.body.data.user.isMerged).toBe(true);

    const blockedRes = await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: products[15].id });

    expect(blockedRes.status).toBe(400);
  });
});
