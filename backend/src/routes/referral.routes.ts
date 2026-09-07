import { Router } from 'express';
import {
  getReferrals,
  getTrainingReferral,
  postVerifyTrainingReferral,
  getMyTrainingFundingRequests,
} from '../controllers/referral.controller';
import { requireAuth } from '../middleware/requireAuth';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import { verifyTrainingReferralSchema } from '../schemas/referral.schema';

export const referralRouter = Router();

referralRouter.get('/', requireAuth, getReferrals);

// Training-access referral gate (see referral.service.ts) — separate from
// the read-only "my referrals" list above.
referralRouter.get('/training', requireAuth, getTrainingReferral);
referralRouter.get('/training/funding-requests', requireAuth, getMyTrainingFundingRequests);
referralRouter.post(
  '/training/verify',
  requireAuth,
  verifyCsrf,
  validate({ body: verifyTrainingReferralSchema }),
  postVerifyTrainingReferral
);
