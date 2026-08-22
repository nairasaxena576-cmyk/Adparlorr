import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { corsOptions } from './config/cors';
import { globalRateLimiter } from './middleware/rateLimit';
import { apiRouter } from './routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, redact: ['req.headers.cookie'] }));
  app.use(globalRateLimiter);

  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ success: true, status: 'ok' });
  });

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
