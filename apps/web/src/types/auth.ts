export type AppRole = 'central_admin' | 'president' | 'vice_president' | 'exco' | 'student';

/**
 * The exact shape GET /api/me must return (Phase 3 contract).
 * The backend derives roles/permissions from role_assignments +
 * leadership_assignments + position_permissions — never from the JWT.
 */
export interface CurrentUserProfile {
  id: string;
  fullName: string;
  email: string;
  photoUrl: string | null;
  membershipNumber: string | null;
  position: string | null;               // e.g. 'Vice President' | 'P.R.O 1'
  administrationSession: string | null;  // e.g. '2026/2027'
  roles: AppRole[];
  permissions: string[];
  mustChangePassword: boolean;
}

export interface PublicAdministration {
  id: string;
  sessionLabel: string;
  motto: string | null;
  groupPhotoUrl: string | null;
  presidentName: string | null;
  vicePresidentName: string | null;
}