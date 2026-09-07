import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  app,
  registerAndLogin,
  createAdminAndLogin,
  createFixtureTask,
  createFixtureCourse,
  unlockTrainingForCustomer,
} from './helpers';

async function enableUsdtAndCompleteTrainingTasks(
  user: Awaited<ReturnType<typeof registerAndLogin>>,
  admin: Awaited<ReturnType<typeof createAdminAndLogin>>,
) {
  await admin.agent
    .put('/api/admin/crypto-assets/USDT')
    .set('X-CSRF-Token', admin.csrfToken)
    .send({ address: 'TAddressExample', isEnabled: true });

  await unlockTrainingForCustomer(user);

  // Create two required training tasks (matches test setup)
  const task1 = await createFixtureTask({ order: 1, productName: 'Fixture Product 1' });
  const task2 = await createFixtureTask({ order: 2, productName: 'Fixture Product 2' });

  // Submit first task — auto-approved immediately, no admin review step.
  const submit1 = await user.agent
    .post(`/api/training/tasks/${task1.id}/submit`)
    .set('X-CSRF-Token', user.csrfToken)
    .send({ answer: task1.productName });

  expect(submit1.status).toBe(201);
  expect(submit1.body.data.status).toBe('APPROVED');

  // Submit second task (which completes training).
  const submit2 = await user.agent
    .post(`/api/training/tasks/${task2.id}/submit`)
    .set('X-CSRF-Token', user.csrfToken)
    .send({ answer: task2.productName });

  expect(submit2.status).toBe(201);
  expect(submit2.body.data.status).toBe('APPROVED');

  const me = await user.agent.get('/api/auth/me');
  expect(me.body.data.user.trainingCompletedAt).not.toBeNull();
}

describe('training assessment (customer)', () => {
  it('returns questions without exposing which answer is correct', async () => {
    const course = await createFixtureCourse();
    const { agent } = await registerAndLogin();

    const res = await agent.get(`/api/training/courses/${course.id}/assessment`);
    expect(res.status).toBe(200);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('isCorrect');
  });

  it('scores strictly server-side — a wrong answer cannot be disguised as correct by the client', async () => {
    const course = await createFixtureCourse();
    const { agent, csrfToken } = await registerAndLogin();
    const [q1, q2] = course.assessment!.questions;
    const wrong1 = q1.answers.find((a) => !a.isCorrect)!;
    const correct2 = q2.answers.find((a) => a.isCorrect)!;

    const res = await agent
      .post(`/api/training/courses/${course.id}/assessment/submit`)
      .set('X-CSRF-Token', csrfToken)
      .send({
        answers: [
          { questionId: q1.id, answerId: wrong1.id },
          { questionId: q2.id, answerId: correct2.id },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.score).toBe(50);
    expect(res.body.data.passed).toBe(false);
  });

  it('does not set trainingCompletedAt on a failed assessment', async () => {
    const course = await createFixtureCourse();
    const { agent, csrfToken } = await registerAndLogin();
    const [q1, q2] = course.assessment!.questions;
    const wrong1 = q1.answers.find((a) => !a.isCorrect)!;
    const wrong2 = q2.answers.find((a) => !a.isCorrect)!;

    const res = await agent
      .post(`/api/training/courses/${course.id}/assessment/submit`)
      .set('X-CSRF-Token', csrfToken)
      .send({
        answers: [
          { questionId: q1.id, answerId: wrong1.id },
          { questionId: q2.id, answerId: wrong2.id },
        ],
      });

    expect(res.body.data.passed).toBe(false);
    expect(res.body.data.user.trainingCompletedAt).toBeNull();

    const me = await agent.get('/api/auth/me');
    expect(me.body.data.user.trainingCompletedAt).toBeNull();
  });

  it('deposit becomes available after completing the required training tasks', async () => {
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();

    await enableUsdtAndCompleteTrainingTasks(user, admin);

    const res = await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'USDT', amount: 25 });
    expect(res.status).toBe(201);
    expect(res.body.data.deposit.status).toBe('PENDING');
  });

  it('cannot be bypassed by direct API request — the blind-complete endpoint no longer exists', async () => {
    const { agent, csrfToken } = await registerAndLogin();
    const res = await agent.post('/api/training/complete').set('X-CSRF-Token', csrfToken);
    expect(res.status).toBe(404);
  });

  it('rejects a submission with an answerId that does not belong to the question', async () => {
    const course = await createFixtureCourse();
    const { agent, csrfToken } = await registerAndLogin();
    const [q1, q2] = course.assessment!.questions;

    const res = await agent
      .post(`/api/training/courses/${course.id}/assessment/submit`)
      .set('X-CSRF-Token', csrfToken)
      .send({
        answers: [
          { questionId: q1.id, answerId: q2.answers[0].id }, // answer belongs to the other question
          { questionId: q2.id, answerId: q2.answers[0].id },
        ],
      });
    expect(res.status).toBe(400);
  });

  it('deposit stays blocked before training is completed', async () => {
    const admin = await createAdminAndLogin();
    await admin.agent
      .put('/api/admin/crypto-assets/USDT')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ address: 'TAddressExample', isEnabled: true });

    const { agent, csrfToken } = await registerAndLogin();
    const res = await agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', csrfToken)
      .send({ assetCode: 'USDT', amount: 25 });
    expect(res.status).toBe(403);
  });

  it('requires authentication', async () => {
    const course = await createFixtureCourse();
    const res = await request(app).get(`/api/training/courses/${course.id}/assessment`);
    expect(res.status).toBe(401);
  });
});