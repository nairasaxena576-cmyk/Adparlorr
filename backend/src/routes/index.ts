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

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/wallet', walletRouter);
apiRouter.use('/referrals', referralRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/admin/training', trainingAdminRouter);
apiRouter.use('/support', supportRouter);
apiRouter.use('/training', trainingRouter);
