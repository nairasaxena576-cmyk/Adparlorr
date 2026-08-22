import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import * as ctrl from '../controllers/trainingAdmin.controller';
import {
  courseIdParamsSchema,
  chapterIdParamsSchema,
  lessonIdParamsSchema,
  questionIdParamsSchema,
  courseIdParamOnlySchema,
  chapterIdParamOnlySchema,
  assessmentIdParamOnlySchema,
  createCourseSchema,
  updateCourseSchema,
  createChapterSchema,
  updateChapterSchema,
  createLessonSchema,
  updateLessonSchema,
  reorderBodySchema,
  updateAssessmentSchema,
  createQuestionSchema,
  updateQuestionSchema,
  resetProgressBodySchema,
} from '../schemas/trainingAdmin.schema';

export const trainingAdminRouter = Router();

trainingAdminRouter.use(requireAuth, requireRole('ADMIN'));

// Courses
trainingAdminRouter.get('/courses', ctrl.getCourses);
trainingAdminRouter.post('/courses', verifyCsrf, validate({ body: createCourseSchema }), ctrl.postCourse);
trainingAdminRouter.get('/courses/:id', validate({ params: courseIdParamsSchema }), ctrl.getCourse);
trainingAdminRouter.put(
  '/courses/:id',
  verifyCsrf,
  validate({ params: courseIdParamsSchema, body: updateCourseSchema }),
  ctrl.putCourse
);
trainingAdminRouter.delete(
  '/courses/:id',
  verifyCsrf,
  validate({ params: courseIdParamsSchema }),
  ctrl.deleteCourseHandler
);

// Chapters
trainingAdminRouter.post(
  '/courses/:courseId/chapters',
  verifyCsrf,
  validate({ params: courseIdParamOnlySchema, body: createChapterSchema }),
  ctrl.postChapter
);
trainingAdminRouter.put(
  '/chapters/:id',
  verifyCsrf,
  validate({ params: chapterIdParamsSchema, body: updateChapterSchema }),
  ctrl.putChapter
);
trainingAdminRouter.delete(
  '/chapters/:id',
  verifyCsrf,
  validate({ params: chapterIdParamsSchema }),
  ctrl.deleteChapterHandler
);
trainingAdminRouter.post(
  '/chapters/:id/reorder',
  verifyCsrf,
  validate({ params: chapterIdParamsSchema, body: reorderBodySchema }),
  ctrl.postReorderChapter
);

// Lessons
trainingAdminRouter.post(
  '/chapters/:chapterId/lessons',
  verifyCsrf,
  validate({ params: chapterIdParamOnlySchema, body: createLessonSchema }),
  ctrl.postLesson
);
trainingAdminRouter.put(
  '/lessons/:id',
  verifyCsrf,
  validate({ params: lessonIdParamsSchema, body: updateLessonSchema }),
  ctrl.putLesson
);
trainingAdminRouter.delete(
  '/lessons/:id',
  verifyCsrf,
  validate({ params: lessonIdParamsSchema }),
  ctrl.deleteLessonHandler
);
trainingAdminRouter.post(
  '/lessons/:id/reorder',
  verifyCsrf,
  validate({ params: lessonIdParamsSchema, body: reorderBodySchema }),
  ctrl.postReorderLesson
);

// Assessment / questions
trainingAdminRouter.get(
  '/courses/:courseId/assessment',
  validate({ params: courseIdParamOnlySchema }),
  ctrl.getAssessment
);
trainingAdminRouter.put(
  '/courses/:courseId/assessment',
  verifyCsrf,
  validate({ params: courseIdParamOnlySchema, body: updateAssessmentSchema }),
  ctrl.putAssessment
);
trainingAdminRouter.post(
  '/assessments/:assessmentId/questions',
  verifyCsrf,
  validate({ params: assessmentIdParamOnlySchema, body: createQuestionSchema }),
  ctrl.postQuestion
);
trainingAdminRouter.put(
  '/questions/:id',
  verifyCsrf,
  validate({ params: questionIdParamsSchema, body: updateQuestionSchema }),
  ctrl.putQuestion
);
trainingAdminRouter.delete(
  '/questions/:id',
  verifyCsrf,
  validate({ params: questionIdParamsSchema }),
  ctrl.deleteQuestionHandler
);
trainingAdminRouter.post(
  '/questions/:id/reorder',
  verifyCsrf,
  validate({ params: questionIdParamsSchema, body: reorderBodySchema }),
  ctrl.postReorderQuestion
);

// Reset progress
trainingAdminRouter.post(
  '/courses/:courseId/reset-progress',
  verifyCsrf,
  validate({ params: courseIdParamOnlySchema, body: resetProgressBodySchema }),
  ctrl.postResetProgress
);
