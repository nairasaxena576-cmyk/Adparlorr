import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { listProducts } from '../services/product.service';

export const getProducts = asyncHandler(async (_req: Request, res: Response) => {
  const products = await listProducts();
  ok(res, { products });
});
