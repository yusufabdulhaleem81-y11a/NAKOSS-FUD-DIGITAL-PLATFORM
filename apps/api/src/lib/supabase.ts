import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';

/** Server-only client. Uses the service-role key — NEVER send this to the browser. */
export const db: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}