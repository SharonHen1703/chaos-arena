import express from 'express';
import type { Express } from 'express';
import type { Config } from './config.js';
import { connectToDatabase, isDatabaseHealthy } from './db.js';
import { handleError } from './shared/errorHandler.js';
import { logRequest } from './shared/logger.js';
import { notFound } from './shared/notFound.js';
import { assignRequestId } from './shared/requestId.js';

export async function createApp(config: Config): Promise<Express> {
  await connectToDatabase(config.MONGO_URL);

  const app = express();
  app.disable('x-powered-by');

  app.use(assignRequestId);
  app.use(logRequest);
  app.use(express.json());

  app.get('/health', async (_req, res) => {
    const healthy = await isDatabaseHealthy();
    res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'unavailable' });
  });

  app.use(notFound);
  app.use(handleError);

  return app;
}
