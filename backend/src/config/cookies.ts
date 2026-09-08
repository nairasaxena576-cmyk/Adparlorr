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
 *
 * Deliberately host-only (no COOKIE_DOMAIN) — httpOnly means the browser
 * auto-attaches it to every request to this exact host regardless of which
 * page/origin initiated the request, so a shared parent domain was never
 * needed for authentication to work across adparlorr.com/api.adparlorr.com.
 * Broadening this cookie's domain isn't required to fix the CSRF issue
 * below and would needlessly widen where a valid session cookie is sent —
 * see csrfCookieOptions() for the one cookie that actually needs it.
 */
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
  };
}

// Unlike the httpOnly cookies above/below, this one is deliberately
// non-httpOnly so frontend JS can read it via document.cookie for the
// CSRF double-submit header. When the frontend and API are on different
// hosts (adparlorr.com vs api.adparlorr.com) with no shared COOKIE_DOMAIN,
// this cookie defaults to host-only (scoped to api.adparlorr.com) — the
// browser still sends it to the API automatically, but document.cookie on
// the frontend's own origin can never see a cookie scoped to a different
// host, so the frontend can never read it to build the X-CSRF-Token
// header. Setting COOKIE_DOMAIN=.adparlorr.com in production makes this
// one cookie visible across both subdomains while leaving every other
// cookie (session, guest identity) exactly as host-only as it already was
// — see the ONLY cookie in this file whose options read COOKIE_DOMAIN.
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
// Deliberately host-only, same reasoning as authCookieOptions() above —
// httpOnly cookies don't need a shared COOKIE_DOMAIN to be sent correctly
// cross-subdomain, only the non-httpOnly CSRF cookie does.
export function guestSupportCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}
