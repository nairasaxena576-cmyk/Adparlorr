import { listActiveProducts } from '../repositories/product.repository';

export async function listProducts() {
  const products = await listActiveProducts();
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    reward: Number(p.reward),
    cost: Number(p.cost),
  }));
}
