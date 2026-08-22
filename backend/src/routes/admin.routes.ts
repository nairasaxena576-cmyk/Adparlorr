import { Router } from 'express';
import {
  getUsers,
  postCredit,
  postReset,
  getAdminSupportSettings,
  putAdminSupportSettings,
  getAdminCryptoAssets,
  putAdminCryptoAsset,
  getAdminDeposits,
  postApproveDeposit,
  postRejectDeposit,
} from '../controllers/admin.controller';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import {
  creditUserBodySchema,
  creditUserParamsSchema,
  resetUserParamsSchema,
} from '../schemas/admin.schema';
import { updateSupportSettingsSchema } from '../schemas/supportSettings.schema';
import { cryptoAssetCodeParamsSchema, updateCryptoAssetBodySchema } from '../schemas/cryptoAsset.schema';
import { depositIdParamsSchema, listDepositsQuerySchema } from '../schemas/deposit.schema';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/users', getUsers);
adminRouter.post(
  '/users/:userId/credit',
  verifyCsrf,
  validate({ params: creditUserParamsSchema, body: creditUserBodySchema }),
  postCredit
);
adminRouter.post(
  '/users/:userId/reset',
  verifyCsrf,
  validate({ params: resetUserParamsSchema }),
  postReset
);

adminRouter.get('/support-settings', getAdminSupportSettings);
adminRouter.put(
  '/support-settings',
  verifyCsrf,
  validate({ body: updateSupportSettingsSchema }),
  putAdminSupportSettings
);

adminRouter.get('/crypto-assets', getAdminCryptoAssets);
adminRouter.put(
  '/crypto-assets/:code',
  verifyCsrf,
  validate({ params: cryptoAssetCodeParamsSchema, body: updateCryptoAssetBodySchema }),
  putAdminCryptoAsset
);

adminRouter.get('/deposits', validate({ query: listDepositsQuerySchema }), getAdminDeposits);
adminRouter.post(
  '/deposits/:id/approve',
  verifyCsrf,
  validate({ params: depositIdParamsSchema }),
  postApproveDeposit
);
adminRouter.post(
  '/deposits/:id/reject',
  verifyCsrf,
  validate({ params: depositIdParamsSchema }),
  postRejectDeposit
);
