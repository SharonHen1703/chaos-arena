export interface UserPreferences {
  userId: string;
  optedOut: boolean;
  updatedAt: Date;
}

export interface PreferencesRepository {
  findByUserIds(userIds: string[]): Promise<UserPreferences[]>;
  findByUserId(userId: string): Promise<UserPreferences | null>;
  // Returns null when the user does not exist. Never creates a user.
  updateOptedOut(userId: string, optedOut: boolean): Promise<UserPreferences | null>;
}
