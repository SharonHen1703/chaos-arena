import { z } from 'zod';

// Separate from notifications-api's MAX_RECIPIENTS_PER_REQUEST (see decisions.md).
export const MAX_USER_IDS_PER_QUERY = 1000;

export const queryPreferencesBodySchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(MAX_USER_IDS_PER_QUERY),
});

export const updatePreferencesBodySchema = z.object({
  optedOut: z.boolean(),
});

export type QueryPreferencesBody = z.infer<typeof queryPreferencesBodySchema>;
export type UpdatePreferencesBody = z.infer<typeof updatePreferencesBodySchema>;
