import { z } from 'zod';

export const taskIdParamsSchema = z.object({
  id: z.string().uuid('A valid task id is required.'),
});

export const submitTaskAnswerSchema = z.object({
  answer: z.string().trim().min(1, 'An answer is required.').max(300),
});
