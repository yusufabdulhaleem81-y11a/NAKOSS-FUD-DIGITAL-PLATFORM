import type { AppRole } from '@/types/auth';

export function homeForRoles(roles: AppRole[]): string {
  if (roles.includes('central_admin')) return '/admin';
  if (roles.includes('president')) return '/president';
  if (roles.includes('vice_president')) return '/vp';
  if (roles.includes('exco')) return '/exco';
  return '/member';
}