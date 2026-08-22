import { Router } from 'express';
import { getReferrals } from '../controllers/referral.controller';
import { requireAuth } from '../middleware/requireAuth';

export const referralRouter = Router();

referralRouter.get('/', requireAuth, getReferrals);
