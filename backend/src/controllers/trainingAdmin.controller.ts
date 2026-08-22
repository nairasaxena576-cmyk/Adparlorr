import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';
import * as adminService from '../services/trainingAdmin.service';
import * as assessmentService from '../services/trainingAssessment.service';

// ---- Courses ----

export const getCourses = asyncHandler(async (_req: Request, res: Response) => {
  const courses = await adminService.listCoursesForAdmin();
  ok(res, { courses });
});

export const postCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await adminService.createCourseForAdmin(req.body);
  created(res, { course });
});

export const getCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const course = await adminService.getCourseForAdmin(id);
  ok(res, { course });
});

export const putCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const course = await adminService.updateCourseForAdmin(id, req.body);
  ok(res, { course });
});

export const deleteCourseHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await adminService.deleteCourseForAdmin(id);
  ok(res, {});
});

// ---- Chapters ----

export const postChapter = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params as { courseId: string };
  const chapter = await adminService.createChapterForAdmin(courseId, req.body);
  created(res, { chapter });
});

export const putChapter = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const chapter = await adminService.updateChapterForAdmin(id, req.body);
  ok(res, { chapter });
});

export const deleteChapterHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await adminService.deleteChapterForAdmin(id);
  ok(res, {});
});

export const postReorderChapter = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { direction } = req.body as { direction: 'up' | 'down' };
  const chapter = await adminService.reorderChapterForAdmin(id, direction);
  ok(res, { chapter });
});

// ---- Lessons ----

export const postLesson = asyncHandler(async (req: Request, res: Response) => {
  const { chapterId } = req.params as { chapterId: string };
  const lesson = await adminService.createLessonForAdmin(chapterId, req.body);
  created(res, { lesson });
});

export const putLesson = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const lesson = await adminService.updateLessonForAdmin(id, req.body);
  ok(res, { lesson });
});

export const deleteLessonHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await adminService.deleteLessonForAdmin(id);
  ok(res, {});
});

export const postReorderLesson = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { direction } = req.body as { direction: 'up' | 'down' };
  const lesson = await adminService.reorderLessonForAdmin(id, direction);
  ok(res, { lesson });
});

// ---- Assessment / questions ----

export const getAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params as { courseId: string };
  const assessment = await assessmentService.getAssessmentForAdmin(courseId);
  ok(res, { assessment });
});

export const putAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params as { courseId: string };
  const assessment = await assessmentService.updateAssessmentForAdmin(courseId, req.body);
  ok(res, { assessment });
});

export const postQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { assessmentId } = req.params as { assessmentId: string };
  const question = await assessmentService.createQuestionForAdmin(assessmentId, req.body);
  created(res, { question });
});

export const putQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const question = await assessmentService.updateQuestionForAdmin(id, req.body);
  ok(res, { question });
});

export const deleteQuestionHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await assessmentService.deleteQuestionForAdmin(id);
  ok(res, {});
});

export const postReorderQuestion = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { direction } = req.body as { direction: 'up' | 'down' };
  const question = await assessmentService.reorderQuestionForAdmin(id, direction);
  ok(res, { question });
});

// ---- Reset progress ----

export const postResetProgress = asyncHandler(async (req: Request, res: Response) => {
  const { courseId } = req.params as { courseId: string };
  const { userId } = req.body as { userId?: string };
  const result = await adminService.resetProgressForAdmin(courseId, userId);
  ok(res, result);
});
