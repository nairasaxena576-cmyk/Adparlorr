import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { getPublicSupportContact } from '../services/supportSettings.service';
import { getMyMessages, sendCustomerMessage } from '../services/supportChat.service';

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
  ok(res, { messages });
});

export const postMySupportMessage = asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body as { text: string };
  const messages = await sendCustomerMessage(req.supportIdentity!, text);
  ok(res, { messages }, 201);
});
