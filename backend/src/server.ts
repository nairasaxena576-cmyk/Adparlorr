import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`Adparlorr backend listening on port ${env.PORT} (${env.NODE_ENV})`);
});
