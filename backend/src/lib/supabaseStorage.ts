import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { EXTENSION_BY_MIME } from '../middleware/upload';

// This module writes to two prefixes within the same configured bucket —
// one per feature that uploads images (training task photos and product
// photos). Reusing one bucket with per-feature prefixes avoids asking the
// admin to provision and configure a second bucket for what is otherwise
// an identical "admin uploads a small product-style photo" need; see
// backend/README.md Supabase Storage setup notes for the full layout.
const TRAINING_TASK_PREFIX = 'training-tasks';
const PRODUCT_PREFIX = 'products';

let cachedClient: SupabaseClient | null = null;

// Lazy on purpose: constructing the client (or even just reading these env
// vars as "required") at module-load time would make the whole backend
// refuse to boot without real Supabase credentials, breaking local dev and
// anything that imports this module transitively at typecheck/build time.
// The failure instead happens the first time someone actually tries to
// upload/delete an image without storage configured — a clear 500, not a
// silent fallback to local disk.
function getClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError(
      500,
      'Image storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the backend.'
    );
  }
  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

export interface UploadedImage {
  path: string;
  url: string;
}

// Path is always server-generated (crypto.randomUUID() + an extension
// derived from the already MIME-validated upload) — the client-supplied
// original filename is never used for anything.
async function uploadToStorage(buffer: Buffer, mimeType: string, prefix: string): Promise<UploadedImage> {
  const supabase = getClient();
  const extension = EXTENSION_BY_MIME[mimeType] ?? '.jpg';
  const path = `${prefix}/${crypto.randomUUID()}${extension}`;

  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) {
    throw new AppError(502, `Failed to upload image to storage: ${error.message}`);
  }

  const { data } = supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export function uploadTrainingTaskImage(buffer: Buffer, mimeType: string): Promise<UploadedImage> {
  return uploadToStorage(buffer, mimeType, TRAINING_TASK_PREFIX);
}

export function uploadProductImage(buffer: Buffer, mimeType: string): Promise<UploadedImage> {
  return uploadToStorage(buffer, mimeType, PRODUCT_PREFIX);
}

// Best-effort cleanup only — never throws. Callers decide *whether* it's
// safe to delete (e.g. checking no TrainingTaskSubmission snapshot still
// references this exact URL); this function just performs the deletion and
// silently no-ops for anything that isn't one of our own storage URLs
// (e.g. a legacy local-disk URL from before the Supabase Storage migration).
// Prefix-agnostic — it parses the path straight out of the URL, so the same
// function deletes both training-task and product images.
export async function deleteImage(imageUrl: string): Promise<void> {
  const path = extractStoragePath(imageUrl);
  if (!path) return;
  try {
    const supabase = getClient();
    await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).remove([path]);
  } catch {
    // Swallowed deliberately — see doc comment above.
  }
}

// Backward-compatible name for existing training-task call sites/tests.
export const deleteTrainingTaskImage = deleteImage;

function extractStoragePath(imageUrl: string): string | null {
  if (!env.SUPABASE_URL) return null;
  const prefix = `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/`;
  return imageUrl.startsWith(prefix) ? imageUrl.slice(prefix.length) : null;
}
