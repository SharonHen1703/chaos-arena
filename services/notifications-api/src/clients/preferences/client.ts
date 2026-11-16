import { z } from 'zod';
import type { PreferencesClient, UserPreference } from '../../notifications/interfaces.js';
import { PreferencesUnavailableError } from '../../shared/errors.js';
import { queryResponseSchema } from './schemas.js';

const MAX_LOGGED_BODY_LENGTH = 500;

// No timeout, AbortSignal or retry, on purpose: see "The POST /notifications flow" in the spec (CA-16).
export class HttpPreferencesClient implements PreferencesClient {
  constructor(private readonly baseUrl: string) {}

  getPreferences = async (userIds: string[]): Promise<Map<string, UserPreference>> => {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/preferences/query`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userIds }),
      });
    } catch (err) {
      // fetch throws TypeError('fetch failed'), and the real reason (e.g. ECONNREFUSED) is in err.cause.
      throw logAndCreateUnavailableError('request failed', err);
    }

    if (!response.ok) {
      // Reading the body also releases the connection.
      const text = await response.text().catch(() => '');
      throw logAndCreateUnavailableError(
        `unexpected status ${response.status}: ${text.slice(0, MAX_LOGGED_BODY_LENGTH)}`,
      );
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (err) {
      throw logAndCreateUnavailableError('invalid JSON in response', err);
    }

    const result = queryResponseSchema.safeParse(body);
    if (!result.success) {
      throw logAndCreateUnavailableError(`unexpected response shape:\n${z.prettifyError(result.error)}`);
    }

    return new Map(result.data.data.map(({ userId, optedOut }) => [userId, { optedOut }]));
  };
}

function logAndCreateUnavailableError(reason: string, err?: unknown): PreferencesUnavailableError {
  if (err instanceof Error) {
    console.error(`[preferences-client] ${reason}: ${err.message}`, { cause: err.cause });
  } else {
    console.error(`[preferences-client] ${reason}`);
  }
  return new PreferencesUnavailableError();
}
