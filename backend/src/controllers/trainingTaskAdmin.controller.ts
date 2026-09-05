import type { Request, Response } from 'express';
import type { TrainingTaskSubmissionStatus } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';
import * as adminService from '../services/trainingTaskAdmin.service';

// ---- Tasks ----

export const getTasks = asyncHandler(async (_req: Request, res: Response) => {
  const tasks = await adminService.listTasksForAdmin();
  ok(res, { tasks });
});

export const postTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await adminService.createTaskForAdmin(req.body);
  created(res, { task });
});

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const task = await adminService.getTaskForAdmin(id);
  ok(res, { task });
});

export const putTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const task = await adminService.updateTaskForAdmin(id, req.body);
  ok(res, { task });
});

export const deleteTaskHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await adminService.deleteTaskForAdmin(id);
  ok(res, {});
});

export const postReorderTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { direction } = req.body as { direction: 'up' | 'down' };
  const task = await adminService.reorderTaskForAdmin(id, direction);
  ok(res, { task });
});

// ---- Image upload ----

export const postUploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw AppError.badRequest('No image file was provided.');
  const result = await adminService.uploadTaskImageForAdmin(req.file);
  created(res, result);
});

// ---- Submissions ----

export const getSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query as { status?: TrainingTaskSubmissionStatus };
  const submissions = await adminService.listSubmissionsForAdminService(status);
  ok(res, { submissions });
});

export const getSubmission = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const submission = await adminService.getSubmissionForAdmin(id);
  ok(res, { submission });
});

export const postApproveSubmission = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await adminService.approveSubmissionForAdmin(id, req.user!.id);
  ok(res, result);
});

export const postRejectSubmission = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { rejectionReason } = req.body as { rejectionReason: string };
  const submission = await adminService.rejectSubmissionForAdmin(id, req.user!.id, rejectionReason);
  ok(res, { submission });
});
