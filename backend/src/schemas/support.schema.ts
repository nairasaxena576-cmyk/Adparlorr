import { z } from 'zod';

export const sendSupportMessageSchema = z.object({
  text: z.string().trim().min(1, 'Message cannot be empty.').max(2000, 'Message is too long.'),
});

export const supportUserIdParamsSchema = z.object({
  userId: z.string().uuid('A valid userId is required.'),
});
