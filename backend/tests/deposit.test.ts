import { describe, it, expect } from 'vitest';
import { registerAndLogin, createAdminAndLogin, createFixtureCourse } from './helpers';

type Session = Awaited<ReturnType<typeof registerAndLogin>>;
type AdminSession = Awaited<ReturnType<typeof createAdminAndLogin>>;

async function enableUsdt(admin: AdminSession, address = 'TAddressExample123') {
  const res = await admin.agent
    .put('/api/admin/crypto-assets/USDT')
    .set('X-CSRF-Token', admin.csrfToken)
    .send({ address, isEnabled: true });
  expect(res.status).toBe(200);
  return res.body.data.asset;
}

// Training completion is now only ever a side effect of the backend scoring
// a passed course assessment (see trainingAssessment.service.ts) — there is
// no blind "mark me complete" endpoint. This helper exercises that real
// flow via a disposable fixture course rather than any shortcut.
async function completeTraining(user: Session) {
  const course = await createFixtureCourse();
  const [q1, q2] = course.assessment!.questions;
  const correct1 = q1.answers.find((a) => a.isCorrect)!;
  const correct2 = q2.answers.find((a) => a.isCorrect)!;
  const res = await user.agent
    .post(`/api/training/courses/${course.id}/assessment/submit`)
    .set('X-CSRF-Token', user.csrfToken)
    .send({
      answers: [
        { questionId: q1.id, answerId: correct1.id },
        { questionId: q2.id, answerId: correct2.id },
      ],
    });
  expect(res.body.data.passed).toBe(true);
}

describe('deposits (training-gated, per-asset, admin-reviewed)', () => {
  it('blocks deposit creation before training is completed, even for a valid enabled asset', async () => {
    const admin = await createAdminAndLogin();
    await enableUsdt(admin);
    const user = await registerAndLogin();

    const res = await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'USDT', amount: 50 });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Complete the required training before making a deposit.');
  });

  it('does not create a pending deposit or affect balance when training is incomplete', async () => {
    const admin = await createAdminAndLogin();
    await enableUsdt(admin);
    const user = await registerAndLogin();

    await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'USDT', amount: 50 });

    const me = await user.agent.get('/api/auth/me');
    expect(me.body.data.user.balance).toBe(0);

    const pending = await admin.agent.get('/api/admin/deposits?status=PENDING');
    expect(pending.body.data.deposits).toHaveLength(0);
  });

  it('rejects a disabled or unconfigured asset even after training completion', async () => {
    const user = await registerAndLogin();
    await completeTraining(user);

    const res = await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'ETH', amount: 20 });

    expect(res.status).toBe(400);
  });

  it('creates a PENDING deposit without crediting balance once training is complete and the asset is enabled', async () => {
    const admin = await createAdminAndLogin();
    const asset = await enableUsdt(admin);
    const user = await registerAndLogin();
    await completeTraining(user);

    const res = await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'USDT', amount: 75 });

    expect(res.status).toBe(201);
    expect(res.body.data.deposit.status).toBe('PENDING');
    expect(res.body.data.deposit.addressShown).toBe(asset.address);
    expect(res.body.meta.simulation).toBe(true);

    const me = await user.agent.get('/api/auth/me');
    expect(me.body.data.user.balance).toBe(0);
  });

  it('credits balance only after an admin approves the deposit', async () => {
    const admin = await createAdminAndLogin();
    await enableUsdt(admin);
    const user = await registerAndLogin();
    await completeTraining(user);

    const createRes = await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'USDT', amount: 100 });
    const depositId = createRes.body.data.deposit.id;

    const approveRes = await admin.agent
      .post(`/api/admin/deposits/${depositId}/approve`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.deposit.status).toBe('APPROVED');

    const me = await user.agent.get('/api/auth/me');
    expect(me.body.data.user.balance).toBe(100);

    const txns = await user.agent.get('/api/wallet/transactions');
    const depositTxn = txns.body.data.transactions.find((t: { description: string }) =>
      t.description.includes('USDT')
    );
    expect(depositTxn.status).toBe('COMPLETED');
  });

  it('does not credit balance when an admin rejects the deposit', async () => {
    const admin = await createAdminAndLogin();
    await enableUsdt(admin);
    const user = await registerAndLogin();
    await completeTraining(user);

    const createRes = await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'USDT', amount: 60 });
    const depositId = createRes.body.data.deposit.id;

    const rejectRes = await admin.agent
      .post(`/api/admin/deposits/${depositId}/reject`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.deposit.status).toBe('REJECTED');

    const me = await user.agent.get('/api/auth/me');
    expect(me.body.data.user.balance).toBe(0);

    const txns = await user.agent.get('/api/wallet/transactions');
    const depositTxn = txns.body.data.transactions.find((t: { description: string }) =>
      t.description.includes('USDT')
    );
    expect(depositTxn.status).toBe('FAILED');
  });

  it('rejects reviewing the same deposit twice', async () => {
    const admin = await createAdminAndLogin();
    await enableUsdt(admin);
    const user = await registerAndLogin();
    await completeTraining(user);

    const createRes = await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'USDT', amount: 10 });
    const depositId = createRes.body.data.deposit.id;

    await admin.agent.post(`/api/admin/deposits/${depositId}/approve`).set('X-CSRF-Token', admin.csrfToken);
    const secondApprove = await admin.agent
      .post(`/api/admin/deposits/${depositId}/approve`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(secondApprove.status).toBe(409);
  });

  it('rejects a non-admin from managing crypto assets or reviewing deposits', async () => {
    const user = await registerAndLogin();

    const putAsset = await user.agent
      .put('/api/admin/crypto-assets/USDT')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ address: 'x', isEnabled: true });
    expect(putAsset.status).toBe(403);

    const listDeposits = await user.agent.get('/api/admin/deposits');
    expect(listDeposits.status).toBe(403);
  });

  it('rejects enabling a crypto asset without ever having configured an address', async () => {
    const admin = await createAdminAndLogin();
    const res = await admin.agent
      .put('/api/admin/crypto-assets/BTC')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ isEnabled: true });
    expect(res.status).toBe(400);
  });

  it('rejects a non-positive deposit amount', async () => {
    const admin = await createAdminAndLogin();
    await enableUsdt(admin);
    const user = await registerAndLogin();
    await completeTraining(user);

    const res = await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'USDT', amount: 0 });
    expect(res.status).toBe(400);
  });

  it('rejects a deposit request without the CSRF header', async () => {
    const admin = await createAdminAndLogin();
    await enableUsdt(admin);
    const user = await registerAndLogin();
    await completeTraining(user);

    const res = await user.agent.post('/api/wallet/deposit').send({ assetCode: 'USDT', amount: 10 });
    expect(res.status).toBe(403);
  });

  it('only exposes enabled, configured assets via the customer-facing list', async () => {
    const admin = await createAdminAndLogin();
    await enableUsdt(admin);

    const user = await registerAndLogin();
    const res = await user.agent.get('/api/wallet/crypto-assets');
    expect(res.status).toBe(200);
    const codes = res.body.data.assets.map((a: { code: string }) => a.code);
    expect(codes).toContain('USDT');
    expect(codes).not.toContain('BTC');
    expect(codes).not.toContain('ETH');
  });
});
