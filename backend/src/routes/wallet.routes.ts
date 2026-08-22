import { Router } from 'express';
import { getMyTransactions, getCryptoAssets, postDeposit, postWithdraw } from '../controllers/wallet.controller';
import { requireAuth } from '../middleware/requireAuth';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import { depositSchema } from '../schemas/wallet.schema';

export const walletRouter = Router();

walletRouter.get('/transactions', requireAuth, getMyTransactions);
walletRouter.get('/crypto-assets', requireAuth, getCryptoAssets);
walletRouter.post('/deposit', requireAuth, verifyCsrf, validate({ body: depositSchema }), postDeposit);
walletRouter.post('/withdraw', requireAuth, verifyCsrf, postWithdraw);
