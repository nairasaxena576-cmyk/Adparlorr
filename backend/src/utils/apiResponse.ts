import type { Response } from 'express';

export function ok<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>) {
  return res.status(status).json(meta ? { success: true, data, meta } : { success: true, data });
}

export function created<T>(res: Response, data: T, meta?: Record<string, unknown>) {
  return ok(res, data, 201, meta);
}
