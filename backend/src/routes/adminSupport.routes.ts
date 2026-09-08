import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import { sendSupportMessageSchema, supportConversationIdParamsSchema } from '../schemas/support.schema';
import { getConversations, getConversationMessages, postConversationReply } from '../controllers/adminSupport.controller';

export const adminSupportRouter = Router();

adminSupportRouter.use(requireAuth, requireRole('ADMIN'));

adminSupportRouter.get('/conversations', getConversations);
adminSupportRouter.get(
  '/conversations/:conversationId/messages',
  validate({ params: supportConversationIdParamsSchema }),
  getConversationMessages
);
adminSupportRouter.post(
  '/conversations/:conversationId/messages',
  verifyCsrf,
  validate({ params: supportConversationIdParamsSchema, body: sendSupportMessageSchema }),
  postConversationReply
);
