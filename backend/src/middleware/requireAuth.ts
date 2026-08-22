import type { NextFunction, Request, Response } from 'express';
import { verifyAuthToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { AUTH_COOKIE_NAME } from '../config/cookies';
import { findUserById } from '../repositories/user.repository';
import { toSafeUser } from '../services/auth.service';

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) throw AppError.unauthorized();

    const payload = verifyAuthToken(token);
    const user = await findUserById(payload.sub);

    if (!user) throw AppError.unauthorized();
    if (user.sessionVersion !== payload.sessionVersion) {
      throw AppError.unauthorized('Session expired. Please log in again.');
    }

    req.user = toSafeUser(user);
    next();
  } catch {
    next(AppError.unauthorized());
  }
}
