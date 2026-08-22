import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import {
  listPublishedCoursesForCustomer,
  getCourseDetailForCustomer,
  getLessonForCustomer,
  completeLessonForCustomer,
} from '../services/trainingCatalog.service';
import { getAssessmentForCustomer, submitAssessmentForCustomer } from '../services/trainingAssessment.service';

export const getCourses = asyncHandler(async (req: Request, res: Response) => {
  const courses = await listPublishedCoursesForCustomer(req.user!.id);
  ok(res, { courses });
});

export const getCourseDetail = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const course = await getCourseDetailForCustomer(id, req.user!.id);
  ok(res, { course });
});

export const getLesson = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const lesson = await getLessonForCustomer(id, req.user!.id);
  ok(res, { lesson });
});

export const postCompleteLesson = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await completeLessonForCustomer(id, req.user!.id);
  ok(res, result);
});

export const getAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const assessment = await getAssessmentForCustomer(id);
  ok(res, { assessment });
});

export const postSubmitAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await submitAssessmentForCustomer(req.user!.id, id, req.body);
  ok(res, result);
});
