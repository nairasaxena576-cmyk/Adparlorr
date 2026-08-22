import { Router } from 'express';
import { getProducts } from '../controllers/products.controller';
import { requireAuth } from '../middleware/requireAuth';

export const productsRouter = Router();

productsRouter.get('/', requireAuth, getProducts);
