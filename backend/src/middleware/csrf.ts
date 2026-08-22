import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import { AppError } from '../utils/AppError';
import { CSRF_COOKIE_NAME, csrfCookieOptions } from '../config/cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function issueCsrfCookie(res: Response): string {
  const token = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions());
  return token;
}

export function verifyCsrf(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.header('X-CSRF-Token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(AppError.forbidden('Invalid or missing CSRF token.'));
  }
  next();
}
