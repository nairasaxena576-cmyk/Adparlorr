import { Router } from 'express';
import { getTelegramConfig, getMySupportMessages, postMySupportMessage } from '../controllers/support.controller';
import { requireAuth } from '../middleware/requireAuth';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import { sendSupportMessageSchema } from '../schemas/support.schema';

export const supportRouter = Router();

// Read-only for any authenticated user (customer or admin). Writing this
// configuration is an admin-only concern, handled under /api/admin.
supportRouter.get('/telegram', requireAuth, getTelegramConfig);

supportRouter.get('/messages', requireAuth, getMySupportMessages);
supportRouter.post(
  '/messages',
  requireAuth,
  verifyCsrf,
  validate({ body: sendSupportMessageSchema }),
  postMySupportMessage
);
