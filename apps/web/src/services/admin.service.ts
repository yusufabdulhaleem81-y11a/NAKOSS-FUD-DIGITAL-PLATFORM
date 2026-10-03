import { api } from '@/lib/api';

export interface Paged<T> { data: T[]; page: number; limit: number; total: number }
export interface AdminMember {
  id: string; membershipNumber: string; fullName: string; email: string | null;
  phone: string | null; matricNumber: string; status: string;
  department: string | null; level: string | null; state: string | null;
  profileId: string | null; createdAt: string;
}
export interface OfficerRow {
  assignmentId: string; position: string; memberName: string;
  membershipNumber: string; profileId: string | null; status: string; session: string | null;
}
export interface AdministrationRow {
  id: string; name: string; sessionLabel: string; status: string;
  isCurrent: boolean; startDate: string | null; endDate: string | null;
}
export interface AuditRow {
  id: number; action: string; actor: string; targetType: string | null;
  targetId: string | null; metadata: Record<string, unknown>; createdAt: string;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') sp.set(k, String(v)); });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const adminService = {
  listMembers: (p: { page?: number; limit?: number; q?: string; status?: string } = {}) =>
    api.get<Paged<AdminMember>>(`/api/admin/members${qs(p)}`),
  verifyMember: (id: string) => api.post<{ ok: boolean }>(`/api/admin/members/${id}/verify`),
  updateMember: (id: string, patch: Record<string, unknown>) => api.patch<{ ok: boolean }>(`/api/admin/members/${id}`, patch),

  listOfficers: () => api.get<OfficerRow[]>('/api/admin/officers'),
  listPositions: () => api.get<{ id: string; title: string }[]>('/api/admin/positions'),
  assignPosition: (memberId: string, positionId: string) => api.post<{ id: string }>('/api/admin/exco/assign', { memberId, positionId }),
  endAssignment: (id: string) => api.post<{ ok: boolean }>(`/api/admin/exco/assignments/${id}/end`),
  inviteOfficer: (input: { fullName: string; email: string; positionId: string }) =>
    api.post<{ token: string; expiresAt: string }>('/api/admin/exco/invite', input),
  issueTempPassword: (profileId: string) =>
    api.post<{ tempPassword: string; expiresAt: string }>(`/api/admin/profiles/${profileId}/temp-password`),

  listAdministrations: () => api.get<AdministrationRow[]>('/api/admin/administrations'),
  createAdministration: (input: { name: string; sessionLabel: string; startDate?: string; endDate?: string }) =>
    api.post<{ id: string }>('/api/admin/administrations', input),
  setCurrentAdministration: (id: string) => api.post<{ ok: boolean }>(`/api/admin/administrations/${id}/set-current`),

  listAudit: (p: { page?: number; limit?: number; q?: string } = {}) =>
    api.get<Paged<AuditRow>>(`/api/admin/audit${qs(p)}`),

  validateInvite: (token: string) =>
    api.get<{ email: string; fullName: string | null; positionTitle: string | null; sessionLabel: string | null }>(`/api/invites/${token}`),
  acceptInvite: (input: { token: string; fullName: string; matricNumber: string; departmentId: string; levelId: string; stateId: string; password: string }) =>
    api.post<{ ok: boolean; membershipNumber: string }>('/api/invites/accept', input),
};