import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma';

// Never touch the real Supabase Storage bucket from tests — stub the
// storage module entirely.
const FAKE_STORAGE_BASE = 'https://fake-project.supabase.test/storage/v1/object/public/training-task-images';
let fakeUploadCounter = 0;

vi.mock('../src/lib/supabaseStorage', () => ({
  uploadTrainingTaskImage: vi.fn(async (_buffer: Buffer, mimeType: string) => {
    fakeUploadCounter += 1;
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const path = `training-tasks/mock-${fakeUploadCounter}.${ext}`;
    return { path, url: `${FAKE_STORAGE_BASE}/${path}` };
  }),
  deleteTrainingTaskImage: vi.fn(async () => undefined),
}));

// tests/setup.ts (a global setupFile applied to every test file) imports
// ./helpers, whose eager `export const app = createApp()` transitively
// loads the REAL supabaseStorage.ts before this file's own vi.mock() call
// above can intercept it — setupFiles run before, and share the module
// registry with, the test file itself. vi.resetModules() + a dynamic
// import performed here (strictly after this file's own vi.mock() call has
// registered) forces a fresh resolution that correctly binds to the mocks.
// Same pattern as productAdmin.test.ts / supabaseStorage.test.ts.
let registerAndLogin: typeof import('./helpers').registerAndLogin;
let createAdminAndLogin: typeof import('./helpers').createAdminAndLogin;
let createFixtureTask: typeof import('./helpers').createFixtureTask;
let unlockTrainingForCustomer: typeof import('./helpers').unlockTrainingForCustomer;
let mockUpload: typeof import('../src/lib/supabaseStorage').uploadTrainingTaskImage;
let mockDelete: typeof import('../src/lib/supabaseStorage').deleteTrainingTaskImage;

beforeAll(async () => {
  vi.resetModules();
  const helpers = await import('./helpers');
  registerAndLogin = helpers.registerAndLogin;
  createAdminAndLogin = helpers.createAdminAndLogin;
  createFixtureTask = helpers.createFixtureTask;
  unlockTrainingForCustomer = helpers.unlockTrainingForCustomer;
  const storage = await import('../src/lib/supabaseStorage');
  mockUpload = storage.uploadTrainingTaskImage;
  mockDelete = storage.deleteTrainingTaskImage;
});

describe('training tasks (admin)', () => {
  beforeEach(() => {
    vi.mocked(mockUpload).mockClear();
    vi.mocked(mockDelete).mockClear();
  });

  it('creates a task', async () => {
    const admin = await createAdminAndLogin();
    const res = await admin.agent
      .post('/api/admin/training/tasks')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({
        productName: 'Nike Air Max 90',
        imageUrl: 'https://example.test/nike.jpg',
        instruction: 'Look at the product image and enter the product name.',
        isPublished: true,
        isRequired: true,
        order: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.task.productName).toBe('Nike Air Max 90');
    expect(res.body.data.task.isPublished).toBe(true);
  });

  it('rejects creating a task with a non-URL image (must be uploaded first)', async () => {
    const admin = await createAdminAndLogin();
    const res = await admin.agent
      .post('/api/admin/training/tasks')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ productName: 'x', imageUrl: 'not-a-url', instruction: 'x' });
    expect(res.status).toBe(400);
  });

  it('uploads a product image via Supabase Storage and returns a usable URL, with no key/path-traversal leakage', async () => {
    const admin = await createAdminAndLogin();
    const pngBytes = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd40000000049454e44ae426082',
      'hex'
    );

    const res = await admin.agent
      .post('/api/admin/training/tasks/upload-image')
      .set('X-CSRF-Token', admin.csrfToken)
      .attach('image', pngBytes, { filename: '../../../etc/passwd.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data.imageUrl).toMatch(
      /^https:\/\/fake-project\.supabase\.test\/storage\/v1\/object\/public\/training-task-images\/training-tasks\/[^/]+\.png$/
    );
    // The client-supplied filename must never appear in the generated path.
    expect(res.body.data.imageUrl).not.toContain('etc');
    expect(res.body.data.imageUrl).not.toContain('passwd');
    expect(res.body.data.imageUrl).not.toContain('..');
    // The response body must only ever contain the safe URL — never a key,
    // token, or anything resembling backend storage credentials.
    expect(JSON.stringify(res.body)).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE_KEY|sb-secret/i);
    expect(Object.keys(res.body.data)).toEqual(['imageUrl']);

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledWith(expect.any(Buffer), 'image/png');

    // The returned URL must be immediately usable as the task's imageUrl.
    const createRes = await admin.agent
      .post('/api/admin/training/tasks')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ productName: 'Uploaded Product', imageUrl: res.body.data.imageUrl, instruction: 'x' });
    expect(createRes.status).toBe(201);
  });

  it('rejects a non-image file upload without ever calling storage', async () => {
    const admin = await createAdminAndLogin();
    const res = await admin.agent
      .post('/api/admin/training/tasks/upload-image')
      .set('X-CSRF-Token', admin.csrfToken)
      .attach('image', Buffer.from('not an image'), { filename: 'file.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('rejects an oversized file without ever calling storage', async () => {
    const admin = await createAdminAndLogin();
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
    const res = await admin.agent
      .post('/api/admin/training/tasks/upload-image')
      .set('X-CSRF-Token', admin.csrfToken)
      .attach('image', oversized, { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('blocks a non-admin from the upload endpoint entirely', async () => {
    const user = await registerAndLogin();
    const res = await user.agent
      .post('/api/admin/training/tasks/upload-image')
      .set('X-CSRF-Token', user.csrfToken)
      .attach('image', Buffer.from([0x89, 0x50, 0x4e, 0x47]), { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('edits a task, including replacing its image, without touching past submissions', async () => {
    const task = await createFixtureTask({ productName: 'Old Name' });
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    const submitRes = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Old Name' });
    const submissionId = submitRes.body.data.submissionId;

    const editRes = await admin.agent
      .put(`/api/admin/training/tasks/${task.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ productName: 'New Name', imageUrl: 'https://example.test/new-image.jpg' });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.task.productName).toBe('New Name');

    const submission = await prisma.trainingTaskSubmission.findUnique({ where: { id: submissionId } });
    expect(submission?.productNameSnapshot).toBe('Old Name');
    expect(submission?.imageUrlSnapshot).toBe(task.imageUrl);

    // The old image is still referenced by that submission's snapshot —
    // must NOT be deleted from storage even though the task moved on.
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('cleans up the old storage object when replacing an image that no submission references', async () => {
    const task = await createFixtureTask({ imageUrl: 'https://example.test/orphan-before.jpg' });
    const admin = await createAdminAndLogin();

    const editRes = await admin.agent
      .put(`/api/admin/training/tasks/${task.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ imageUrl: 'https://example.test/orphan-after.jpg' });

    expect(editRes.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith('https://example.test/orphan-before.jpg');
  });

  it('does not touch storage when editing fields other than the image', async () => {
    const task = await createFixtureTask();
    const admin = await createAdminAndLogin();

    const editRes = await admin.agent
      .put(`/api/admin/training/tasks/${task.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ productName: 'Renamed Only' });

    expect(editRes.status).toBe(200);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('publishes and unpublishes a task', async () => {
    const task = await createFixtureTask({ isPublished: false });
    const admin = await createAdminAndLogin();

    const publish = await admin.agent
      .put(`/api/admin/training/tasks/${task.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ isPublished: true });
    expect(publish.body.data.task.isPublished).toBe(true);

    const unpublish = await admin.agent
      .put(`/api/admin/training/tasks/${task.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ isPublished: false });
    expect(unpublish.body.data.task.isPublished).toBe(false);
  });

  it('reorders tasks', async () => {
    const task1 = await createFixtureTask({ order: 1 });
    const task2 = await createFixtureTask({ order: 2 });
    const admin = await createAdminAndLogin();

    const res = await admin.agent
      .post(`/api/admin/training/tasks/${task2.id}/reorder`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ direction: 'up' });
    expect(res.status).toBe(200);

    const reloaded1 = await prisma.trainingTask.findUnique({ where: { id: task1.id } });
    const reloaded2 = await prisma.trainingTask.findUnique({ where: { id: task2.id } });
    expect(reloaded2!.order).toBeLessThan(reloaded1!.order);
  });

  it('deleting a task preserves its historical submissions: taskId is nulled, every snapshot field survives intact', async () => {
    const task = await createFixtureTask({ productName: 'Nike Air Max 90' });
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    const submitRes = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Nike Air Max 90' });
    const submissionId = submitRes.body.data.submissionId;

    const before = await prisma.trainingTaskSubmission.findUnique({ where: { id: submissionId } });
    expect(before).not.toBeNull();
    expect(before!.taskId).toBe(task.id);

    const del = await admin.agent
      .delete(`/api/admin/training/tasks/${task.id}`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(del.status).toBe(200);

    const taskAfter = await prisma.trainingTask.findUnique({ where: { id: task.id } });
    expect(taskAfter).toBeNull();

    // The submission itself must survive the task's deletion — this is
    // the whole point of onDelete: SetNull instead of Cascade.
    const after = await prisma.trainingTaskSubmission.findUnique({ where: { id: submissionId } });
    expect(after).not.toBeNull();
    expect(after!.taskId).toBeNull();

    // Every historical field must remain exactly as it was — none of this
    // is touched by the task disappearing.
    expect(after!.userId).toBe(before!.userId);
    expect(after!.submittedAnswer).toBe('Nike Air Max 90');
    expect(after!.productNameSnapshot).toBe('Nike Air Max 90');
    expect(after!.imageUrlSnapshot).toBe(task.imageUrl);
    expect(after!.status).toBe(before!.status);
    expect(after!.isAutoMatch).toBe(before!.isAutoMatch);
    expect(after!.reviewedById).toBe(before!.reviewedById);
    expect(after!.reviewedAt).toEqual(before!.reviewedAt);
    expect(after!.rejectionReason).toBe(before!.rejectionReason);
    expect(after!.createdAt).toEqual(before!.createdAt);

    // The surviving submission's imageUrlSnapshot still points at this
    // exact image — deleting it from storage would break that historical
    // record, so it must NOT be cleaned up.
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('an admin can still review a deleted task\'s historical, reviewed submission by id', async () => {
    const task = await createFixtureTask({ productName: 'Samsung Galaxy S25' });
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    const submitRes = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Samsung Galaxy S25' });
    const submissionId = submitRes.body.data.submissionId;

    // Customer training submissions are auto-approved immediately (item 7
    // of the approved spec) — no separate admin approve step exists or is
    // needed here.

    await admin.agent.delete(`/api/admin/training/tasks/${task.id}`).set('X-CSRF-Token', admin.csrfToken);

    const res = await admin.agent.get(`/api/admin/training/submissions/${submissionId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.submission).toMatchObject({
      status: 'APPROVED',
      productNameSnapshot: 'Samsung Galaxy S25',
      submittedAnswer: 'Samsung Galaxy S25',
    });
  });

  it('cleans up the storage object on task delete when no surviving submission references it', async () => {
    const task = await createFixtureTask({ imageUrl: 'https://example.test/never-submitted.jpg' });
    const admin = await createAdminAndLogin();

    // No submissions ever created for this task.
    const del = await admin.agent
      .delete(`/api/admin/training/tasks/${task.id}`)
      .set('X-CSRF-Token', admin.csrfToken);

    expect(del.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith('https://example.test/never-submitted.jpg');
  });

  it('lets an admin review a submission, seeing the product image, expected name, and customer answer', async () => {
    const task = await createFixtureTask({ productName: 'Nike Air Max 90' });
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    const submitRes = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Nike Air Max 90' });

    const res = await admin.agent.get(`/api/admin/training/submissions/${submitRes.body.data.submissionId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.submission).toMatchObject({
      submittedAnswer: 'Nike Air Max 90',
      productNameSnapshot: 'Nike Air Max 90',
      isAutoMatch: true,
      // Customer training submissions are auto-approved immediately (item 7
      // of the approved spec) — never left PENDING for admin review.
      status: 'APPROVED',
    });
    expect(res.body.data.submission.user.id).toBe(user.body.data.user.id);
  });

  it('auto-approves each submission and completes training once every required task is submitted', async () => {
    const task1 = await createFixtureTask({ order: 1, productName: 'A' });
    const task2 = await createFixtureTask({ order: 2, productName: 'B' });
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    const submit1 = await user.agent
      .post(`/api/training/tasks/${task1.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'A' });
    expect(submit1.status).toBe(201);
    expect(submit1.body.data.status).toBe('APPROVED');

    const meAfterFirst = await user.agent.get('/api/auth/me');
    expect(meAfterFirst.body.data.user.trainingCompletedAt).toBeNull();

    // task2's "current" endpoint only unlocks once task1 is complete.
    const detail2 = await user.agent.get(`/api/training/tasks/${task2.id}`);
    expect(detail2.status).toBe(200);

    const submit2 = await user.agent
      .post(`/api/training/tasks/${task2.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'B' });
    expect(submit2.status).toBe(201);

    const me = await user.agent.get('/api/auth/me');
    expect(me.body.data.user.trainingCompletedAt).not.toBeNull();
  });

  // Customer training submissions are now always auto-approved (item 7) —
  // there is no longer a natural way to reach a PENDING submission via the
  // real customer endpoint. The next two tests seed one directly to prove
  // the legacy admin reject/approve endpoints (kept for compatibility, per
  // item 7/17 of the approved spec) still function correctly on whatever
  // submission they're pointed at.
  async function seedPendingSubmission(task: { id: string; productName: string; imageUrl: string }, userId: string) {
    return prisma.trainingTaskSubmission.create({
      data: {
        userId,
        taskId: task.id,
        submittedAnswer: 'wrong',
        isAutoMatch: false,
        productNameSnapshot: task.productName,
        imageUrlSnapshot: task.imageUrl,
        status: 'PENDING',
      },
    });
  }

  it('rejects a submission and requires a reason', async () => {
    const task = await createFixtureTask();
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();
    const submission = await seedPendingSubmission(task, user.body.data.user.id);

    const withoutReason = await admin.agent
      .post(`/api/admin/training/submissions/${submission.id}/reject`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({});
    expect(withoutReason.status).toBe(400);

    const withReason = await admin.agent
      .post(`/api/admin/training/submissions/${submission.id}/reject`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ rejectionReason: 'Not the correct product name.' });
    expect(withReason.status).toBe(200);
    expect(withReason.body.data.submission.status).toBe('REJECTED');
    expect(withReason.body.data.submission.rejectionReason).toBe('Not the correct product name.');
  });

  it('rejects reviewing the same submission twice', async () => {
    const task = await createFixtureTask();
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();
    const submission = await seedPendingSubmission(task, user.body.data.user.id);

    const first = await admin.agent
      .post(`/api/admin/training/submissions/${submission.id}/approve`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(first.status).toBe(200);
    const second = await admin.agent
      .post(`/api/admin/training/submissions/${submission.id}/approve`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(second.status).toBe(409);
  });

  it('filters the submission list by status', async () => {
    const task = await createFixtureTask();
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    // A real customer submission is auto-approved immediately.
    await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'x' });

    const pending = await admin.agent.get('/api/admin/training/submissions?status=PENDING');
    expect(pending.body.data.submissions).toHaveLength(0);

    const approved = await admin.agent.get('/api/admin/training/submissions?status=APPROVED');
    expect(approved.body.data.submissions).toHaveLength(1);
  });

  it('gates deposits on task-based training completion, unlocking immediately once the (auto-approved) task is submitted', async () => {
    const task = await createFixtureTask({ productName: 'Nike Air Max 90' });
    const admin = await createAdminAndLogin();
    await admin.agent
      .put('/api/admin/crypto-assets/USDT')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ address: 'TAddressExample123', isEnabled: true });

    const user = await registerAndLogin();
    await unlockTrainingForCustomer(user);

    const blocked = await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'USDT', amount: 50 });
    expect(blocked.status).toBe(403);

    const submitRes = await user.agent
      .post(`/api/training/tasks/${task.id}/submit`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ answer: 'Nike Air Max 90' });
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.status).toBe('APPROVED');

    // The one required task is auto-approved immediately on submit — no
    // separate admin approval step is needed for the deposit gate to open.
    const unlocked = await user.agent
      .post('/api/wallet/deposit')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ assetCode: 'USDT', amount: 50 });
    expect(unlocked.status).toBe(201);
  });
});
