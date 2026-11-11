import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { ValidationError } from './errors.js';

// Replaces req.body with the parsed result, so unknown fields are stripped.
export function validateBody(schema: z.ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError(
        result.error.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          message: issue.message,
        })),
      );
    }
    req.body = result.data;
    next();
  };
}
