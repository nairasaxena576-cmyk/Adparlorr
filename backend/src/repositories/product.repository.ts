import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export function listActiveProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });
}

// The customer workbench's sequential set — active products an admin has
// actually priced. A product with price=0 (the default until an admin sets
// one via Product Management) is excluded rather than shown with a fake $0
// commission.
export function listWorkbenchProducts(client: Client = prisma) {
  return client.product.findMany({
    where: { isActive: true, price: { gt: 0 } },
    orderBy: { displayOrder: 'asc' },
  });
}

export function findProductById(id: string, client: Client = prisma) {
  return client.product.findUnique({ where: { id } });
}

// ---- Admin ----

export function listAllProducts(client: Client = prisma) {
  return client.product.findMany({ orderBy: { displayOrder: 'asc' } });
}

export function findMaxDisplayOrder(client: Client = prisma) {
  return client.product.aggregate({ _max: { displayOrder: true } });
}

export function createProduct(data: Prisma.ProductCreateInput, client: Client = prisma) {
  return client.product.create({ data });
}

export function updateProduct(id: string, data: Prisma.ProductUpdateInput, client: Client = prisma) {
  return client.product.update({ where: { id }, data });
}

export function deleteProduct(id: string, client: Client = prisma) {
  return client.product.delete({ where: { id } });
}
