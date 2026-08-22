import { prisma } from '../lib/prisma';

export function listActiveProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });
}

export function findProductById(id: string) {
  return prisma.product.findUnique({ where: { id } });
}
