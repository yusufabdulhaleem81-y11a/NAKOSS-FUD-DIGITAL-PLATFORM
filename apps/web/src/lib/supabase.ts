import { createClient } from '@supabase/supabase-js';
import { env, USE_MOCKS } from './env';

const mockAuth = {
  async getSession() {
    return { data: { session: null } };
  },
  onAuthStateChange() {
    return { data: { subscription: { unsubscribe() {} } } };
  },
  async signInWithPassword() {
    return { error: null };
  },
  async updateUser() {
    return { error: null };
  },
  async signOut() {
    return { error: null };
  },
};

export const supabase = USE_MOCKS
  ? ({ auth: mockAuth } as any)
  : createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });

export default supabase;
