import type { CookieOptions } from 'express';
import { env } from './env';

export const AUTH_COOKIE_NAME = 'adp_session';
export const CSRF_COOKIE_NAME = 'adp_csrf';
export const GUEST_SUPPORT_COOKIE_NAME = 'adp_guest_support';

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

// Identifies an unauthenticated Support Chat visitor's own conversation —
// an opaque, unguessable, server-generated token (see
// middleware/supportIdentity.ts), never readable by client JS and never
// accepted from a request body/query. A 30-day maxAge lets a guest close
// and reopen their browser and still reach the same conversation; this
// cookie carries no claims to verify (unlike the JWT auth cookie), so it is
// httpOnly purely to stop another script/site from reading or fixating it.
export function guestSupportCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}
