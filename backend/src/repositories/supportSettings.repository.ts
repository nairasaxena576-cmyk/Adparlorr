import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export function findSettings() {
  return prisma.supportSettings.findFirst();
}

export function createSettings(data: Prisma.SupportSettingsCreateInput = {}) {
  return prisma.supportSettings.create({ data });
}

export function updateSettingsById(id: string, data: Prisma.SupportSettingsUpdateInput) {
  return prisma.supportSettings.update({ where: { id }, data });
}
