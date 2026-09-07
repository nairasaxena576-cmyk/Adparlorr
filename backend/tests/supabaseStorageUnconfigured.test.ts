import { describe, it, expect, vi, beforeAll } from 'vitest';

// Separate file (own module registry) so the "no credentials configured"
// case never shares module-level state — e.g. a cached Supabase client —
// with tests/supabaseStorage.test.ts's happy-path cases.
const mockCreateClient = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock('../src/config/env', () => ({
  env: {
    SUPABASE_URL: undefined,
    SUPABASE_SERVICE_ROLE_KEY: undefined,
    SUPABASE_STORAGE_BUCKET: 'training-task-images',
  },
}));

// See tests/supabaseStorage.test.ts for why this must be deferred: the
// global setupFile (tests/setup.ts) eagerly loads the REAL supabaseStorage
// module (via ./helpers's createApp() side effect) before this file's own
// vi.mock() calls above can intercept it. vi.resetModules() + a dynamic
// import here forces a fresh resolution that correctly binds to the mocks.
let uploadTrainingTaskImage: typeof import('../src/lib/supabaseStorage').uploadTrainingTaskImage;
let deleteTrainingTaskImage: typeof import('../src/lib/supabaseStorage').deleteTrainingTaskImage;

beforeAll(async () => {
  vi.resetModules();
  const mod = await import('../src/lib/supabaseStorage');
  uploadTrainingTaskImage = mod.uploadTrainingTaskImage;
  deleteTrainingTaskImage = mod.deleteTrainingTaskImage;
});

describe('supabaseStorage (not configured)', () => {
  it('fails clearly on upload instead of silently falling back to local disk', async () => {
    await expect(uploadTrainingTaskImage(Buffer.from('x'), 'image/png')).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining('SUPABASE_URL'),
    });
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('delete is a safe no-op (never throws) when storage is not configured', async () => {
    await expect(
      deleteTrainingTaskImage('https://anything.test/storage/v1/object/public/bucket/training-tasks/x.jpg')
    ).resolves.toBeUndefined();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
