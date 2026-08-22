import { z } from 'zod';

export const courseIdParamsSchema = z.object({
  id: z.string().uuid('A valid course id is required.'),
});

export const lessonIdParamsSchema = z.object({
  id: z.string().uuid('A valid lesson id is required.'),
});

export const submitAssessmentSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        answerId: z.string().uuid(),
      })
    )
    .min(1, 'At least one answer is required.'),
});
