import { z } from 'zod';
import { TrainingTaskSubmissionStatus } from '@prisma/client';

export const taskIdParamsSchema = z.object({
  id: z.string().uuid('A valid task id is required.'),
});

export const submissionIdParamsSchema = z.object({
  id: z.string().uuid('A valid submission id is required.'),
});

export const createTaskSchema = z.object({
  productName: z.string().trim().min(1, 'Product name is required.').max(200),
  imageUrl: z.string().trim().url('Image must be a valid URL — upload an image first.').max(500),
  instruction: z.string().trim().min(1, 'Instruction is required.').max(2000),
  isPublished: z.boolean().optional().default(false),
  isRequired: z.boolean().optional().default(true),
  order: z.coerce.number().int().min(0).optional().default(0),
});

export const updateTaskSchema = z.object({
  productName: z.string().trim().min(1).max(200).optional(),
  imageUrl: z.string().trim().url('Image must be a valid URL — upload an image first.').max(500).optional(),
  instruction: z.string().trim().min(1).max(2000).optional(),
  isPublished: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  order: z.coerce.number().int().min(0).optional(),
});

export const reorderBodySchema = z.object({
  direction: z.enum(['up', 'down']),
});

export const listSubmissionsQuerySchema = z.object({
  status: z.nativeEnum(TrainingTaskSubmissionStatus).optional(),
});

export const rejectSubmissionBodySchema = z.object({
  rejectionReason: z.string().trim().min(1, 'A rejection reason is required.').max(500),
});
