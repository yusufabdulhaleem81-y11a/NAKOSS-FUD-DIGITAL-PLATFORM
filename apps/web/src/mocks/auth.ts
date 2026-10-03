import type { AppRole, CurrentUserProfile, PublicAdministration } from '@/types/auth';
import { PERMISSION } from '@/lib/permissions';

const ROLE_KEY = 'nakoss.dev.role';
const MUST_CHANGE_KEY = 'nakoss.dev.mustChangePassword';

export function setDevRole(role: AppRole) { localStorage.setItem(ROLE_KEY, role); }
export function setDevMustChangePassword(v: boolean) {
  localStorage.setItem(MUST_CHANGE_KEY, String(v));
}

const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  central_admin: Object.values(PERMISSION),
  president: [
    PERMISSION.MEMBERS_VIEW, PERMISSION.MEMBERS_VERIFY, PERMISSION.ANALYTICS_VIEW,
    PERMISSION.TASKS_VIEW_ALL, PERMISSION.TASKS_ASSIGN, PERMISSION.REPORTS_SUBMIT,
    PERMISSION.REPORTS_REVIEW, PERMISSION.SUBMISSIONS_RESPOND, PERMISSION.CONTENT_APPROVE,
    PERMISSION.NEWS_MANAGE, PERMISSION.EVENTS_MANAGE, PERMISSION.GALLERY_MANAGE,
    PERMISSION.DOCUMENTS_MANAGE, PERMISSION.RESOURCES_UPLOAD,
  ],
  vice_president: [
    PERMISSION.ANALYTICS_VIEW, PERMISSION.TASKS_VIEW_ALL, PERMISSION.TASKS_ASSIGN,
    PERMISSION.REPORTS_SUBMIT, PERMISSION.REPORTS_REVIEW, PERMISSION.SUBMISSIONS_RESPOND,
    PERMISSION.EVENTS_MANAGE, PERMISSION.DOCUMENTS_MANAGE, PERMISSION.RESOURCES_UPLOAD,
  ],
  exco: [PERMISSION.REPORTS_SUBMIT, PERMISSION.RESOURCES_UPLOAD, PERMISSION.NEWS_MANAGE, PERMISSION.GALLERY_MANAGE],
  student: [],
};

const POSITION_BY_ROLE: Record<AppRole, string | null> = {
  central_admin: 'Central Administrator',
  president: 'President',
  vice_president: 'Vice President',
  exco: 'P.R.O 1',
  student: null,
};

export function getMockProfile(): CurrentUserProfile {
  const role = (localStorage.getItem(ROLE_KEY) as AppRole) ?? 'student';
  return {
    id: `dev-${role}`,
    fullName: role === 'student' ? 'Aisha Muhammad' : `Dev ${role.replace('_', ' ')}`,
    email: 'dev@nakoss.test',
    photoUrl: null,
    membershipNumber: 'NAKOSS-2026-0001',
    position: POSITION_BY_ROLE[role],
    administrationSession: '2026/2027',
    roles: [role],
    permissions: ROLE_PERMISSIONS[role],
    mustChangePassword: localStorage.getItem(MUST_CHANGE_KEY) === 'true',
  };
}

/** Served by GET /api/public/current-administration once backend exists. */
export const mockCurrentAdministration: PublicAdministration = {
  id: 'adm-2026',
  sessionLabel: '2026/2027',
  motto: 'Service. Integrity. Progress.',
  groupPhotoUrl: null,
  presidentName: 'Ibrahim Yusuf',
  vicePresidentName: 'Fatima Abubakar',
};