import { Router } from 'express';
import { getTelegramConfig, getMySupportMessages, postMySupportMessage } from '../controllers/support.controller';
import { resolveSupportIdentity } from '../middleware/supportIdentity';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import { sendSupportMessageSchema } from '../schemas/support.schema';

export const supportRouter = Router();

// Public, non-sensitive global config (just a toggle + URL) — an
// unauthenticated Support Chat visitor sees the same "Prefer Telegram?" CTA
// an authenticated customer does.
supportRouter.get('/telegram', getTelegramConfig);

// resolveSupportIdentity (not requireAuth) — Support Chat must work for an
// unauthenticated visitor too. It resolves the real authenticated session
// when there is one, and otherwise establishes/reuses a guest identity; it
// never rejects the request the way requireAuth does.
supportRouter.get('/messages', resolveSupportIdentity, getMySupportMessages);
supportRouter.post(
  '/messages',
  resolveSupportIdentity,
  verifyCsrf,
  validate({ body: sendSupportMessageSchema }),
  postMySupportMessage
);
