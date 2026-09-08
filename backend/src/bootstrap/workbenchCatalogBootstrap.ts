import type { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { seedWorkbenchCatalog } from '../lib/workbenchCatalog';

// One-time production catalog bootstrap for hosts (e.g. Render's free plan)
// with no Shell/One-Off Job access to run `npm run db:seed` manually.
// Gated on WORKBENCH_CATALOG_BOOTSTRAP so it only ever runs when an operator
// deliberately sets that env var, and is defensively hard-disabled outside
// NODE_ENV=production regardless of the flag, so it can never fire against
// a dev or test database even if the flag were left set by mistake.
// Calls the existing seedWorkbenchCatalog() unchanged — same idempotent
// upsert-by-displayOrder logic prisma/seed.ts already uses — so it never
// creates a second product system and never duplicates or deletes rows.
export async function runWorkbenchCatalogBootstrapIfEnabled(
  client: Pick<PrismaClient, 'product'>
): Promise<void> {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  if (!env.WORKBENCH_CATALOG_BOOTSTRAP) {
    return;
  }

  logger.info('WORKBENCH_CATALOG_BOOTSTRAP=true — running one-time Workbench catalog seed before accepting traffic.');

  try {
    const products = await seedWorkbenchCatalog(client);
    logger.info(`Workbench catalog bootstrap complete — ${products.length} products upserted. Remember to disable WORKBENCH_CATALOG_BOOTSTRAP now.`);
  } catch (err) {
    logger.error({ err }, 'Workbench catalog bootstrap failed — refusing to start the server in a partially-seeded state.');
    throw err;
  }
}
