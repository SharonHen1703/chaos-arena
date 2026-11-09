import express from 'express';
import type { Express } from 'express';
import { handleError } from './shared/errorHandler.js';
import { logRequest } from './shared/logger.js';
import { notFound } from './shared/notFound.js';
import { assignRequestId } from './shared/requestId.js';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(assignRequestId);
  app.use(logRequest);
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(notFound);
  app.use(handleError);

  return app;
}
