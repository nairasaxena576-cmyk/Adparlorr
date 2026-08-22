import { z } from 'zod';

export const creditUserParamsSchema = z.object({
  userId: z.string().uuid('A valid userId is required.'),
});

export const creditUserBodySchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero.').max(1_000_000),
});

export const resetUserParamsSchema = z.object({
  userId: z.string().uuid('A valid userId is required.'),
});
