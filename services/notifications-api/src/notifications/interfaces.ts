export interface UserPreference {
  optedOut: boolean;
}

export interface PreferencesClient {
  // A user who does not exist in preferences is missing from the Map.
  // Throws PreferencesUnavailableError when there is no valid response.
  getPreferences(userIds: string[]): Promise<Map<string, UserPreference>>;
}
