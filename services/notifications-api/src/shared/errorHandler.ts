import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errors.js';

// body-parser (express.json) marks its errors with a string `type`.
function getBodyParserType(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'type' in err && typeof err.type === 'string') {
    return err.type;
  }
  return undefined;
}

function toAppError(err: unknown): AppError | undefined {
  if (err instanceof AppError) {
    return err;
  }
  switch (getBodyParserType(err)) {
    case 'entity.parse.failed':
      return new AppError(400, 'VALIDATION_ERROR', 'Request body is not valid JSON');
    case 'entity.too.large':
      return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    default:
      return undefined;
  }
}

export function handleError(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  const appError = toAppError(err);
  if (appError) {
    res.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.message,
        requestId: req.id,
        details: appError.details,
      },
    });
    return;
  }

  console.error(`[${req.id}] Unhandled error:`, err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      requestId: req.id,
    },
  });
}
