import { z } from 'zod';

export const submitOrderSchema = z.object({
  productId: z.string().uuid('A valid productId is required.'),
});
