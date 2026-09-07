import { describe, it, expect } from 'vitest';
import { registerAndLogin, createAdminAndLogin } from './helpers';
import { prisma } from '../src/lib/prisma';

describe('admin tier grant (pay-to-unlock)', () => {
  it.each(['Silver', 'Gold', 'Platinum'] as const)('admin can grant %s tier', async (tier) => {
    const user = await registerAndLogin();
    const admin = await createAdminAndLogin();

    const res = await admin.agent
      .post(`/api/admin/users/${user.body.data.user.id}/grant-tier`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ tier });

    expect(res.status).toBe(200);
    expect(res.body.data.user.manualTier).toBe(tier);
  });

  it('sets manualTier and manualTierGrantedAt on the user record', async () => {
    const user = await registerAndLogin();
    const admin = await createAdminAndLogin();

    const before = new Date();
    const res = await admin.agent
      .post(`/api/admin/users/${user.body.data.user.id}/grant-tier`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ tier: 'Gold' });
    expect(res.status).toBe(200);

    const updated = await prisma.user.findUnique({ where: { id: user.body.data.user.id } });
    expect(updated?.manualTier).toBe('Gold');
    expect(updated?.manualTierGrantedAt).not.toBeNull();
    expect(updated!.manualTierGrantedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("does not change the user's balance", async () => {
    const user = await registerAndLogin();
    const admin = await createAdminAndLogin();

    const before = await prisma.user.findUnique({ where: { id: user.body.data.user.id } });
    expect(Number(before!.balance)).toBe(0);

    const res = await admin.agent
      .post(`/api/admin/users/${user.body.data.user.id}/grant-tier`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ tier: 'Platinum' });
    expect(res.status).toBe(200);
    expect(Number(res.body.data.user.balance)).toBe(0);

    const after = await prisma.user.findUnique({ where: { id: user.body.data.user.id } });
    expect(Number(after!.balance)).toBe(0);
  });

  it('creates a zero-amount ADMIN_CREDIT audit transaction', async () => {
    const user = await registerAndLogin();
    const admin = await createAdminAndLogin();

    const res = await admin.agent
      .post(`/api/admin/users/${user.body.data.user.id}/grant-tier`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ tier: 'Silver' });
    expect(res.status).toBe(200);

    const txs = await prisma.transaction.findMany({ where: { userId: user.body.data.user.id } });
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe('ADMIN_CREDIT');
    expect(Number(txs[0].amount)).toBe(0);
    expect(txs[0].status).toBe('COMPLETED');
    expect(txs[0].description).toContain('Silver');
  });

  it('rejects the grant-tier request from a non-admin user', async () => {
    const user = await registerAndLogin();
    const other = await registerAndLogin();

    const res = await other.agent
      .post(`/api/admin/users/${user.body.data.user.id}/grant-tier`)
      .set('X-CSRF-Token', other.csrfToken)
      .send({ tier: 'Gold' });

    expect(res.status).toBe(403);

    const unchanged = await prisma.user.findUnique({ where: { id: user.body.data.user.id } });
    expect(unchanged?.manualTier).toBeNull();
  });

  it('rejects an invalid/non-grantable tier value', async () => {
    const user = await registerAndLogin();
    const admin = await createAdminAndLogin();

    const bronzeRes = await admin.agent
      .post(`/api/admin/users/${user.body.data.user.id}/grant-tier`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ tier: 'Bronze' });
    expect(bronzeRes.status).toBe(400);

    const garbageRes = await admin.agent
      .post(`/api/admin/users/${user.body.data.user.id}/grant-tier`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ tier: 'NotATier' });
    expect(garbageRes.status).toBe(400);
  });

  it('rejects granting a tier the user is already at or above', async () => {
    const user = await registerAndLogin();
    const admin = await createAdminAndLogin();

    const first = await admin.agent
      .post(`/api/admin/users/${user.body.data.user.id}/grant-tier`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ tier: 'Gold' });
    expect(first.status).toBe(200);

    const downgradeAttempt = await admin.agent
      .post(`/api/admin/users/${user.body.data.user.id}/grant-tier`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ tier: 'Silver' });
    expect(downgradeAttempt.status).toBe(409);
  });

  it('resolves effective tier as the higher of computed tier and manual tier', async () => {
    const user = await registerAndLogin();
    const admin = await createAdminAndLogin();

    // Computed tier is Bronze (0 orders/deposits); admin grants Gold — Gold wins.
    const grantRes = await admin.agent
      .post(`/api/admin/users/${user.body.data.user.id}/grant-tier`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ tier: 'Gold' });
    expect(grantRes.status).toBe(200);

    // Push the user's real progression past Gold (Platinum thresholds) —
    // computed tier now outranks the earlier manual Gold grant, so the
    // higher-ranked computed tier (Platinum) must win.
    await prisma.user.update({
      where: { id: user.body.data.user.id },
      data: { completedOrders: 500, totalDeposits: 5000 },
    });

    const usersRes = await admin.agent.get('/api/admin/users');
    const updatedUser = usersRes.body.data.users.find((u: { id: string }) => u.id === user.body.data.user.id);
    expect(updatedUser.manualTier).toBe('Gold');
    // Effective tier itself isn't returned directly by /users — verify via
    // the exported utility using the same raw fields the endpoint returned.
    const { resolveEffectiveTier } = await import('../src/utils/tiers');
    expect(
      resolveEffectiveTier(updatedUser.completedOrders, updatedUser.totalDeposits, updatedUser.manualTier)
    ).toBe('Platinum');
  });
});
