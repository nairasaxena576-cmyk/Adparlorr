import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// Pure unit tests for the storage module itself — no database, no network,
// no real Supabase project involved. @supabase/supabase-js is mocked
// entirely so this file can run in complete isolation.
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockRemove = vi.fn();
const mockFrom = vi.fn(() => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl, remove: mockRemove }));
const mockCreateClient = vi.fn(() => ({ storage: { from: mockFrom } }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

vi.mock('../src/config/env', () => ({
  env: {
    SUPABASE_URL: 'https://fake-project.supabase.test',
    SUPABASE_SERVICE_ROLE_KEY: 'fake-service-role-key',
    SUPABASE_STORAGE_BUCKET: 'training-task-images',
  },
}));

// tests/setup.ts (a global setupFile applied to every test file) imports
// ./helpers, whose eager `export const app = createApp()` transitively
// loads the REAL supabaseStorage.ts/@supabase/supabase-js/config/env before
// this file's own vi.mock() calls above can intercept them — setupFiles
// run before, and share the module registry with, the test file itself.
// vi.resetModules() + a dynamic import performed here (strictly after this
// file's own vi.mock() calls have registered) forces a fresh resolution
// that correctly binds to the mocks. Same pattern as productAdmin.test.ts.
let uploadTrainingTaskImage: typeof import('../src/lib/supabaseStorage').uploadTrainingTaskImage;
let deleteTrainingTaskImage: typeof import('../src/lib/supabaseStorage').deleteTrainingTaskImage;

beforeAll(async () => {
  vi.resetModules();
  const mod = await import('../src/lib/supabaseStorage');
  uploadTrainingTaskImage = mod.uploadTrainingTaskImage;
  deleteTrainingTaskImage = mod.deleteTrainingTaskImage;
});

describe('supabaseStorage (configured)', () => {
  beforeEach(() => {
    mockUpload.mockReset();
    mockGetPublicUrl.mockReset();
    mockRemove.mockReset();
    mockFrom.mockClear();
    mockCreateClient.mockClear();
  });

  it('uploads to the configured bucket under training-tasks/ with a server-generated UUID filename', async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockImplementation((path) => ({
      data: {
        publicUrl: `https://fake-project.supabase.test/storage/v1/object/public/training-task-images/${path}`,
      },
    }));

    const result = await uploadTrainingTaskImage(Buffer.from('fake-bytes'), 'image/png');

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://fake-project.supabase.test',
      'fake-service-role-key',
      expect.any(Object)
    );
    expect(mockFrom).toHaveBeenCalledWith('training-task-images');
    expect(mockUpload).toHaveBeenCalledTimes(1);

    const [path, buffer, options] = mockUpload.mock.calls[0];
    // UUID-based path, never the caller-supplied original filename.
    expect(path).toMatch(/^training-tasks\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(options).toMatchObject({ contentType: 'image/png', upsert: false });

    expect(result.path).toBe(path);
    expect(result.url).toContain(path);
  });

  it.each([
    ['image/jpeg', '.jpg'],
    ['image/png', '.png'],
    ['image/webp', '.webp'],
    ['image/gif', '.gif'],
  ])('maps %s to the %s extension', async (mimeType, expectedExt) => {
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://fake-project.supabase.test/x' } });

    await uploadTrainingTaskImage(Buffer.from('x'), mimeType);
    const [path] = mockUpload.mock.calls[0];
    expect(path.endsWith(expectedExt)).toBe(true);
  });

  it('throws a clean 502 AppError when the storage upload itself fails', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'bucket not found' } });
    await expect(uploadTrainingTaskImage(Buffer.from('x'), 'image/jpeg')).rejects.toMatchObject({
      statusCode: 502,
    });
  });

  it('extracts the storage path from a matching public URL and deletes exactly that object', async () => {
    mockRemove.mockResolvedValue({ error: null });
    const url =
      'https://fake-project.supabase.test/storage/v1/object/public/training-task-images/training-tasks/abc.jpg';

    await deleteTrainingTaskImage(url);

    expect(mockFrom).toHaveBeenCalledWith('training-task-images');
    expect(mockRemove).toHaveBeenCalledWith(['training-tasks/abc.jpg']);
  });

  it('no-ops safely for a URL that is not one of our storage URLs (e.g. a legacy local-disk URL)', async () => {
    await deleteTrainingTaskImage('http://localhost:4000/uploads/training-tasks/old.jpg');
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('never throws even if the underlying delete call rejects — best-effort only', async () => {
    mockRemove.mockRejectedValue(new Error('network error'));
    const url =
      'https://fake-project.supabase.test/storage/v1/object/public/training-task-images/training-tasks/abc.jpg';
    await expect(deleteTrainingTaskImage(url)).resolves.toBeUndefined();
  });
});
