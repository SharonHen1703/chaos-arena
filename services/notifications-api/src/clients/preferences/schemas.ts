import { z } from 'zod';

export const queryResponseSchema = z.object({
  data: z.array(z.object({ userId: z.string(), optedOut: z.boolean() })),
});
