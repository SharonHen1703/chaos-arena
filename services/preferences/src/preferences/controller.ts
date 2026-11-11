import type { Request, Response } from 'express';
import type { QueryPreferencesBody, UpdatePreferencesBody } from './schemas.js';
import type { PreferencesService } from './service.js';

// Bodies are already parsed by validateBody in the routes.
export class PreferencesController {
  constructor(private readonly service: PreferencesService) {}

  query = async (
    req: Request<Record<string, string>, unknown, QueryPreferencesBody>,
    res: Response,
  ): Promise<void> => {
    const data = await this.service.queryPreferences(req.body.userIds);
    res.json({ data });
  };

  get = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const prefs = await this.service.getPreferences(req.params.id);
    res.json(prefs);
  };

  update = async (
    req: Request<{ id: string }, unknown, UpdatePreferencesBody>,
    res: Response,
  ): Promise<void> => {
    const prefs = await this.service.updatePreferences(req.params.id, req.body);
    res.json(prefs);
  };
}
