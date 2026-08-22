import type { CryptoAssetCode, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export function listAllAssets(client: Client = prisma) {
  return client.cryptoAsset.findMany({ orderBy: { code: 'asc' } });
}

export function listEnabledAssets(client: Client = prisma) {
  return client.cryptoAsset.findMany({
    where: { isEnabled: true, address: { not: null } },
    orderBy: { code: 'asc' },
  });
}

export function findAssetByCode(code: CryptoAssetCode, client: Client = prisma) {
  return client.cryptoAsset.findUnique({ where: { code } });
}

export function updateAssetByCode(
  code: CryptoAssetCode,
  data: Prisma.CryptoAssetUpdateInput,
  client: Client = prisma
) {
  return client.cryptoAsset.update({ where: { code }, data });
}
