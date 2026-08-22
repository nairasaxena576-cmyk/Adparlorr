import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerAndLogin } from './helpers';

describe('products', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  it('returns the seeded 45-item catalog', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(45);
  });
});
