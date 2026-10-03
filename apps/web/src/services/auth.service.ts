import { supabase } from '@/lib/supabase';
import { USE_MOCKS } from '@/lib/env';
import { api } from '@/lib/api';
import type { CurrentUserProfile, PublicAdministration } from '@/types/auth';
import { getMockProfile, mockCurrentAdministration, setDevMustChangePassword } from '@/mocks/auth';

function mapAuthError(message: string): string {
  if (message.includes('Invalid login')) return 'Incorrect email or password.';
  if (message.includes('rate limit')) return 'Too many attempts. Try again shortly.';
  return message;
}

export const authService = {
  async login(email: string, password: string): Promise<CurrentUserProfile> {
    if (USE_MOCKS) return getMockProfile(); // dev role switcher drives the profile
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(mapAuthError(error.message));
    return this.getProfile();
  },

  async getProfile(): Promise<CurrentUserProfile> {
    if (USE_MOCKS) return getMockProfile();
    return api.get<CurrentUserProfile>('/api/me');
  },

  async changePassword(newPassword: string): Promise<void> {
    if (USE_MOCKS) { setDevMustChangePassword(false); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    await api.post('/api/auth/change-password'); // server clears must_change_password
  },

  async getCurrentAdministration(): Promise<PublicAdministration> {
    if (USE_MOCKS) return mockCurrentAdministration;
    return api.get<PublicAdministration>('/api/public/current-administration');
  },

  async signOut(): Promise<void> {
    if (!USE_MOCKS) await supabase.auth.signOut();
  },
};