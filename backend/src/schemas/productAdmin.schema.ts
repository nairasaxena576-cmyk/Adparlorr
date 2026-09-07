import { z } from 'zod';

export const productIdParamsSchema = z.object({
  id: z.string().uuid('A valid product id is required.'),
});

// Which tier's workbench band this product belongs to — null/omitted means
// Bronze (see schema.prisma's Product.tierEligibility doc comment).
const tierEligibilitySchema = z.enum(['Bronze', 'Silver', 'Gold', 'Platinum']).nullable();

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required.').max(200),
  category: z.string().trim().min(1, 'Category is required.').max(100),
  reward: z.coerce.number().positive('Reward must be greater than 0.').max(100_000),
  cost: z.coerce.number().nonnegative('Fee cannot be negative.').max(100_000),
  // Workbench product value — commission = price * 1% (normal) or * 10%
  // (merged). Independent of reward/cost above. Defaults to 0, meaning the
  // product won't appear in the customer workbench until priced.
  price: z.coerce.number().nonnegative('Price cannot be negative.').max(1_000_000).optional().default(0),
  tierEligibility: tierEligibilitySchema.optional(),
  imageUrl: z.string().trim().url('Image must be a valid URL — upload an image first.').max(500).optional().nullable(),
  isActive: z.boolean().optional().default(false),
  displayOrder: z.coerce.number().int().positive().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  reward: z.coerce.number().positive('Reward must be greater than 0.').max(100_000).optional(),
  cost: z.coerce.number().nonnegative('Fee cannot be negative.').max(100_000).optional(),
  price: z.coerce.number().nonnegative('Price cannot be negative.').max(1_000_000).optional(),
  tierEligibility: tierEligibilitySchema.optional(),
  imageUrl: z.string().trim().url('Image must be a valid URL — upload an image first.').max(500).optional().nullable(),
  isActive: z.boolean().optional(),
  displayOrder: z.coerce.number().int().positive().optional(),
});

export const reorderBodySchema = z.object({
  direction: z.enum(['up', 'down']),
});
