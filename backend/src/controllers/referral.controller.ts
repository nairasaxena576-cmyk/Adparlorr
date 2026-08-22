import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { getMyReferrals } from '../services/referral.service';

export const getReferrals = asyncHandler(async (req: Request, res: Response) => {
  const data = await getMyReferrals(req.user!.id);
  ok(res, data);
});
