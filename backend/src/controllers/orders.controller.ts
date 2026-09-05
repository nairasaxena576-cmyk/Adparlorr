import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';
import { listMySubmissions, submitOrder, getWorkbenchState, resolveDemoShortfall } from '../services/order.service';

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const submissions = await listMySubmissions(req.user!.id);
  ok(res, { submissions });
});

export const getWorkbench = asyncHandler(async (req: Request, res: Response) => {
  const workbench = await getWorkbenchState(req.user!.id);
  ok(res, { workbench });
});

export const postOrder = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.body as { productId: string };
  const result = await submitOrder(req.user!.id, productId);
  created(res, result);
});

export const postResolveDemoShortfall = asyncHandler(async (req: Request, res: Response) => {
  const user = await resolveDemoShortfall(req.user!.id);
  const workbench = await getWorkbenchState(req.user!.id);
  ok(res, { user, workbench });
});
