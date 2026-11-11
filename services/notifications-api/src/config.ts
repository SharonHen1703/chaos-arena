import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535),
  MONGO_URL: z.string().min(1),
  // A plain z.url() accepts "localhost:3001" (it parses "localhost:" as the scheme).
  // Trailing slashes are removed, so the client can append a path.
  PREFERENCES_URL: z.url({ protocol: /^https?$/ }).transform((url) => url.replace(/\/+$/, '')),
});

export type Config = z.infer<typeof envSchema>;

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
  console.error(`Invalid or missing environment variables: ${names.join(', ')}`);
  process.exit(1);
}

export const config: Config = result.data;
