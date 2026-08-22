import { z } from 'zod';

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const courseIdParamsSchema = z.object({
  id: z.string().uuid('A valid course id is required.'),
});

export const chapterIdParamsSchema = z.object({
  id: z.string().uuid('A valid chapter id is required.'),
});

export const lessonIdParamsSchema = z.object({
  id: z.string().uuid('A valid lesson id is required.'),
});

export const questionIdParamsSchema = z.object({
  id: z.string().uuid('A valid question id is required.'),
});

export const courseIdParamOnlySchema = z.object({
  courseId: z.string().uuid('A valid course id is required.'),
});

export const chapterIdParamOnlySchema = z.object({
  chapterId: z.string().uuid('A valid chapter id is required.'),
});

export const assessmentIdParamOnlySchema = z.object({
  assessmentId: z.string().uuid('A valid assessment id is required.'),
});

export const createCourseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Slug is required.')
    .max(120)
    .regex(SLUG_REGEX, 'Slug must be lowercase letters, numbers, and hyphens only.'),
  description: z.string().trim().max(2000).optional().nullable(),
  thumbnailUrl: z.string().trim().url('Thumbnail must be a valid URL.').max(500).optional().nullable(),
  isPublished: z.boolean().optional().default(false),
  isRequired: z.boolean().optional().default(false),
  order: z.coerce.number().int().min(0).optional().default(0),
});

export const updateCourseSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(120)
    .regex(SLUG_REGEX, 'Slug must be lowercase letters, numbers, and hyphens only.')
    .optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  thumbnailUrl: z.string().trim().url('Thumbnail must be a valid URL.').max(500).optional().nullable(),
  isPublished: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  order: z.coerce.number().int().min(0).optional(),
});

export const createChapterSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  order: z.coerce.number().int().min(0).optional().default(0),
  isPublished: z.boolean().optional().default(false),
});

export const updateChapterSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  order: z.coerce.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

export const createLessonSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(200),
  content: z.string().trim().min(1, 'Content is required.'),
  videoUrl: z.string().trim().url('Video must be a valid URL.').max(500).optional().nullable(),
  order: z.coerce.number().int().min(0).optional().default(0),
  isPublished: z.boolean().optional().default(false),
});

export const updateLessonSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().min(1).optional(),
  videoUrl: z.string().trim().url('Video must be a valid URL.').max(500).optional().nullable(),
  order: z.coerce.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

export const reorderBodySchema = z.object({
  direction: z.enum(['up', 'down']),
});

export const updateAssessmentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  passingScore: z.coerce.number().int().min(0).max(100).optional(),
  isPublished: z.boolean().optional(),
});

const answerInputSchema = z.object({
  answer: z.string().trim().min(1, 'Answer text is required.').max(500),
  isCorrect: z.boolean().optional().default(false),
  order: z.coerce.number().int().min(0).optional().default(0),
});

function validateAnswers(answers: z.infer<typeof answerInputSchema>[], ctx: z.RefinementCtx) {
  if (answers.length < 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least two answers are required.', path: ['answers'] });
  }
  if (!answers.some((a) => a.isCorrect)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one answer must be marked correct.',
      path: ['answers'],
    });
  }
}

export const createQuestionSchema = z
  .object({
    question: z.string().trim().min(1, 'Question text is required.').max(1000),
    points: z.coerce.number().int().min(1).max(100).optional().default(1),
    order: z.coerce.number().int().min(0).optional().default(0),
    answers: z.array(answerInputSchema),
  })
  .superRefine((data, ctx) => validateAnswers(data.answers, ctx));

export const updateQuestionSchema = z
  .object({
    question: z.string().trim().min(1).max(1000).optional(),
    points: z.coerce.number().int().min(1).max(100).optional(),
    order: z.coerce.number().int().min(0).optional(),
    answers: z.array(answerInputSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.answers) validateAnswers(data.answers, ctx);
  });

export const resetProgressBodySchema = z.object({
  userId: z.string().uuid().optional(),
});
