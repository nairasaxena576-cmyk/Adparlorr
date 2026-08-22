import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerAndLogin, createAdminAndLogin } from './helpers';

describe('support settings (Telegram)', () => {
  it('defaults to disabled with no url when nothing has been configured', async () => {
    const { agent } = await registerAndLogin();
    const res = await agent.get('/api/support/telegram');
    expect(res.status).toBe(200);
    expect(res.body.data.telegramEnabled).toBe(false);
    expect(res.body.data.telegramUrl).toBeNull();
  });

  it('requires authentication to read the config', async () => {
    const res = await request(app).get('/api/support/telegram');
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin from reading or writing admin support settings', async () => {
    const { agent, csrfToken } = await registerAndLogin();
    const getRes = await agent.get('/api/admin/support-settings');
    expect(getRes.status).toBe(403);

    const putRes = await agent
      .put('/api/admin/support-settings')
      .set('X-CSRF-Token', csrfToken)
      .send({ telegramUsername: 'someone', telegramEnabled: true });
    expect(putRes.status).toBe(403);
  });

  it('lets an admin set a username (normalizing a leading @) and enable it', async () => {
    const admin = await createAdminAndLogin();

    const putRes = await admin.agent
      .put('/api/admin/support-settings')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ telegramUsername: '@MySupport', telegramEnabled: true });

    expect(putRes.status).toBe(200);
    expect(putRes.body.data.telegramUsername).toBe('MySupport');
    expect(putRes.body.data.telegramUrl).toBe('https://t.me/MySupport');
    expect(putRes.body.data.telegramEnabled).toBe(true);

    const user = await registerAndLogin();
    const readRes = await user.agent.get('/api/support/telegram');
    expect(readRes.body.data.telegramUrl).toBe('https://t.me/MySupport');
  });

  it('rejects enabling Telegram support without a username', async () => {
    const admin = await createAdminAndLogin();
    const res = await admin.agent
      .put('/api/admin/support-settings')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ telegramEnabled: true });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid Telegram username', async () => {
    const admin = await createAdminAndLogin();
    const res = await admin.agent
      .put('/api/admin/support-settings')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ telegramUsername: 'a', telegramEnabled: true });
    expect(res.status).toBe(400);
  });

  it('hides the Telegram button (no url) once disabled, even with a saved username', async () => {
    const admin = await createAdminAndLogin();
    await admin.agent
      .put('/api/admin/support-settings')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ telegramUsername: 'stillthere', telegramEnabled: true });

    const disableRes = await admin.agent
      .put('/api/admin/support-settings')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ telegramUsername: 'stillthere', telegramEnabled: false });

    expect(disableRes.body.data.telegramEnabled).toBe(false);
    expect(disableRes.body.data.telegramUrl).toBeNull();

    const user = await registerAndLogin();
    const readRes = await user.agent.get('/api/support/telegram');
    expect(readRes.body.data.telegramEnabled).toBe(false);
    expect(readRes.body.data.telegramUrl).toBeNull();
  });
});
