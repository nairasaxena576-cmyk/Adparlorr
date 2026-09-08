import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import { env } from '../src/config/env';
import { authCookieOptions, csrfCookieOptions, guestSupportCookieOptions } from '../src/config/cookies';
import { app } from './helpers';

// env is a plain parsed object (see config/env.ts), not frozen — mutating
// COOKIE_DOMAIN directly for the duration of one test and restoring it
// afterward is the most direct way to exercise both branches of the
// `env.COOKIE_DOMAIN || undefined` fallback without reloading modules or
// spinning up a second app/process.
const ORIGINAL_COOKIE_DOMAIN = env.COOKIE_DOMAIN;

afterEach(() => {
  env.COOKIE_DOMAIN = ORIGINAL_COOKIE_DOMAIN;
});

describe('cookie domain configuration — scoped to the CSRF cookie only', () => {
  it('applies COOKIE_DOMAIN to the CSRF cookie only when configured', () => {
    env.COOKIE_DOMAIN = '.adparlorr.com';
    expect(csrfCookieOptions().domain).toBe('.adparlorr.com');
  });

  it('does NOT broaden the httpOnly session cookie, even when COOKIE_DOMAIN is configured', () => {
    env.COOKIE_DOMAIN = '.adparlorr.com';
    expect(authCookieOptions().domain).toBeUndefined();
  });

  it('does NOT broaden the httpOnly guest-identity cookie, even when COOKIE_DOMAIN is configured', () => {
    env.COOKIE_DOMAIN = '.adparlorr.com';
    expect(guestSupportCookieOptions().domain).toBeUndefined();
  });

  it('keeps the CSRF cookie host-only when COOKIE_DOMAIN is not configured (local dev default)', () => {
    env.COOKIE_DOMAIN = '';
    expect(csrfCookieOptions().domain).toBeUndefined();
    env.COOKIE_DOMAIN = undefined;
    expect(csrfCookieOptions().domain).toBeUndefined();
  });

  it('preserves httpOnly=false, Secure, and SameSite on the CSRF cookie regardless of COOKIE_DOMAIN', () => {
    for (const domain of ['.adparlorr.com', '', undefined]) {
      env.COOKIE_DOMAIN = domain;
      const opts = csrfCookieOptions();
      expect(opts.httpOnly).toBe(false);
      expect(opts.secure).toBe(env.COOKIE_SECURE);
      expect(opts.sameSite).toBe(env.COOKIE_SAME_SITE);
    }
  });

  it('leaves the session cookie httpOnly/secure/sameSite unaffected by COOKIE_DOMAIN either way', () => {
    for (const domain of ['.adparlorr.com', '', undefined]) {
      env.COOKIE_DOMAIN = domain;
      const opts = authCookieOptions();
      expect(opts.httpOnly).toBe(true);
      expect(opts.secure).toBe(env.COOKIE_SECURE);
      expect(opts.sameSite).toBe(env.COOKIE_SAME_SITE);
      expect(opts.domain).toBeUndefined();
    }
  });
});

describe('cookie domain configuration — end-to-end on the guest-support first-contact request', () => {
  it("stamps Domain=.adparlorr.com on the CSRF cookie the very first time a guest hits Support Chat, when configured", async () => {
    env.COOKIE_DOMAIN = '.adparlorr.com';
    const res = await request(app).get('/api/support/messages');
    expect(res.status).toBe(200);

    const setCookie = (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
    const csrfCookie = setCookie.find((c) => c.startsWith('adp_csrf='));
    const guestCookie = setCookie.find((c) => c.startsWith('adp_guest_support='));

    expect(csrfCookie).toBeDefined();
    expect(csrfCookie!.toLowerCase()).toContain('domain=.adparlorr.com');

    // The httpOnly guest-identity cookie must stay host-only — no Domain
    // attribute at all — even with COOKIE_DOMAIN configured for CSRF.
    expect(guestCookie).toBeDefined();
    expect(guestCookie!.toLowerCase()).not.toContain('domain=');

    // The response body must also carry the same token this same
    // round-trip (see support.controller.ts's req.freshCsrfToken path) —
    // this is what lets the OLD, not-yet-redeployed frontend bundle work
    // once it can read the now cross-subdomain-visible cookie, and what
    // lets the NEW frontend bundle work via the body fallback either way.
    expect(typeof res.body.data.csrfToken).toBe('string');
    expect(csrfCookie).toContain(`adp_csrf=${res.body.data.csrfToken}`);
  });

  it('stays host-only (no Domain attribute) when COOKIE_DOMAIN is not configured', async () => {
    env.COOKIE_DOMAIN = undefined;
    const res = await request(app).get('/api/support/messages');
    const setCookie = (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
    const csrfCookie = setCookie.find((c) => c.startsWith('adp_csrf='));
    expect(csrfCookie).toBeDefined();
    expect(csrfCookie!.toLowerCase()).not.toContain('domain=');
  });
});
