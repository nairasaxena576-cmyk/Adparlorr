import type { CryptoAsset, CryptoAssetCode } from '@prisma/client';
import { AppError } from '../utils/AppError';
import {
  listAllAssets,
  listEnabledAssets,
  findAssetByCode,
  updateAssetByCode,
} from '../repositories/cryptoAsset.repository';

export interface CryptoAssetDto {
  code: CryptoAssetCode;
  address: string | null;
  isEnabled: boolean;
}

function toDto(asset: CryptoAsset): CryptoAssetDto {
  return { code: asset.code, address: asset.address, isEnabled: asset.isEnabled };
}

export async function listAssetsForAdmin(): Promise<CryptoAssetDto[]> {
  const assets = await listAllAssets();
  return assets.map(toDto);
}

export async function listAssetsForCustomer(): Promise<CryptoAssetDto[]> {
  const assets = await listEnabledAssets();
  return assets.map(toDto);
}

export interface UpdateCryptoAssetInput {
  address?: string | null;
  isEnabled: boolean;
}

export async function updateCryptoAsset(
  code: CryptoAssetCode,
  input: UpdateCryptoAssetInput
): Promise<CryptoAssetDto> {
  const existing = await findAssetByCode(code);
  if (!existing) throw AppError.notFound('Unknown crypto asset.');

  const nextAddress = input.address !== undefined ? input.address : existing.address;

  if (input.isEnabled && !nextAddress) {
    throw AppError.badRequest('A deposit address is required to enable this asset.');
  }

  const updated = await updateAssetByCode(code, {
    address: nextAddress,
    isEnabled: input.isEnabled,
  });
  return toDto(updated);
}
