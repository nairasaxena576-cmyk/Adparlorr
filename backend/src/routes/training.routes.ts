import { Router } from 'express';
import {
  getCourses,
  getCourseDetail,
  getLesson,
  postCompleteLesson,
  getAssessment,
  postSubmitAssessment,
} from '../controllers/training.controller';
import { requireAuth } from '../middleware/requireAuth';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import { courseIdParamsSchema, lessonIdParamsSchema, submitAssessmentSchema } from '../schemas/training.schema';

export const trainingRouter = Router();

trainingRouter.use(requireAuth);

trainingRouter.get('/courses', getCourses);
trainingRouter.get('/courses/:id', validate({ params: courseIdParamsSchema }), getCourseDetail);
trainingRouter.get('/lessons/:id', validate({ params: lessonIdParamsSchema }), getLesson);
trainingRouter.post(
  '/lessons/:id/complete',
  verifyCsrf,
  validate({ params: lessonIdParamsSchema }),
  postCompleteLesson
);
trainingRouter.get('/courses/:id/assessment', validate({ params: courseIdParamsSchema }), getAssessment);
trainingRouter.post(
  '/courses/:id/assessment/submit',
  verifyCsrf,
  validate({ params: courseIdParamsSchema, body: submitAssessmentSchema }),
  postSubmitAssessment
);
