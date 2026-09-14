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
  getTrainingOverview,
  postConfirmTrainingFunding,
  postResolveNegativeBalance,
  postGrantTier,
  postSetTestBalances,
  postSetTestWorkbenchProgress,
  postSetTestFlags,
} from '../controllers/admin.controller';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { verifyCsrf } from '../middleware/csrf';
import { validate } from '../middleware/validate';
import {
  creditUserBodySchema,
  creditUserParamsSchema,
  resetUserParamsSchema,
  referralIdParamsSchema,
  resolveNegativeBalanceParamsSchema,
  grantTierParamsSchema,
  grantTierBodySchema,
  setTestBalancesParamsSchema,
  setTestBalancesBodySchema,
  setTestWorkbenchProgressParamsSchema,
  setTestWorkbenchProgressBodySchema,
  setTestFlagsParamsSchema,
  setTestFlagsBodySchema,
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

// Training/referral workflow — minimum-necessary admin visibility + the two
// admin-only financial actions the new workflow needs (item 17).
adminRouter.get('/training-overview', getTrainingOverview);
adminRouter.post(
  '/referrals/:referralId/confirm-funding',
  verifyCsrf,
  validate({ params: referralIdParamsSchema }),
  postConfirmTrainingFunding
);
adminRouter.post(
  '/users/:userId/resolve-negative-balance',
  verifyCsrf,
  validate({ params: resolveNegativeBalanceParamsSchema }),
  postResolveNegativeBalance
);
adminRouter.post(
  '/users/:userId/grant-tier',
  verifyCsrf,
  validate({ params: grantTierParamsSchema, body: grantTierBodySchema }),
  postGrantTier
);
// QA/test-only balance override (see admin.service.ts's setUserTestBalances)
// — a distinct action from /credit above, which stays positive-amount-only
// for real credits.
adminRouter.post(
  '/users/:userId/set-test-balances',
  verifyCsrf,
  validate({ params: setTestBalancesParamsSchema, body: setTestBalancesBodySchema }),
  postSetTestBalances
);
// QA/test-only Starting-page progress display override (see
// admin.service.ts's setUserTestWorkbenchProgress) — never touches real
// completedOrders or Workbench gating.
adminRouter.post(
  '/users/:userId/set-test-progress',
  verifyCsrf,
  validate({ params: setTestWorkbenchProgressParamsSchema, body: setTestWorkbenchProgressBodySchema }),
  postSetTestWorkbenchProgress
);
// QA/test-only boolean overrides (see admin.service.ts's setUserTestFlags)
// — training-gate bypass for Deposit access, and the deposit-required gate
// on the last Workbench task. Both isolated to whichever userId is given.
adminRouter.post(
  '/users/:userId/set-test-flags',
  verifyCsrf,
  validate({ params: setTestFlagsParamsSchema, body: setTestFlagsBodySchema }),
  postSetTestFlags
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
