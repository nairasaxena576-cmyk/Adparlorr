import { Router } from 'express';
import { authRouter } from './auth.routes';
import { productsRouter } from './products.routes';
import { ordersRouter } from './orders.routes';
import { walletRouter } from './wallet.routes';
import { referralRouter } from './referral.routes';
import { adminRouter } from './admin.routes';
import { supportRouter } from './support.routes';
import { trainingRouter } from './training.routes';
import { trainingAdminRouter } from './trainingAdmin.routes';
import { trainingTaskRouter } from './trainingTask.routes';
import { trainingTaskAdminRouter } from './trainingTaskAdmin.routes';
import { productAdminRouter } from './productAdmin.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/admin/products', productAdminRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/wallet', walletRouter);
apiRouter.use('/referrals', referralRouter);
apiRouter.use('/admin', adminRouter);
// Legacy course-based training admin API (kept mounted, unused by the
// frontend) alongside the current task-based one — see trainingTaskAdmin.routes.ts.
apiRouter.use('/admin/training', trainingAdminRouter);
apiRouter.use('/admin/training', trainingTaskAdminRouter);
apiRouter.use('/support', supportRouter);
// Same pattern for the customer-facing training API.
apiRouter.use('/training', trainingRouter);
apiRouter.use('/training', trainingTaskRouter);
