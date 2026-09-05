import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

// Buffers the file in memory only — nothing touches local disk. The buffer
// is handed to lib/supabaseStorage.ts (see trainingTaskAdmin.service.ts),
// which uploads it to Supabase Storage; the DB only ever stores the
// resulting URL string, never raw image bytes.
export const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
export const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(AppError.badRequest('Only JPEG, PNG, WEBP, or GIF images are allowed.'));
      return;
    }
    cb(null, true);
  },
}).single('image');

// Generic single-image-upload middleware — used by both the training-task
// admin routes and the product admin routes (see routes/trainingTaskAdmin.routes.ts
// and routes/productAdmin.routes.ts). Same MIME allowlist, size limit, and
// error handling regardless of which feature is uploading; only the
// destination storage prefix differs, and that's decided by the caller via
// lib/supabaseStorage.ts, not here.
//
// Translates multer's own errors (oversized file, wrong field name, etc.)
// into the app's normal AppError -> JSON envelope instead of letting them
// fall through errorHandler's generic 500 branch.
export function uploadImageFile(req: Request, res: Response, next: NextFunction) {
  uploadSingleImage(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(AppError.badRequest('Image must be 5MB or smaller.'));
      }
      return next(AppError.badRequest(`Upload failed: ${err.message}`));
    }
    next(err);
  });
}
