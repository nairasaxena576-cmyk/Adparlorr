import { z } from 'zod';
import { DepositStatus } from '@prisma/client';

export const depositIdParamsSchema = z.object({
  id: z.string().uuid('A valid deposit id is required.'),
});

export const listDepositsQuerySchema = z.object({
  status: z.nativeEnum(DepositStatus).optional(),
});
