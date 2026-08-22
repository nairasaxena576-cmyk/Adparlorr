import { Router } from 'express';
import { getTelegramConfig } from '../controllers/support.controller';
import { requireAuth } from '../middleware/requireAuth';

export const supportRouter = Router();

// Read-only for any authenticated user (customer or admin). Writing this
// configuration is an admin-only concern, handled under /api/admin.
supportRouter.get('/telegram', requireAuth, getTelegramConfig);
