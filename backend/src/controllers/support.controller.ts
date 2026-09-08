import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { CSRF_COOKIE_NAME } from '../config/cookies';
import { getPublicSupportContact } from '../services/supportSettings.service';
import { getMyMessages, sendCustomerMessage } from '../services/supportChat.service';

// The frontend (adparlorr.com) and backend (api.adparlorr.com) are
// different hosts in production. The CSRF cookie is intentionally
// non-httpOnly so frontend JS can read it via document.cookie for the
// double-submit header — but a cookie scoped to api.adparlorr.com (no
// shared COOKIE_DOMAIN) is invisible to document.cookie evaluated on
// adparlorr.com, even though the browser still auto-attaches it on
// requests TO api.adparlorr.com. That mismatch is what causes every
// support POST to 403 in production while GET looks fine (GET needs no
// CSRF at all). Echoing the already-server-visible token value in the
// response body gives the frontend a topology-independent way to obtain
// it — same token, same verifyCsrf double-submit check, no weakening.
function currentCsrfToken(req: Request): string | undefined {
  return req.freshCsrfToken ?? req.cookies?.[CSRF_COOKIE_NAME];
}

// Public — reachable by a logged-in customer or an unauthenticated visitor
// alike. Returns only the public contact shape (telegramEnabled/telegramUrl)
// — never the raw configured username or any other admin setting. Admin
// read/write of the full settings lives at /api/admin/support-settings,
// which stays requireAuth + requireRole('ADMIN').
export const getTelegramConfig = asyncHandler(async (_req: Request, res: Response) => {
  const contact = await getPublicSupportContact();
  ok(res, contact);
});

export const getMySupportMessages = asyncHandler(async (req: Request, res: Response) => {
  const messages = await getMyMessages(req.supportIdentity!);
  ok(res, { messages, csrfToken: currentCsrfToken(req) });
});

export const postMySupportMessage = asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body as { text: string };
  const messages = await sendCustomerMessage(req.supportIdentity!, text);
  ok(res, { messages, csrfToken: currentCsrfToken(req) }, 201);
});
