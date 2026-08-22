import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerAndLogin, createAdminAndLogin } from './helpers';

describe('authorization', () => {
  it('rejects unauthenticated access to admin routes', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('rejects a logged-in non-admin from admin routes', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.get('/api/admin/users');
    expect(res.status).toBe(403);
  });

  it('allows an admin to access admin routes', async () => {
    const { agent } = await createAdminAndLogin();
    const res = await agent.get('/api/admin/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.users)).toBe(true);
  });
});
