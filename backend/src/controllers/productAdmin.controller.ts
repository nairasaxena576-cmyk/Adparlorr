import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, created } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';
import * as adminService from '../services/productAdmin.service';

export const getProducts = asyncHandler(async (_req: Request, res: Response) => {
  const [products, workbenchReadiness] = await Promise.all([
    adminService.listProductsForAdmin(),
    adminService.getWorkbenchReadinessForAdmin(),
  ]);
  ok(res, { products, workbenchReadiness });
});

export const postProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await adminService.createProductForAdmin(req.body);
  created(res, { product });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const product = await adminService.getProductForAdmin(id);
  ok(res, { product });
});

export const putProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const product = await adminService.updateProductForAdmin(id, req.body);
  ok(res, { product });
});

export const deleteProductHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await adminService.deleteProductForAdmin(id);
  ok(res, {});
});

export const postReorderProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { direction } = req.body as { direction: 'up' | 'down' };
  const product = await adminService.reorderProductForAdmin(id, direction);
  ok(res, { product });
});

export const postUploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw AppError.badRequest('No image file was provided.');
  const result = await adminService.uploadProductImageForAdmin(req.file);
  created(res, result);
});
