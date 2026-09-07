import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerAndLogin } from './helpers';

describe('auth', () => {
  it('registers a new user without leaking the password hash', async () => {
    const { body } = await registerAndLogin();
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBeDefined();
    expect(body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email registration', async () => {
    const email = `dup${Date.now()}@example.test`;
    await registerAndLogin({ email });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Another', username: `dupuser${Date.now()}`, email, password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects login with the wrong password', async () => {
    const { username } = await registerAndLogin({ password: 'correctPass1' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username, password: 'wrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 from /me without a session', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user from /me with a valid session', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBeDefined();
  });

  it('logs out and invalidates the session immediately', async () => {
    const { agent, csrfToken } = await registerAndLogin();

    const logoutRes = await agent.post('/api/auth/logout').set('X-CSRF-Token', csrfToken);
    expect(logoutRes.status).toBe(200);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });
});
