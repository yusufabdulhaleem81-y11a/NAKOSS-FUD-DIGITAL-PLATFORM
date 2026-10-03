import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';

export const ak = {
  members: (p: unknown) => ['admin-members', p] as const,
  officers: ['admin-officers'] as const,
  positions: ['admin-positions'] as const,
  administrations: ['admin-administrations'] as const,
  audit: (p: unknown) => ['admin-audit', p] as const,
};

export const useAdminMembers = (p: { page: number; q: string; status: string }) =>
  useQuery({ queryKey: ak.members(p), queryFn: () => adminService.listMembers(p), placeholderData: (prev: unknown) => prev as never });
export const useOfficers = () => useQuery({ queryKey: ak.officers, queryFn: () => adminService.listOfficers() });
export const usePositions = () => useQuery({ queryKey: ak.positions, queryFn: () => adminService.listPositions() });
export const useAdministrations = () => useQuery({ queryKey: ak.administrations, queryFn: () => adminService.listAdministrations() });
export const useAudit = (p: { page: number; q: string }) =>
  useQuery({ queryKey: ak.audit(p), queryFn: () => adminService.listAudit(p), placeholderData: (prev: unknown) => prev as never });

type QueryKey = readonly unknown[];

export function useInvalidateAdmin() {
  const qc = useQueryClient();
  return (keys: ReadonlyArray<QueryKey>) => {
    keys.forEach((k) => qc.invalidateQueries({ queryKey: [...k] }));
  };
}

export const useVerifyMember = () => {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (id: string) => adminService.verifyMember(id),
    onSuccess: () => invalidate([['admin-members'], [...ak.officers], ['analytics']]),
  });
};
export const useUpdateMember = () => {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => adminService.updateMember(id, patch),
    onSuccess: () => invalidate([['admin-members'], ['my-card']]),
  });
};
export const useAssignPosition = () => {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ memberId, positionId }: { memberId: string; positionId: string }) => adminService.assignPosition(memberId, positionId),
    onSuccess: () => invalidate([[...ak.officers], ['leadership'], ['current-administration']]),
  });
};
export const useEndAssignment = () => {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (id: string) => adminService.endAssignment(id),
    onSuccess: () => invalidate([[...ak.officers], ['leadership']]),
  });
};
export const useInviteOfficer = () =>
  useMutation({ mutationFn: (input: Parameters<typeof adminService.inviteOfficer>[0]) => adminService.inviteOfficer(input) });
export const useTempPassword = () =>
  useMutation({ mutationFn: (profileId: string) => adminService.issueTempPassword(profileId) });
export const useCreateAdministration = () => {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (input: Parameters<typeof adminService.createAdministration>[0]) => adminService.createAdministration(input),
    onSuccess: () => invalidate([[...ak.administrations]]),
  });
};
export const useSetCurrentAdministration = () => {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (id: string) => adminService.setCurrentAdministration(id),
    onSuccess: () => invalidate([[...ak.administrations], ['current-administration'], ['leadership']]),
  });
};