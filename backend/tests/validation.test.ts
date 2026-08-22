import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerAndLogin } from './helpers';

describe('validation', () => {
  it('rejects registration with a missing required field', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@example.test', password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects registration with a too-short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'A', email: 'short@example.test', password: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects an order submission with a non-uuid productId', async () => {
    const { agent, csrfToken } = await registerAndLogin();
    const res = await agent
      .post('/api/orders')
      .set('X-CSRF-Token', csrfToken)
      .send({ productId: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });

  it('rejects a deposit request missing the amount field', async () => {
    const { agent, csrfToken } = await registerAndLogin();
    const res = await agent.post('/api/wallet/deposit').set('X-CSRF-Token', csrfToken).send({});
    expect(res.status).toBe(400);
  });
});
