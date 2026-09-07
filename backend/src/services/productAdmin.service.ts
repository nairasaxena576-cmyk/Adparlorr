import type { Product } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/AppError';
import { TIERS, type Tier } from '../utils/tiers';
import {
  listAllProducts,
  listWorkbenchProductsForTier,
  findProductById,
  findMaxDisplayOrder,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../repositories/product.repository';
import { uploadProductImage, deleteImage } from '../lib/supabaseStorage';

const TIER_ORDER: Tier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];

// Decimal fields never leave a service as raw Prisma Decimal objects —
// JSON.stringify would serialize them as strings, not numbers (see
// auth.service.ts's toSafeUser, which follows the same rule for User's
// Decimal fields). This is the equivalent mapper for Product.
export interface AdminProductDto {
  id: string;
  displayOrder: number;
  name: string;
  category: string;
  reward: number;
  cost: number;
  price: number;
  // Null means "Bronze" (see schema.prisma's doc comment on the column) —
  // returned as the literal resolved tier here so the admin UI never has
  // to re-implement that default itself.
  tierEligibility: Tier;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toAdminProductDto(product: Product): AdminProductDto {
  return {
    id: product.id,
    displayOrder: product.displayOrder,
    name: product.name,
    category: product.category,
    reward: Number(product.reward),
    cost: Number(product.cost),
    price: Number(product.price),
    tierEligibility: product.tierEligibility ?? 'Bronze',
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

async function requireProduct(id: string): Promise<Product> {
  const product = await findProductById(id);
  if (!product) throw AppError.notFound('Product not found.');
  return product;
}

// ---- Products ----

export async function listProductsForAdmin(): Promise<AdminProductDto[]> {
  const products = await listAllProducts();
  return products.map(toAdminProductDto);
}

export interface TierReadinessDto {
  tier: Tier;
  eligibleCount: number;
  required: number;
  ready: boolean;
}

export interface WorkbenchReadinessDto {
  tiers: TierReadinessDto[];
  ready: boolean;
}

// "Eligible" mirrors exactly what the customer workbench itself requires
// for each tier band — published/active, priced above zero, and tagged for
// that tier (or untagged, which counts as Bronze) — see
// product.repository.ts's listWorkbenchProductsForTier, the same query
// order.service.ts uses. Reported per tier so an admin can see exactly
// which band still needs stocking as customers approach it.
export async function getWorkbenchReadinessForAdmin(): Promise<WorkbenchReadinessDto> {
  const tiers: TierReadinessDto[] = [];
  for (const tier of TIER_ORDER) {
    const eligible = await listWorkbenchProductsForTier(tier);
    const required = TIERS[tier].maxOrders - TIERS[tier].minOrders;
    tiers.push({ tier, eligibleCount: eligible.length, required, ready: eligible.length >= required });
  }
  return { tiers, ready: tiers.every((t) => t.ready) };
}

export async function getProductForAdmin(id: string): Promise<AdminProductDto> {
  return toAdminProductDto(await requireProduct(id));
}

export interface CreateProductInput {
  name: string;
  category: string;
  reward: number;
  cost: number;
  price?: number;
  tierEligibility?: Tier | null;
  imageUrl?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}

export async function createProductForAdmin(input: CreateProductInput): Promise<AdminProductDto> {
  // Auto-assign the next free displayOrder when the admin doesn't pick one
  // — displayOrder is a unique column, so this avoids ever colliding on the
  // common "just add a product" path. An admin who does supply one still
  // gets a clean 409 (not a raw DB error) if it collides with an existing
  // product — see the catch block below.
  let displayOrder = input.displayOrder;
  if (displayOrder === undefined) {
    const { _max } = await findMaxDisplayOrder();
    displayOrder = (_max.displayOrder ?? 0) + 1;
  }

  try {
    const created = await createProduct({
      name: input.name,
      category: input.category,
      reward: input.reward,
      cost: input.cost,
      price: input.price ?? 0,
      tierEligibility: input.tierEligibility ?? null,
      imageUrl: input.imageUrl ?? null,
      isActive: input.isActive ?? false,
      displayOrder,
    });
    return toAdminProductDto(created);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw AppError.conflict('That display order is already used by another product.');
    }
    throw err;
  }
}

export interface UpdateProductInput {
  name?: string;
  category?: string;
  reward?: number;
  cost?: number;
  price?: number;
  tierEligibility?: Tier | null;
  imageUrl?: string | null;
  isActive?: boolean;
  displayOrder?: number;
}

export async function updateProductForAdmin(id: string, input: UpdateProductInput): Promise<AdminProductDto> {
  const existing = await requireProduct(id);

  let updated: Product;
  try {
    updated = await updateProduct(id, input);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw AppError.conflict('That display order is already used by another product.');
    }
    throw err;
  }

  // Product (unlike TrainingTask) has no historical snapshot of imageUrl
  // anywhere — TaskSubmission stores only rewardAmount/costAmount, never an
  // image reference — so nothing in the DB can still depend on the old
  // image once the product row itself has moved on. Safe to always clean
  // it up on replacement, no reference-count check needed here.
  if (input.imageUrl !== undefined && existing.imageUrl && input.imageUrl !== existing.imageUrl) {
    await deleteImage(existing.imageUrl);
  }

  return toAdminProductDto(updated);
}

export async function deleteProductForAdmin(id: string): Promise<void> {
  const existing = await requireProduct(id);

  try {
    await deleteProduct(id);
  } catch (err) {
    // TaskSubmission.productId is ON DELETE RESTRICT by design — the DB
    // itself refuses to let a product with real order history disappear.
    // Surface that as a clear, actionable message instead of a raw 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw AppError.conflict(
        'This product has existing customer submissions and cannot be deleted. Unpublish it instead.'
      );
    }
    throw err;
  }

  if (existing.imageUrl) {
    await deleteImage(existing.imageUrl);
  }
}

export async function reorderProductForAdmin(id: string, direction: 'up' | 'down'): Promise<AdminProductDto> {
  const product = await requireProduct(id);

  const siblings = (await listAllProducts()).sort((a, b) => a.displayOrder - b.displayOrder);
  const idx = siblings.findIndex((p) => p.id === id);
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return toAdminProductDto(product);

  const other = siblings[swapIdx];
  // displayOrder is a unique column (unlike TrainingTask.order), so a
  // direct two-row swap in one transaction would collide mid-transaction —
  // Postgres checks UNIQUE immediately, not deferred. Stage through a
  // transient sentinel value first; -1 can never collide with a real
  // product since every admin-supplied displayOrder is required positive
  // (see productAdmin.schema.ts).
  await prisma.$transaction([
    updateProduct(id, { displayOrder: -1 }),
    updateProduct(other.id, { displayOrder: product.displayOrder }),
    updateProduct(id, { displayOrder: other.displayOrder }),
  ]);
  return toAdminProductDto(await requireProduct(id));
}

export async function uploadProductImageForAdmin(file: Express.Multer.File): Promise<{ imageUrl: string }> {
  const { url } = await uploadProductImage(file.buffer, file.mimetype);
  return { imageUrl: url };
}
