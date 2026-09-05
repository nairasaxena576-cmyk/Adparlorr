import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import { uploadImageFile } from '../middleware/upload';
import * as ctrl from '../controllers/trainingTaskAdmin.controller';
import {
  taskIdParamsSchema,
  submissionIdParamsSchema,
  createTaskSchema,
  updateTaskSchema,
  reorderBodySchema,
  listSubmissionsQuerySchema,
  rejectSubmissionBodySchema,
} from '../schemas/trainingTaskAdmin.schema';

// Mounted at /api/admin/training alongside the legacy course-based
// trainingAdminRouter (see routes/index.ts) — subpaths here
// (tasks/submissions) don't collide with the legacy ones
// (courses/chapters/lessons/assessments/questions), so both stay mounted.
//
// postUploadImage below uploads to Supabase Storage (see lib/supabaseStorage.ts)
// via the shared uploadImageFile multer middleware — the same upload path
// productAdmin.routes.ts uses for product images, just a different storage
// prefix. The DB only ever stores the resulting URL string, never raw bytes.
export const trainingTaskAdminRouter = Router();

trainingTaskAdminRouter.use(requireAuth, requireRole('ADMIN'));

// Tasks
trainingTaskAdminRouter.get('/tasks', ctrl.getTasks);
trainingTaskAdminRouter.post('/tasks', verifyCsrf, validate({ body: createTaskSchema }), ctrl.postTask);
trainingTaskAdminRouter.get('/tasks/:id', validate({ params: taskIdParamsSchema }), ctrl.getTask);
trainingTaskAdminRouter.put(
  '/tasks/:id',
  verifyCsrf,
  validate({ params: taskIdParamsSchema, body: updateTaskSchema }),
  ctrl.putTask
);
trainingTaskAdminRouter.delete(
  '/tasks/:id',
  verifyCsrf,
  validate({ params: taskIdParamsSchema }),
  ctrl.deleteTaskHandler
);
trainingTaskAdminRouter.post(
  '/tasks/:id/reorder',
  verifyCsrf,
  validate({ params: taskIdParamsSchema, body: reorderBodySchema }),
  ctrl.postReorderTask
);

// Image upload (multipart) — CSRF still applies (header check, independent
// of body parsing), matching every other mutating admin route.
trainingTaskAdminRouter.post('/tasks/upload-image', verifyCsrf, uploadImageFile, ctrl.postUploadImage);

// Submissions
trainingTaskAdminRouter.get(
  '/submissions',
  validate({ query: listSubmissionsQuerySchema }),
  ctrl.getSubmissions
);
trainingTaskAdminRouter.get(
  '/submissions/:id',
  validate({ params: submissionIdParamsSchema }),
  ctrl.getSubmission
);
trainingTaskAdminRouter.post(
  '/submissions/:id/approve',
  verifyCsrf,
  validate({ params: submissionIdParamsSchema }),
  ctrl.postApproveSubmission
);
trainingTaskAdminRouter.post(
  '/submissions/:id/reject',
  verifyCsrf,
  validate({ params: submissionIdParamsSchema, body: rejectSubmissionBodySchema }),
  ctrl.postRejectSubmission
);
