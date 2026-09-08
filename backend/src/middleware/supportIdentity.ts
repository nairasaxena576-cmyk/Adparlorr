import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import { verifyAuthToken } from '../utils/jwt';
import { AUTH_COOKIE_NAME, GUEST_SUPPORT_COOKIE_NAME, guestSupportCookieOptions } from '../config/cookies';
import { findUserById } from '../repositories/user.repository';
import { issueCsrfCookie } from './csrf';

export type SupportIdentity = { type: 'user'; userId: string } | { type: 'guest'; guestId: string };

const GUEST_ID_PATTERN = /^[a-f0-9]{64}$/;

// Resolves who is chatting — an authenticated customer (by verified session
// JWT, exactly like requireAuth) or, if there is no valid session, an
// unauthenticated visitor identified by a dedicated, unguessable cookie
// established right here on first contact. Unlike requireAuth, this never
// rejects the request: Support Chat must work for guests too. The identity
// is always derived from cookies the server itself set/verified — never
// from anything in the request body, query string, or route params — so a
// client can never claim to be a different user or a different guest.
export async function resolveSupportIdentity(req: Request, res: Response, next: NextFunction) {
  try {
    const authToken = req.cookies?.[AUTH_COOKIE_NAME];
    if (authToken) {
      try {
        const payload = verifyAuthToken(authToken);
        const user = await findUserById(payload.sub);
        if (user && user.sessionVersion === payload.sessionVersion) {
          req.supportIdentity = { type: 'user', userId: user.id };
          return next();
        }
      } catch {
        // Invalid/expired auth cookie — fall through to guest handling
        // rather than rejecting; only requireAuth-protected routes should
        // ever hard-fail on a bad session.
      }
    }

    const existingGuestId = req.cookies?.[GUEST_SUPPORT_COOKIE_NAME];
    if (typeof existingGuestId === 'string' && GUEST_ID_PATTERN.test(existingGuestId)) {
      req.supportIdentity = { type: 'guest', guestId: existingGuestId };
      return next();
    }

    // First contact from this visitor — mint a new guest identity and, since
    // they have no session and therefore no CSRF cookie yet either, issue
    // one now (same mechanism login/register use) so their next POST
    // message passes verifyCsrf. req.cookies reflects only what the browser
    // sent on THIS request, so it won't contain the cookie we just told the
    // response to set — stash the value on req so the controller can still
    // return it in the response body this same round-trip (see
    // support.controller.ts's currentCsrfToken).
    const guestId = crypto.randomBytes(32).toString('hex');
    res.cookie(GUEST_SUPPORT_COOKIE_NAME, guestId, guestSupportCookieOptions());
    req.freshCsrfToken = issueCsrfCookie(res);
    req.supportIdentity = { type: 'guest', guestId };
    next();
  } catch (err) {
    next(err);
  }
}
