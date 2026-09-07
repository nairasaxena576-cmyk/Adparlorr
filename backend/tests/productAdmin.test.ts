import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/prisma';

// Never touch the real Supabase Storage bucket from tests — stub the
// storage module entirely, same pattern as trainingTaskAdmin.test.ts.
const FAKE_STORAGE_BASE = 'https://fake-project.supabase.test/storage/v1/object/public/training-task-images';
let fakeUploadCounter = 0;

vi.mock('../src/lib/supabaseStorage', () => ({
  uploadProductImage: vi.fn(async (_buffer: Buffer, mimeType: string) => {
    fakeUploadCounter += 1;
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const path = `products/mock-${fakeUploadCounter}.${ext}`;
    return { path, url: `${FAKE_STORAGE_BASE}/${path}` };
  }),
  deleteImage: vi.fn(async () => undefined),
}));

// A plain top-level `import ... from './helpers'` is a static ES import and
// resolves before any other top-level statement in this file runs — even
// before the hoisted vi.mock() above has settled — so ./helpers's
// module-level `export const app = createApp()` can transitively bind
// productAdmin.service.ts to the REAL supabaseStorage instead of the mock.
// Deferring the import into beforeAll via vi.resetModules() + dynamic
// import() forces it to happen strictly after mock registration has fully
// settled, which is the only sequencing proven (via a prior diagnostic) to
// bind correctly.
let registerAndLogin: typeof import('./helpers').registerAndLogin;
let createAdminAndLogin: typeof import('./helpers').createAdminAndLogin;
let createFixtureProduct: typeof import('./helpers').createFixtureProduct;
let mockUpload: typeof import('../src/lib/supabaseStorage').uploadProductImage;
let mockDelete: typeof import('../src/lib/supabaseStorage').deleteImage;

beforeAll(async () => {
  vi.resetModules();
  const helpers = await import('./helpers');
  registerAndLogin = helpers.registerAndLogin;
  createAdminAndLogin = helpers.createAdminAndLogin;
  createFixtureProduct = helpers.createFixtureProduct;
  const storage = await import('../src/lib/supabaseStorage');
  mockUpload = storage.uploadProductImage;
  mockDelete = storage.deleteImage;
});

describe('products (admin)', () => {
  beforeEach(() => {
    vi.mocked(mockUpload).mockClear();
    vi.mocked(mockDelete).mockClear();
  });

  it('creates a product', async () => {
    const admin = await createAdminAndLogin();
    const res = await admin.agent
      .post('/api/admin/products')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ name: 'Nike Air Max 90', category: 'Footwear', reward: 0.8, cost: 0.3, isActive: true });

    expect(res.status).toBe(201);
    expect(res.body.data.product).toMatchObject({
      name: 'Nike Air Max 90',
      category: 'Footwear',
      reward: 0.8,
      cost: 0.3,
      isActive: true,
      imageUrl: null,
    });
    expect(typeof res.body.data.product.displayOrder).toBe('number');
  });

  it('auto-assigns displayOrder past the seeded catalog when none is supplied', async () => {
    const admin = await createAdminAndLogin();
    const res = await admin.agent
      .post('/api/admin/products')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ name: 'Auto Order Product', category: 'x', reward: 1, cost: 0.5 });

    expect(res.status).toBe(201);
    expect(res.body.data.product.displayOrder).toBeGreaterThanOrEqual(46);
  });

  it('rejects creating a product with a displayOrder that collides with an existing one', async () => {
    const admin = await createAdminAndLogin();
    const res = await admin.agent
      .post('/api/admin/products')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ name: 'Collider', category: 'x', reward: 1, cost: 0.5, displayOrder: 1 });

    expect(res.status).toBe(409);
  });

  it('uploads a product image via Supabase Storage and returns a usable, safe URL', async () => {
    const admin = await createAdminAndLogin();
    const pngBytes = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd40000000049454e44ae426082',
      'hex'
    );

    const res = await admin.agent
      .post('/api/admin/products/upload-image')
      .set('X-CSRF-Token', admin.csrfToken)
      .attach('image', pngBytes, { filename: '../../etc/passwd.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data.imageUrl).toMatch(/\/products\/[^/]+\.png$/);
    expect(res.body.data.imageUrl).not.toContain('passwd');
    expect(res.body.data.imageUrl).not.toContain('..');
    expect(JSON.stringify(res.body)).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE_KEY/i);
    expect(mockUpload).toHaveBeenCalledTimes(1);

    const createRes = await admin.agent
      .post('/api/admin/products')
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ name: 'Uploaded Product', category: 'x', reward: 1, cost: 0.5, imageUrl: res.body.data.imageUrl });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.product.imageUrl).toBe(res.body.data.imageUrl);
  });

  it('rejects a non-admin from the upload endpoint', async () => {
    const user = await registerAndLogin();
    const res = await user.agent
      .post('/api/admin/products/upload-image')
      .set('X-CSRF-Token', user.csrfToken)
      .attach('image', Buffer.from([0x89, 0x50, 0x4e, 0x47]), { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('edits a product', async () => {
    const product = await createFixtureProduct({ name: 'Old Name' });
    const admin = await createAdminAndLogin();

    const res = await admin.agent
      .put(`/api/admin/products/${product.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ name: 'New Name', reward: 2.5 });

    expect(res.status).toBe(200);
    expect(res.body.data.product.name).toBe('New Name');
    expect(res.body.data.product.reward).toBe(2.5);
  });

  it('replaces a product image and cleans up the old storage object', async () => {
    const product = await createFixtureProduct({ imageUrl: 'https://example.test/old-image.jpg' });
    const admin = await createAdminAndLogin();

    const res = await admin.agent
      .put(`/api/admin/products/${product.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ imageUrl: 'https://example.test/new-image.jpg' });

    expect(res.status).toBe(200);
    expect(res.body.data.product.imageUrl).toBe('https://example.test/new-image.jpg');
    // Product has no historical imageUrl snapshot anywhere (unlike
    // TrainingTaskSubmission) — always safe to clean up the old object.
    expect(mockDelete).toHaveBeenCalledWith('https://example.test/old-image.jpg');
  });

  it('does not touch storage when editing fields other than the image', async () => {
    const product = await createFixtureProduct();
    const admin = await createAdminAndLogin();

    await admin.agent
      .put(`/api/admin/products/${product.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ category: 'Renamed' });

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('publishes and unpublishes a product', async () => {
    const product = await createFixtureProduct({ isActive: false });
    const admin = await createAdminAndLogin();

    const publish = await admin.agent
      .put(`/api/admin/products/${product.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ isActive: true });
    expect(publish.body.data.product.isActive).toBe(true);

    const unpublish = await admin.agent
      .put(`/api/admin/products/${product.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ isActive: false });
    expect(unpublish.body.data.product.isActive).toBe(false);
  });

  it('reorders products by swapping displayOrder without ever colliding', async () => {
    // Two consecutive default-displayOrder fixtures are guaranteed adjacent
    // in sorted order regardless of what other fixture rows already exist
    // in this file (Product rows are never cleared between tests) — a
    // hardcoded literal value here would risk colliding with an earlier
    // test's still-present row.
    const p1 = await createFixtureProduct();
    const p2 = await createFixtureProduct();
    const admin = await createAdminAndLogin();

    const res = await admin.agent
      .post(`/api/admin/products/${p2.id}/reorder`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ direction: 'up' });
    expect(res.status).toBe(200);

    const reloaded1 = await prisma.product.findUnique({ where: { id: p1.id } });
    const reloaded2 = await prisma.product.findUnique({ where: { id: p2.id } });
    expect(reloaded2!.displayOrder).toBe(p1.displayOrder);
    expect(reloaded1!.displayOrder).toBe(p2.displayOrder);
  });

  it('deletes a product with no submissions, cleaning up its storage object', async () => {
    const product = await createFixtureProduct({ imageUrl: 'https://example.test/deleted-product.jpg' });
    const admin = await createAdminAndLogin();

    const res = await admin.agent
      .delete(`/api/admin/products/${product.id}`)
      .set('X-CSRF-Token', admin.csrfToken);

    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith('https://example.test/deleted-product.jpg');
    expect(await prisma.product.findUnique({ where: { id: product.id } })).toBeNull();
  });

  it('blocks deleting a product that already has a customer submission, preserving history', async () => {
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();

    // submitOrder() only accepts the customer's actual current workbench
    // product (server-decided) — not an arbitrary freshly-created fixture —
    // so fetch it rather than assuming which product that is.
    const workbenchRes = await user.agent.get('/api/orders/workbench');
    const currentProduct = workbenchRes.body.data.workbench.currentProduct;

    const submitRes = await user.agent
      .post('/api/orders')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ productId: currentProduct.id });
    expect(submitRes.status).toBe(201);

    const del = await admin.agent
      .delete(`/api/admin/products/${currentProduct.id}`)
      .set('X-CSRF-Token', admin.csrfToken);
    expect(del.status).toBe(409);

    // The product and the historical submission both survive intact.
    expect(await prisma.product.findUnique({ where: { id: currentProduct.id } })).not.toBeNull();
    // POST /api/orders does not return a `submission` field (see
    // SubmitOrderResult) — look the row up directly via the unique
    // (userId, productId) pair instead.
    const submission = await prisma.taskSubmission.findUnique({
      where: { userId_productId: { userId: user.body.data.user.id, productId: currentProduct.id } },
    });
    expect(submission).not.toBeNull();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('rejects every mutating products endpoint for a non-admin user', async () => {
    const product = await createFixtureProduct();
    const user = await registerAndLogin();

    const create = await user.agent
      .post('/api/admin/products')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ name: 'x', category: 'x', reward: 1, cost: 0.5 });
    expect(create.status).toBe(403);

    const edit = await user.agent
      .put(`/api/admin/products/${product.id}`)
      .set('X-CSRF-Token', user.csrfToken)
      .send({ name: 'hacked' });
    expect(edit.status).toBe(403);

    const del = await user.agent.delete(`/api/admin/products/${product.id}`).set('X-CSRF-Token', user.csrfToken);
    expect(del.status).toBe(403);

    const list = await user.agent.get('/api/admin/products');
    expect(list.status).toBe(403);
  });

  it('historical submissions keep their own reward/cost snapshot after the product is edited', async () => {
    const admin = await createAdminAndLogin();
    const user = await registerAndLogin();

    const workbenchRes = await user.agent.get('/api/orders/workbench');
    const currentProduct = workbenchRes.body.data.workbench.currentProduct;
    // submitOrder() snapshots costAmount from the product's `price` (what
    // the workbench actually charges against) and rewardAmount from the
    // computed 1% commission on that price — not the legacy `reward`/`cost`
    // admin fields, which play no part in this calculation.
    const expectedCost = currentProduct.price;
    const expectedReward = Math.round(expectedCost * 0.01 * 100) / 100;

    const submitRes = await user.agent
      .post('/api/orders')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ productId: currentProduct.id });
    expect(submitRes.status).toBe(201);

    await admin.agent
      .put(`/api/admin/products/${currentProduct.id}`)
      .set('X-CSRF-Token', admin.csrfToken)
      .send({ reward: 99, cost: 50, price: 9999 });

    // POST /api/orders does not return a `submission` field (see
    // SubmitOrderResult) — look the row up directly via the unique
    // (userId, productId) pair instead.
    const submission = await prisma.taskSubmission.findUnique({
      where: { userId_productId: { userId: user.body.data.user.id, productId: currentProduct.id } },
    });
    expect(Number(submission!.rewardAmount)).toBeCloseTo(expectedReward, 5);
    expect(Number(submission!.costAmount)).toBe(expectedCost);
  });
});

describe('products (customer)', () => {
  it('shows a published product with its image to a customer', async () => {
    const product = await createFixtureProduct({
      name: 'Visible Product',
      isActive: true,
      imageUrl: 'https://example.test/visible.jpg',
    });
    const user = await registerAndLogin();

    const res = await user.agent.get('/api/products');
    expect(res.status).toBe(200);
    const found = res.body.data.products.find((p: { id: string }) => p.id === product.id);
    expect(found).toBeDefined();
    expect(found.imageUrl).toBe('https://example.test/visible.jpg');
  });

  it('never returns an unpublished (draft) product to a customer', async () => {
    const draft = await createFixtureProduct({ name: 'Hidden Draft', isActive: false });
    const user = await registerAndLogin();

    const res = await user.agent.get('/api/products');
    const found = res.body.data.products.find((p: { id: string }) => p.id === draft.id);
    expect(found).toBeUndefined();
  });

  it('lets a customer submit a published product (order/task submission still works end-to-end)', async () => {
    const user = await registerAndLogin();

    // submitOrder() only accepts the server-decided current workbench
    // product, not an arbitrary product id — fetch it rather than assuming.
    const workbenchRes = await user.agent.get('/api/orders/workbench');
    const currentProduct = workbenchRes.body.data.workbench.currentProduct;

    const res = await user.agent
      .post('/api/orders')
      .set('X-CSRF-Token', user.csrfToken)
      .send({ productId: currentProduct.id });

    expect(res.status).toBe(201);
    expect(res.body.data.user.completedOrders).toBe(1);
  });

  it('always submits as the authenticated session user, ignoring any userId in the request body', async () => {
    const victim = await registerAndLogin();
    const attacker = await registerAndLogin();

    // Both are brand-new users with no submissions yet, so they see the
    // same current product — fetch it via the attacker's own session.
    const workbenchRes = await attacker.agent.get('/api/orders/workbench');
    const currentProduct = workbenchRes.body.data.workbench.currentProduct;

    const res = await attacker.agent
      .post('/api/orders')
      .set('X-CSRF-Token', attacker.csrfToken)
      .send({ productId: currentProduct.id, userId: victim.body.data.user.id });

    expect(res.status).toBe(201);
    expect(res.body.data.user.id).toBe(attacker.body.data.user.id);

    const victimSubmissions = await prisma.taskSubmission.findMany({ where: { userId: victim.body.data.user.id } });
    expect(victimSubmissions).toHaveLength(0);
  });
});
