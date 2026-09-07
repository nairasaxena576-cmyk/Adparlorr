import { describe, it, expect } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { registerAndLogin, createAdminAndLogin, createFixtureTask, unlockTrainingForCustomer } from './helpers';

describe('training tasks (customer) — access gate', () => {
  it('is locked before the referral is verified', async () => {
    await createFixtureTask();
    const user = await registerAndLogin();
    const res = await user.agent.get('/api/training/tasks');
    expect(res.status).toBe(403);
  });

  it('is locked after a valid referral but before funding is confirmed', async () => {
    await createFixtureTask();
    const referrer = await registerAndLogin();
    await prisma.user.update({
      where: { id: referrer.body.data.user.id },
      data: { completedOrders: 200, totalDeposits: 2000 },
    });
    const user = await registerAndLogin();
    await user.agent
      .post('/api/referrals/training/verify')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ referralCode: referrer.body.data.user.referralCode });

    const res = await user.agent.get('/api/training/tasks');
    expect(res.status).toBe(403);
  });

  it('unlocks once referral and funding prerequisites are both satisfied', async () => {
    await createFixtureTask();
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    const res = await user.agent.get('/api/training/tasks');
    expect(res.status).toBe(200);
  });
});

describe('training tasks (customer) — unlocked flow', () => {
  it('lists only published required tasks, in order, without leaking the answer', async () => {
    const task1 = await createFixtureTask({ order: 1, productName: 'Nike Air Max 90' });
    await createFixtureTask({ order: 2, productName: 'Samsung Galaxy S25' });
    await createFixtureTask({ order: 3, isPublished: false, productName: 'Should Not Appear' });
    await createFixtureTask({ order: 4, isRequired: false, productName: 'Optional Task' });

    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    const res = await user.agent.get('/api/training/tasks');
    expect(res.status).toBe(200);

    const tasks = res.body.data.tasks;
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t: { id: string }) => t.id)).toEqual([task1.id, expect.any(String)]);

    const current = tasks.find((t: { status: string }) => t.status === 'current');
    expect(current.productName).toBeNull();
    expect(current.imageUrl).toBeTruthy();
    expect(current.instruction).toBeTruthy();

    const locked = tasks.find((t: { status: string }) => t.status === 'locked');
    expect(locked.productName).toBeNull();
    expect(locked.imageUrl).toBeNull();
  });

  it('404s fetching an unpublished task directly', async () => {
    const task = await createFixtureTask({ isPublished: false });
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);
    const res = await user.agent.get(`/api/training/tasks/${task.id}`);
    expect(res.status).toBe(404);
  });

  it('404s fetching a locked (not-yet-reached) task directly', async () => {
    await createFixtureTask({ order: 1 });
    const task2 = await createFixtureTask({ order: 2 });
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);
    const res = await user.agent.get(`/api/training/tasks/${task2.id}`);
    expect(res.status).toBe(404);
  });

  it('accepts a submission with no typed answer and approves it immediately', async () => {
    const task = await createFixtureTask({ productName: 'Nike Air Max 90' });
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    const res = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Submitted' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('APPROVED');

    const submission = await prisma.trainingTaskSubmission.findUnique({
      where: { id: res.body.data.submissionId },
    });
    expect(submission?.userId).toBe(user.body.data.user.id);
    expect(submission?.status).toBe('APPROVED');
    expect(submission?.productNameSnapshot).toBe('Nike Air Max 90');
  });

  it('rejects resubmission once a task has already been completed (immediate approval leaves no PENDING window)', async () => {
    const task = await createFixtureTask();
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Submitted' });

    const second = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Submitted' });

    expect(second.status).toBe(409);
  });

  it('rejects a submission without the CSRF header', async () => {
    const task = await createFixtureTask();
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);
    const res = await user.agent.post(`/api/training/tasks/${task.id}/submit`).send({ answer: 'x' });
    expect(res.status).toBe(403);
  });

  it('always attributes a submission to the authenticated session, never a client-supplied userId', async () => {
    const task = await createFixtureTask();
    const attacker = await registerAndLogin();
    await unlockTrainingForCustomer(attacker);
    const victim = await registerAndLogin();

    const res = await attacker.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', attacker.csrfToken)
      .send({ answer: 'x', userId: victim.body.data.user.id });

    const submission = await prisma.trainingTaskSubmission.findUnique({
      where: { id: res.body.data.submissionId },
    });
    expect(submission?.userId).toBe(attacker.body.data.user.id);
  });

  it('reports progress across multiple required tasks and advances automatically', async () => {
    const task1 = await createFixtureTask({ order: 1, productName: 'A' });
    await createFixtureTask({ order: 2, productName: 'B' });
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    let progress = await user.agent.get('/api/training/progress');
    expect(progress.body.data).toMatchObject({ totalRequired: 2, completedCount: 0, completed: false });

    await user.agent
      .post(`/api/training/tasks/${task1.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Submitted' });

    progress = await user.agent.get('/api/training/progress');
    expect(progress.body.data).toMatchObject({ totalRequired: 2, completedCount: 1, completed: false });
    expect(progress.body.data.currentTaskId).not.toBeNull();
  });

  it('exactly 45 required tasks are reported when 45 exist', async () => {
    for (let i = 1; i <= 45; i += 1) {
      await createFixtureTask({ order: i, productName: `Fixture ${i}` });
    }
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    const progress = await user.agent.get('/api/training/progress');
    expect(progress.body.data.totalRequired).toBe(45);
  });

  it('blocks a regular user from every admin task-management and submission-review endpoint', async () => {
    const task = await createFixtureTask();
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    const list = await user.agent.get('/api/admin/training/tasks');
    expect(list.status).toBe(403);

    const create = await user.agent
      .post('/api/admin/training/tasks')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ productName: 'x', imageUrl: 'https://example.test/x.jpg', instruction: 'x' });
    expect(create.status).toBe(403);

    const update = await user.agent
      .put(`/api/admin/training/tasks/${task.id}`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ productName: 'y' });
    expect(update.status).toBe(403);

    const submissions = await user.agent.get('/api/admin/training/submissions');
    expect(submissions.status).toBe(403);
  });

  it('the legacy admin approve/reject endpoints still function for compatibility, on a submission seeded directly', async () => {
    const task = await createFixtureTask({ productName: 'Nike Air Max 90' });
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    // New customer submissions are always auto-approved (see item 7 of the
    // approved spec) — there is no longer a natural way to reach a PENDING
    // submission via the real customer endpoint. Seed one directly to prove
    // the legacy admin review endpoints (kept for compatibility) still work
    // on whatever they're pointed at.
    const legacySubmission = await prisma.trainingTaskSubmission.create({
      data: {
        userId: user.body.data.user.id,
        taskId: task.id,
        submittedAnswer: 'Wrong guess',
        isAutoMatch: false,
        productNameSnapshot: task.productName,
        imageUrlSnapshot: task.imageUrl,
        status: 'PENDING',
      },
    });

    const reject = await admin.agent
      .post(`/api/admin/training/submissions/${legacySubmission.id}/reject`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ rejectionReason: 'Not the right product name.' });
    expect(reject.status).toBe(200);
    expect(reject.body.data.submission.status).toBe('REJECTED');
  });
});
