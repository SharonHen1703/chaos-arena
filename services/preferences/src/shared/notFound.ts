import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from './errors.js';

export function notFound(req: Request, _res: Response, _next: NextFunction): void {
  throw new NotFoundError(`Route ${req.method} ${req.originalUrl}`);
}
