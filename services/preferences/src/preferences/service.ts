import { NotFoundError } from '../shared/errors.js';
import type { PreferencesRepository, UserPreferences } from './interfaces.js';

export interface PreferenceSummary {
  userId: string;
  optedOut: boolean;
}

export class PreferencesService {
  constructor(private readonly repository: PreferencesRepository) {}

  // A user who does not exist simply does not appear in the result.
  queryPreferences = async (userIds: string[]): Promise<PreferenceSummary[]> => {
    const found = await this.repository.findByUserIds(userIds);
    return found.map(({ userId, optedOut }) => ({ userId, optedOut }));
  };

  getPreferences = async (userId: string): Promise<UserPreferences> => {
    const prefs = await this.repository.findByUserId(userId);
    if (!prefs) {
      throw new NotFoundError('User preferences');
    }
    return prefs;
  };

  updatePreferences = async (
    userId: string,
    changes: { optedOut: boolean },
  ): Promise<UserPreferences> => {
    const prefs = await this.repository.updateOptedOut(userId, changes.optedOut);
    if (!prefs) {
      throw new NotFoundError('User preferences');
    }
    return prefs;
  };
}
