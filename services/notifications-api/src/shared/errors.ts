export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class BadRequestError extends AppError {
  constructor(code: string, message: string) {
    super(400, code, message);
  }
}

export class ValidationError extends AppError {
  constructor(details: { path: string; message: string }[]) {
    super(400, 'VALIDATION_ERROR', 'Invalid request body', details);
  }
}

// The caller logs the reason (including err.cause) before throwing, so the response stays generic.
export class PreferencesUnavailableError extends AppError {
  constructor() {
    super(503, 'PREFERENCES_UNAVAILABLE', 'Preferences service is unavailable');
  }
}
