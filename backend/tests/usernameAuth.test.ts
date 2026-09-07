import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/utils/password';
import { app, registerAndLogin } from './helpers';

function uniqueSuffix() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

describe('username authentication — registration', () => {
  it('succeeds with username + email + password and returns the username on the created user', async () => {
    const username = `alice${uniqueSuffix()}`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'Alice Example', username, email: `${username}@example.test`, password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.username).toBe(username);
    expect(res.body.data.user.email).toBe(`${username}@example.test`);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('rejects registration with a missing username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ fullName: 'No Username', email: `nouser${uniqueSuffix()}@example.test`, password: 'password123' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects registration with an empty/whitespace username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Blank Username',
        username: '   ',
        email: `blank${uniqueSuffix()}@example.test`,
        password: 'password123',
      });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid username format (disallowed characters)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Bad Format',
      username: 'not a valid username!',
      email: `badformat${uniqueSuffix()}@example.test`,
      password: 'password123',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate username (exact match)', async () => {
    const username = `dupuser${uniqueSuffix()}`;
    await registerAndLogin({ username });

    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Second Person',
      username,
      email: `second${uniqueSuffix()}@example.test`,
      password: 'password123',
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects a duplicate username that differs only by case', async () => {
    const base = `casetest${uniqueSuffix()}`;
    await registerAndLogin({ username: base.toLowerCase() });

    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Case Variant',
      username: base.toUpperCase(),
      email: `casevariant${uniqueSuffix()}@example.test`,
      password: 'password123',
    });
    expect(res.status).toBe(409);

    const rows = await prisma.user.findMany({ where: { username: base.toLowerCase() } });
    expect(rows).toHaveLength(1); // no second account was created
  });

  it('normalizes the username consistently (trims whitespace, lowercases) so it can be found either way', async () => {
    const raw = `  MixedCase${uniqueSuffix()}  `;
    const normalized = raw.trim().toLowerCase();
    const password = 'password123';

    const registerRes = await request(app).post('/api/auth/register').send({
      fullName: 'Mixed Case',
      username: raw,
      email: `mixedcase${uniqueSuffix()}@example.test`,
      password,
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.user.username).toBe(normalized);

    // Logging in with a differently-cased/padded version of the same
    // username must still succeed — normalization is applied on login too.
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: `  ${normalized.toUpperCase()}  `, password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.username).toBe(normalized);
  });
});

describe('username authentication — login', () => {
  it('succeeds with the correct username + password', async () => {
    const { username, password } = await registerAndLogin();
    const res = await request(app).post('/api/auth/login').send({ username, password });
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe(username);
  });

  it('fails with an incorrect password', async () => {
    const { username } = await registerAndLogin({ password: 'correctPass1' });
    const res = await request(app).post('/api/auth/login').send({ username, password: 'wrongPassword' });
    expect(res.status).toBe(401);
  });

  it('fails for an unknown username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: `doesnotexist${uniqueSuffix()}`, password: 'whatever123' });
    expect(res.status).toBe(401);
  });

  it('no longer authenticates using email as the login identifier', async () => {
    const { email, password } = await registerAndLogin({ password: 'password123' });
    // Supplying the real, valid email in the "username" slot must not work
    // — email was never registered as a username.
    const res = await request(app).post('/api/auth/login').send({ username: email, password });
    expect(res.status).toBe(401);
  });

  it('rejects a login request that only supplies email/password with no username field at all', async () => {
    const { email, password } = await registerAndLogin();
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(400); // schema requires `username`, not `email`
  });

  it('keeps the authenticated session working after a username login (GET /me)', async () => {
    const { username, password } = await registerAndLogin();
    const agent = request.agent(app);
    const loginRes = await agent.post('/api/auth/login').send({ username, password });
    expect(loginRes.status).toBe(200);

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.username).toBe(username);
  });
});

describe('username authentication — existing admin authorization still works', () => {
  it('an admin account logs in with username + password and retains ADMIN-only access', async () => {
    const username = `admintest${uniqueSuffix()}`;
    const password = 'adminPass123';
    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        fullName: 'Admin Test',
        username,
        email: `${username}@example.test`,
        passwordHash,
        role: 'ADMIN',
        referralCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      },
    });

    const agent = request.agent(app);
    const loginRes = await agent.post('/api/auth/login').send({ username, password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe('ADMIN');

    const usersRes = await agent.get('/api/admin/users');
    expect(usersRes.status).toBe(200);

    // A non-admin still cannot reach the same admin-only route.
    const nonAdmin = await registerAndLogin();
    const forbidden = await nonAdmin.agent.get('/api/admin/users');
    expect(forbidden.status).toBe(403);
  });
});

describe('username authentication — accounts with an email-derived username (simulating migrated data)', () => {
  it('logs in normally with a username shaped exactly like the backfill migration would produce', async () => {
    // Mirrors the deterministic derivation used by
    // 20260908020000_add_username's backfill (and prisma/seed.ts's
    // deriveUniqueUsername): the email local-part, lowercased.
    const email = `legacy.user${uniqueSuffix()}@example.test`;
    const derivedUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    const password = 'password123';
    const passwordHash = await hashPassword(password);

    await prisma.user.create({
      data: {
        fullName: 'Legacy User',
        username: derivedUsername,
        email,
        passwordHash,
        role: 'USER',
        referralCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      },
    });

    const res = await request(app).post('/api/auth/login').send({ username: derivedUsername, password });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(email);
  });
});

describe('username authentication — anti-spoofing', () => {
  it('cannot bypass authentication by supplying a client userId — the session always matches the credentials, not the userId', async () => {
    const victim = await registerAndLogin({ password: 'victimPass1' });
    const attacker = await registerAndLogin({ password: 'attackerPass1' });

    // Attacker supplies THEIR OWN correct credentials but claims the
    // victim's userId in the body — the server must never honor it.
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: attacker.username, password: 'attackerPass1', userId: victim.body.data.user.id });

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(attacker.body.data.user.id);
    expect(res.body.data.user.id).not.toBe(victim.body.data.user.id);
  });

  it("cannot log in as another user by supplying their email instead of a real username, even with a matching-looking body", async () => {
    const victim = await registerAndLogin({ password: 'victimPass1' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: victim.email, email: victim.email, password: 'victimPass1' });
    expect(res.status).toBe(401);
  });
});
