import express from 'express';
import type { Express } from 'express';
import type { Config } from './config.js';
import { connectToDatabase, isDatabaseHealthy } from './db.js';
import { PreferencesController } from './preferences/controller.js';
import { MongoosePreferencesRepository } from './preferences/repository.js';
import { createPreferencesRouter } from './preferences/routes.js';
import { PreferencesService } from './preferences/service.js';
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

  const preferencesRepository = new MongoosePreferencesRepository();
  const preferencesService = new PreferencesService(preferencesRepository);
  const preferencesController = new PreferencesController(preferencesService);
  app.use(createPreferencesRouter(preferencesController));

  app.use(notFound);
  app.use(handleError);

  return app;
}
