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

export const referralIdParamsSchema = z.object({
  referralId: z.string().uuid('A valid referralId is required.'),
});

export const resolveNegativeBalanceParamsSchema = z.object({
  userId: z.string().uuid('A valid userId is required.'),
});

export const grantTierParamsSchema = z.object({
  userId: z.string().uuid('A valid userId is required.'),
});

export const grantTierBodySchema = z.object({
  tier: z.enum(['Silver', 'Gold', 'Platinum']),
});
