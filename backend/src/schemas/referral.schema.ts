import { z } from 'zod';

export const verifyTrainingReferralSchema = z.object({
  referralCode: z.string().trim().toUpperCase().min(1, 'A referral code is required.').max(20),
});
