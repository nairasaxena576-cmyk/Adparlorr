import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import {
  listConversationsForAdmin,
  getConversationForAdmin,
  sendAdminReply,
} from '../services/supportChat.service';

export const getConversations = asyncHandler(async (_req: Request, res: Response) => {
  const conversations = await listConversationsForAdmin();
  ok(res, { conversations });
});

export const getConversationMessages = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params as { conversationId: string };
  const messages = await getConversationForAdmin(conversationId);
  ok(res, { messages });
});

export const postConversationReply = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params as { conversationId: string };
  const { text } = req.body as { text: string };
  const message = await sendAdminReply(conversationId, text);
  ok(res, { message }, 201);
});
