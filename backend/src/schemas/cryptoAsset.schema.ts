import { z } from 'zod';
import { CryptoAssetCode } from '@prisma/client';

export const cryptoAssetCodeParamsSchema = z.object({
  code: z.nativeEnum(CryptoAssetCode, {
    errorMap: () => ({ message: 'A valid crypto asset (USDT, BTC, or ETH) is required.' }),
  }),
});

export const updateCryptoAssetBodySchema = z.object({
  address: z.string().trim().min(1).max(200).optional().nullable(),
  isEnabled: z.boolean(),
});
