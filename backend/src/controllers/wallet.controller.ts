import type { Request, Response } from 'express';
import type { CryptoAssetCode } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { listMyTransactions, requestSimulatedWithdrawal } from '../services/wallet.service';
import { createDepositRequest } from '../services/deposit.service';
import { listAssetsForCustomer } from '../services/cryptoAsset.service';
import { SIMULATION } from '../config/simulation';

const simulationMeta = { simulation: true, disclaimer: SIMULATION.DISCLAIMER };

export const getMyTransactions = asyncHandler(async (req: Request, res: Response) => {
  const transactions = await listMyTransactions(req.user!.id);
  ok(res, { transactions });
});

export const getCryptoAssets = asyncHandler(async (_req: Request, res: Response) => {
  const assets = await listAssetsForCustomer();
  ok(res, { assets });
});

export const postDeposit = asyncHandler(async (req: Request, res: Response) => {
  const { assetCode, amount } = req.body as { assetCode: CryptoAssetCode; amount: number };
  const result = await createDepositRequest(req.user!.id, { assetCode, amount });
  ok(res, result, 201, simulationMeta);
});

export const postWithdraw = asyncHandler(async (req: Request, res: Response) => {
  const result = await requestSimulatedWithdrawal(req.user!.id);
  ok(res, result, 200, simulationMeta);
});
