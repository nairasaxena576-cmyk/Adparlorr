import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './lib/prisma';
import { runWorkbenchCatalogBootstrapIfEnabled } from './bootstrap/workbenchCatalogBootstrap';

async function main() {
  await prisma.$connect();
  await runWorkbenchCatalogBootstrapIfEnabled(prisma);

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Adparlorr backend listening on port ${env.PORT} (${env.NODE_ENV})`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error during startup — server did not start.');
  process.exit(1);
});
