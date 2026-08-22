import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err }, 'Unhandled operational error');
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  logger.error({ err }, 'Unexpected error');

  const message =
    env.NODE_ENV === 'production'
      ? 'Something went wrong. Please try again later.'
      : err instanceof Error
        ? err.message
        : 'Something went wrong.';

  return res.status(500).json({ success: false, message });
}
