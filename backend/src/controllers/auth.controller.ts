import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';
import { registerUser, loginUser, logoutUser } from '../services/auth.service';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, authCookieOptions, csrfCookieOptions } from '../config/cookies';
import { issueCsrfCookie } from '../middleware/csrf';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, token } = await registerUser(req.body);
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
  issueCsrfCookie(res);
  created(res, { user });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, token } = await loginUser(req.body);
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
  issueCsrfCookie(res);
  ok(res, { user });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) {
    await logoutUser(req.user.id);
  }
  res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions());
  res.clearCookie(CSRF_COOKIE_NAME, csrfCookieOptions());
  ok(res, {});
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  ok(res, { user: req.user });
});
