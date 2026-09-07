import { Router } from 'express';
import { getMyOrders, getWorkbench, postOrder } from '../controllers/orders.controller';
import { requireAuth } from '../middleware/requireAuth';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import { submitOrderSchema } from '../schemas/orders.schema';

export const ordersRouter = Router();

ordersRouter.get('/', requireAuth, getMyOrders);
ordersRouter.get('/workbench', requireAuth, getWorkbench);
ordersRouter.post('/', requireAuth, verifyCsrf, validate({ body: submitOrderSchema }), postOrder);
