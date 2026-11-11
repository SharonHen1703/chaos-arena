import { PreferenceModel } from './preference.model.js';
import type { Preference } from './preference.model.js';
import type { PreferencesRepository, UserPreferences } from './interfaces.js';

function toUserPreferences({ _id, optedOut, updatedAt }: Preference): UserPreferences {
  return { userId: _id, optedOut, updatedAt };
}

export class MongoosePreferencesRepository implements PreferencesRepository {
  findByUserIds = async (userIds: string[]): Promise<UserPreferences[]> => {
    const docs = await PreferenceModel.find({ _id: { $in: userIds } }).lean();
    return docs.map(toUserPreferences);
  };

  // _id is a String, so findById cannot throw CastError.
  findByUserId = async (userId: string): Promise<UserPreferences | null> => {
    const doc = await PreferenceModel.findById(userId).lean();
    return doc ? toUserPreferences(doc) : null;
  };

  updateOptedOut = async (userId: string, optedOut: boolean): Promise<UserPreferences | null> => {
    // No upsert: PATCH does not create users. timestamps sets updatedAt.
    const doc = await PreferenceModel.findOneAndUpdate(
      { _id: userId },
      { $set: { optedOut } },
      { returnDocument: 'after', upsert: false },
    ).lean();
    return doc ? toUserPreferences(doc) : null;
  };
}
