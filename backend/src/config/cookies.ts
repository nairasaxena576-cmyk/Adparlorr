import type { CookieOptions } from 'express';
import { env } from './env';

export const AUTH_COOKIE_NAME = 'adp_session';
export const CSRF_COOKIE_NAME = 'adp_csrf';

/**
 * The auth cookie's value is itself a signed JWT (verified via JWT_SECRET),
 * so we deliberately do not use Express/cookie-parser's separate
 * cookie-signing feature here — that would mean maintaining a second,
 * unrelated secret (a "COOKIE_SECRET") purely to sign an envelope around an
 * already-signed token, which adds no real security and was explicitly
 * called out to avoid. Cookie config below is behavior-only, non-secret.
 */
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  };
}

export function csrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
  };
}
