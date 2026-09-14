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

export const setTestBalancesParamsSchema = z.object({
  userId: z.string().uuid('A valid userId is required.'),
});

// Deliberately allows any finite number, including negative — this is a
// distinct, explicitly-named QA/test action (see admin.service.ts's
// setUserTestBalances), not the real-credit endpoint above, whose
// .positive() constraint stays untouched for every normal admin credit.
export const setTestBalancesBodySchema = z
  .object({
    balance: z.coerce.number().finite().optional(),
    frozenBalance: z.coerce.number().finite().optional(),
  })
  .refine((data) => data.balance !== undefined || data.frozenBalance !== undefined, {
    message: 'At least one of balance or frozenBalance must be provided.',
  });

export const setTestWorkbenchProgressParamsSchema = z.object({
  userId: z.string().uuid('A valid userId is required.'),
});

// DISPLAY-only override for the Starting page's progress fraction — see
// admin.service.ts's setUserTestWorkbenchProgress. `null` for both clears
// the override back to the real completedOrders-driven progress; setting
// one requires setting both together, so the fraction shown is never a
// half-set, inconsistent pair.
export const setTestWorkbenchProgressBodySchema = z.object({
  completed: z.union([z.coerce.number().int().nonnegative(), z.null()]),
  total: z.union([z.coerce.number().int().positive(), z.null()]),
}).refine((data) => (data.completed === null) === (data.total === null), {
  message: 'completed and total must both be null (clear) or both be numbers (set) together.',
});
