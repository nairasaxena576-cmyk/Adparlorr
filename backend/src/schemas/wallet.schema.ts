import { z } from 'zod';
import { CryptoAssetCode } from '@prisma/client';
import { SIMULATION } from '../config/simulation';

export const depositSchema = z.object({
  assetCode: z.nativeEnum(CryptoAssetCode, {
    errorMap: () => ({ message: 'A valid crypto asset (USDT, BTC, or ETH) is required.' }),
  }),
  amount: z.coerce
    .number()
    .positive('Amount must be greater than zero.')
    .max(SIMULATION.MAX_DEPOSIT_AMOUNT, `Amount must not exceed ${SIMULATION.MAX_DEPOSIT_AMOUNT}.`),
  trainingFundingReferralId: z.string().uuid().optional(),
});
