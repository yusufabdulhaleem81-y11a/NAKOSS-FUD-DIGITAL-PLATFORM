import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
  VITE_API_URL: z.string().url().optional().or(z.literal('')),
  VITE_USE_MOCKS: z.string().default('true'),
});

export const env = envSchema.parse(import.meta.env);
export const USE_MOCKS = env.VITE_USE_MOCKS === 'true';