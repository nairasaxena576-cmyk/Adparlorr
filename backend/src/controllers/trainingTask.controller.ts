import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import {
  listTasksForCustomer,
  getTaskForCustomer,
  getProgressForCustomer,
  submitTaskAnswerForCustomer,
} from '../services/trainingTask.service';

export const getTasks = asyncHandler(async (req: Request, res: Response) => {
  const tasks = await listTasksForCustomer(req.user!.id);
  ok(res, { tasks });
});

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const task = await getTaskForCustomer(id, req.user!.id);
  ok(res, { task });
});

export const getProgress = asyncHandler(async (req: Request, res: Response) => {
  const progress = await getProgressForCustomer(req.user!.id);
  ok(res, progress);
});

export const postSubmitTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { answer } = req.body as { answer: string };
  const result = await submitTaskAnswerForCustomer(id, req.user!.id, answer);
  ok(res, result, 201);
});
