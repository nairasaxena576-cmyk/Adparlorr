import type { Request, Response } from 'express';
import type { CryptoAssetCode, DepositStatus } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { listUsersForAdmin, creditUserSimulated, resetUserTasksAdmin } from '../services/admin.service';
import { getSupportSettings, updateSupportSettings } from '../services/supportSettings.service';
import { listAssetsForAdmin, updateCryptoAsset } from '../services/cryptoAsset.service';
import { listDepositsForAdmin, approveDeposit, rejectDeposit } from '../services/deposit.service';
import { SIMULATION } from '../config/simulation';

const simulationMeta = { simulation: true, disclaimer: SIMULATION.DISCLAIMER };

export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await listUsersForAdmin();
  ok(res, { users });
});

export const postCredit = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const { amount } = req.body as { amount: number };
  const user = await creditUserSimulated(userId, amount);
  ok(res, { user }, 200, simulationMeta);
});

export const postReset = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params as { userId: string };
  const user = await resetUserTasksAdmin(userId);
  ok(res, { user });
});

export const getAdminSupportSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getSupportSettings();
  ok(res, settings);
});

export const putAdminSupportSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await updateSupportSettings(req.body);
  ok(res, settings);
});

export const getAdminCryptoAssets = asyncHandler(async (_req: Request, res: Response) => {
  const assets = await listAssetsForAdmin();
  ok(res, { assets });
});

export const putAdminCryptoAsset = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params as { code: CryptoAssetCode };
  const asset = await updateCryptoAsset(code, req.body);
  ok(res, { asset });
});

export const getAdminDeposits = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query as { status?: DepositStatus };
  const deposits = await listDepositsForAdmin(status);
  ok(res, { deposits });
});

export const postApproveDeposit = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const deposit = await approveDeposit(id, req.user!.id);
  ok(res, { deposit }, 200, simulationMeta);
});

export const postRejectDeposit = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const deposit = await rejectDeposit(id, req.user!.id);
  ok(res, { deposit });
});
