import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import {
  getMyReferrals,
  getTrainingReferralStatus,
  verifyReferralForTraining,
  listMyTrainingFundingRequests,
} from '../services/referral.service';

export const getReferrals = asyncHandler(async (req: Request, res: Response) => {
  const data = await getMyReferrals(req.user!.id);
  ok(res, data);
});

export const getTrainingReferral = asyncHandler(async (req: Request, res: Response) => {
  const status = await getTrainingReferralStatus(req.user!.id);
  ok(res, { referral: status });
});

export const postVerifyTrainingReferral = asyncHandler(async (req: Request, res: Response) => {
  const { referralCode } = req.body as { referralCode: string };
  const status = await verifyReferralForTraining(req.user!.id, referralCode);
  ok(res, { referral: status });
});

export const getMyTrainingFundingRequests = asyncHandler(async (req: Request, res: Response) => {
  const requests = await listMyTrainingFundingRequests(req.user!.id);
  ok(res, { requests });
});
