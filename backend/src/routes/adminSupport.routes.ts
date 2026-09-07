import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import { sendSupportMessageSchema, supportUserIdParamsSchema } from '../schemas/support.schema';
import { getConversations, getConversationMessages, postConversationReply } from '../controllers/adminSupport.controller';

export const adminSupportRouter = Router();

adminSupportRouter.use(requireAuth, requireRole('ADMIN'));

adminSupportRouter.get('/conversations', getConversations);
adminSupportRouter.get(
  '/conversations/:userId/messages',
  validate({ params: supportUserIdParamsSchema }),
  getConversationMessages
);
adminSupportRouter.post(
  '/conversations/:userId/messages',
  verifyCsrf,
  validate({ params: supportUserIdParamsSchema, body: sendSupportMessageSchema }),
  postConversationReply
);
