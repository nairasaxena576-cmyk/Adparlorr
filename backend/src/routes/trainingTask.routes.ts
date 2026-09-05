import { Router } from 'express';
import { getTasks, getTask, getProgress, postSubmitTask } from '../controllers/trainingTask.controller';
import { requireAuth } from '../middleware/requireAuth';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import { taskIdParamsSchema, submitTaskAnswerSchema } from '../schemas/trainingTask.schema';

// Mounted at /api/training alongside the legacy course-based trainingRouter
// (see routes/index.ts) — subpaths here (tasks/progress) don't collide with
// the legacy ones (courses/lessons), so both can stay mounted at once.
export const trainingTaskRouter = Router();

trainingTaskRouter.use(requireAuth);

trainingTaskRouter.get('/tasks', getTasks);
trainingTaskRouter.get('/tasks/:id', validate({ params: taskIdParamsSchema }), getTask);
trainingTaskRouter.post(
  '/tasks/:id/submit',
  verifyCsrf,
  validate({ params: taskIdParamsSchema, body: submitTaskAnswerSchema }),
  postSubmitTask
);
trainingTaskRouter.get('/progress', getProgress);
