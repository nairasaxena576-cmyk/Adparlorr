import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import { uploadImageFile } from '../middleware/upload';
import * as ctrl from '../controllers/productAdmin.controller';
import {
  productIdParamsSchema,
  createProductSchema,
  updateProductSchema,
  reorderBodySchema,
} from '../schemas/productAdmin.schema';

// Mounted at /api/admin/products — separate from the customer-facing
// GET /api/products (products.routes.ts), which stays untouched and keeps
// returning only isActive products with no admin-only fields.
export const productAdminRouter = Router();

productAdminRouter.use(requireAuth, requireRole('ADMIN'));

productAdminRouter.get('/', ctrl.getProducts);
productAdminRouter.post('/', verifyCsrf, validate({ body: createProductSchema }), ctrl.postProduct);
productAdminRouter.get('/:id', validate({ params: productIdParamsSchema }), ctrl.getProduct);
productAdminRouter.put(
  '/:id',
  verifyCsrf,
  validate({ params: productIdParamsSchema, body: updateProductSchema }),
  ctrl.putProduct
);
productAdminRouter.delete(
  '/:id',
  verifyCsrf,
  validate({ params: productIdParamsSchema }),
  ctrl.deleteProductHandler
);
productAdminRouter.post(
  '/:id/reorder',
  verifyCsrf,
  validate({ params: productIdParamsSchema, body: reorderBodySchema }),
  ctrl.postReorderProduct
);

// Image upload (multipart) — CSRF still applies (header check, independent
// of body parsing), matching every other mutating admin route.
productAdminRouter.post('/upload-image', verifyCsrf, uploadImageFile, ctrl.postUploadImage);
