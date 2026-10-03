import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { Loader2 } from 'lucide-react';
import type { AppRole } from '@/types/auth';

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === 'initializing') return <FullPageLoader />;
  if (status !== 'authenticated') return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function MustChangePasswordGuard({ children }: { children: React.ReactNode }) {
  const mustChange = useAuthStore((s) => s.profile?.mustChangePassword);
  const location = useLocation();
  if (mustChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <>{children}</>;
}

/** Server re-checks everything; this guard is UX, not security. */
export function RequireRole({ roles, children }: { roles: AppRole[]; children: React.ReactNode }) {
  const hasRole = useAuthStore((s) => s.hasRole);
  const profile = useAuthStore((s) => s.profile);
  if (!hasRole(...roles)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}