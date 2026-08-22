import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { getSupportSettings } from '../services/supportSettings.service';

export const getTelegramConfig = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getSupportSettings();
  ok(res, settings);
});
