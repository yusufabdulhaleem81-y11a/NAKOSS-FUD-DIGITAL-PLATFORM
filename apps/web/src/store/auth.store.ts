import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { AppRole, CurrentUserProfile } from '@/types/auth';
import { authService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase';
import { USE_MOCKS } from '@/lib/env';

type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  profile: CurrentUserProfile | null;
  initialize: () => Promise<void>;
  setSession: (session: Session | null) => Promise<void>;
  loginCompleted: (profile: CurrentUserProfile) => void;
  markPasswordChanged: () => void;
  signOut: () => Promise<void>;
  hasRole: (...roles: AppRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'initializing',
  session: null,
  profile: null,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && window.location.pathname === '/reset-password') {
      set({ session, status: 'authenticated' });
    } else if (session) await get().setSession(session);
    else set({ status: 'unauthenticated' });
  },

  setSession: async (session) => {
    if (!session) { set({ session: null, profile: null, status: 'unauthenticated' }); return; }
    set({ session, status: get().profile ? 'authenticated' : 'initializing' });
    try {
      const profile = await authService.getProfile();
      set({ profile, status: 'authenticated' });
    } catch {
      if (!USE_MOCKS) await supabase.auth.signOut();
      set({ session: null, profile: null, status: 'unauthenticated' });
    }
  },

  loginCompleted: (profile) => set({ profile, status: 'authenticated' }),

  markPasswordChanged: () => {
    const { profile } = get();
    if (profile) set({ profile: { ...profile, mustChangePassword: false } });
  },

  signOut: async () => {
    await authService.signOut();
    set({ session: null, profile: null, status: 'unauthenticated' });
  },

  hasRole: (...roles) => {
    const { profile } = get();
    return !!profile && roles.some((r) => profile.roles.includes(r));
  },

  hasPermission: (permission) => get().profile?.permissions.includes(permission) ?? false,
}));