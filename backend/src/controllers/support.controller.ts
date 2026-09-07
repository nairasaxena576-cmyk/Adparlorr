import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { getSupportSettings } from '../services/supportSettings.service';
import { getMyMessages, sendCustomerMessage } from '../services/supportChat.service';

export const getTelegramConfig = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getSupportSettings();
  ok(res, settings);
});

export const getMySupportMessages = asyncHandler(async (req: Request, res: Response) => {
  const messages = await getMyMessages(req.user!.id);
  ok(res, { messages });
});

export const postMySupportMessage = asyncHandler(async (req: Request, res: Response) => {
  const { text } = req.body as { text: string };
  const messages = await sendCustomerMessage(req.user!.id, text);
  ok(res, { messages }, 201);
});
