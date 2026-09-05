import { describe, it, expect } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { registerAndLogin, createAdminAndLogin, createFixtureTask } from './helpers';

describe('training tasks (customer)', () => {
  it('lists only published required tasks, in order, without leaking the answer', async () => {
    const task1 = await createFixtureTask({ order: 1, productName: 'Nike Air Max 90' });
    await createFixtureTask({ order: 2, productName: 'Samsung Galaxy S25' });
    await createFixtureTask({ order: 3, isPublished: false, productName: 'Should Not Appear' });
    await createFixtureTask({ order: 4, isRequired: false, productName: 'Optional Task' });

    const user = await registerAndLogin();
    const res = await user.agent.get('/api/training/tasks');
    expect(res.status).toBe(200);

    const tasks = res.body.data.tasks;
    expect(tasks).toHaveLength(2);
    expect(tasks.map((t: { id: string }) => t.id)).toEqual([task1.id, expect.any(String)]);

    // The current (first, unapproved) task must never reveal productName —
    // that value doubles as the answer key.
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
    const res = await user.agent.get(`/api/training/tasks/${task.id}`);
    expect(res.status).toBe(404);
  });

  it('404s fetching a locked (not-yet-reached) task directly', async () => {
    await createFixtureTask({ order: 1 });
    const task2 = await createFixtureTask({ order: 2 });
    const user = await registerAndLogin();
    const res = await user.agent.get(`/api/training/tasks/${task2.id}`);
    expect(res.status).toBe(404);
  });

  it('accepts a submission and leaves training incomplete until admin review, regardless of correctness', async () => {
    const task = await createFixtureTask({ productName: 'Nike Air Max 90' });
    const user = await registerAndLogin();

    const res = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Nike Air Max 90' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');

    const me = await user.agent.get('/api/auth/me');
    expect(me.body.data.user.trainingCompletedAt).toBeNull();

    const submission = await prisma.trainingTaskSubmission.findUnique({
      where: { id: res.body.data.submissionId },
    });
    expect(submission?.userId).toBe(user.body.data.user.id);
    expect(submission?.isAutoMatch).toBe(true);
    expect(submission?.productNameSnapshot).toBe('Nike Air Max 90');
  });

  it('computes isAutoMatch false for a wrong answer but still accepts the submission', async () => {
    const task = await createFixtureTask({ productName: 'Nike Air Max 90' });
    const user = await registerAndLogin();

    const res = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Totally Wrong Guess' });

    expect(res.status).toBe(201);
    const submission = await prisma.trainingTaskSubmission.findUnique({
      where: { id: res.body.data.submissionId },
    });
    expect(submission?.isAutoMatch).toBe(false);
  });

  it('normalizes whitespace and case when comparing the answer', async () => {
    const task = await createFixtureTask({ productName: 'Nike Air Max 90' });
    const user = await registerAndLogin();

    const res = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: '  nike   air MAX 90  ' });

    const submission = await prisma.trainingTaskSubmission.findUnique({
      where: { id: res.body.data.submissionId },
    });
    expect(submission?.isAutoMatch).toBe(true);
  });

  it('rejects resubmission while a submission is still pending review', async () => {
    const task = await createFixtureTask();
    const user = await registerAndLogin();

    await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'First guess' });

    const second = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Second guess' });

    expect(second.status).toBe(409);
  });

  it('allows resubmission after a rejection, and blocks it again after approval', async () => {
    const task = await createFixtureTask({ productName: 'Nike Air Max 90' });
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();

    const first = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Wrong guess' });
    const firstId = first.body.data.submissionId;

    await admin.agent
      .post(`/api/admin/training/submissions/${firstId}/reject`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ rejectionReason: 'Not the right product name.' });

    const retry = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Nike Air Max 90' });
    expect(retry.status).toBe(201);
    const retryId = retry.body.data.submissionId;

    await admin.agent
      .post(`/api/admin/training/submissions/${retryId}/approve`)
      .set('X-CSRF-Token', admin.csrfToken);

    const afterApproval = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Nike Air Max 90' });
    expect(afterApproval.status).toBe(409);
  });

  it('rejects a submission without the CSRF header', async () => {
    const task = await createFixtureTask();
    const user = await registerAndLogin();
    const res = await user.agent.post(`/api/training/tasks/${task.id}/submit`).send({ answer: 'x' });
    expect(res.status).toBe(403);
  });

  it('always attributes a submission to the authenticated session, never a client-supplied userId', async () => {
    const task = await createFixtureTask();
    const attacker = await registerAndLogin();
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

  it('reports progress across multiple required tasks', async () => {
    const task1 = await createFixtureTask({ order: 1, productName: 'A' });
    await createFixtureTask({ order: 2, productName: 'B' });
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();

    let progress = await user.agent.get('/api/training/progress');
    expect(progress.body.data).toMatchObject({ totalRequired: 2, completedCount: 0, completed: false });

    const submit = await user.agent
      .post(`/api/training/tasks/${task1.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'A' });
    await admin.agent
      .post(`/api/admin/training/submissions/${submit.body.data.submissionId}/approve`)
      .set('X-CSRF-Token', admin.csrfToken);

    progress = await user.agent.get('/api/training/progress');
    expect(progress.body.data).toMatchObject({ totalRequired: 2, completedCount: 1, completed: false });
    expect(progress.body.data.currentTaskId).not.toBeNull();
  });

  it('blocks a regular user from every admin task-management and submission-review endpoint', async () => {
    const task = await createFixtureTask();
    const user = await registerAndLogin();

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
});
