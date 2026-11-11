import { Router } from 'express';
import { validateBody } from '../shared/validateBody.js';
import type { PreferencesController } from './controller.js';
import { queryPreferencesBodySchema, updatePreferencesBodySchema } from './schemas.js';

export function createPreferencesRouter(controller: PreferencesController): Router {
  const router = Router();
  router.post('/preferences/query', validateBody(queryPreferencesBodySchema), controller.query);
  router.get('/users/:id/preferences', controller.get);
  router.patch(
    '/users/:id/preferences',
    validateBody(updatePreferencesBodySchema),
    controller.update,
  );
  return router;
}
