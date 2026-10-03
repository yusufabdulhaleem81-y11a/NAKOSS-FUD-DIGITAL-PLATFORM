import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { dataService } from '@/services/data.service';
import { cardService } from '@/services/card.service';

export const qk = {
  administration: ['current-administration'] as const,
  analytics: ['analytics'] as const,
  approvals: ['approvals'] as const,
  allTasks: ['tasks', 'all'] as const,
  myTasks: ['tasks', 'mine'] as const,
  leadership: ['leadership'] as const,
  myReports: ['reports', 'mine'] as const,
  announcements: ['announcements'] as const,
};

export function useCurrentAdministration() {
  return useQuery({ queryKey: qk.administration, queryFn: () => authService.getCurrentAdministration(), staleTime: Infinity });
}
export const useAnalytics = () => useQuery({ queryKey: qk.analytics, queryFn: () => dataService.getAnalytics() });
export const useApprovals = () => useQuery({ queryKey: qk.approvals, queryFn: () => dataService.getApprovals() });
export const useAllTasks = () => useQuery({ queryKey: qk.allTasks, queryFn: () => dataService.getAllTasks() });
export const useMyTasks = () => useQuery({ queryKey: qk.myTasks, queryFn: () => dataService.getMyTasks() });
export const useLeadership = () => useQuery({ queryKey: qk.leadership, queryFn: () => dataService.getLeadership() });
export const useMyReports = () => useQuery({ queryKey: qk.myReports, queryFn: () => dataService.getMyReports() });
export const useAnnouncements = () => useQuery({ queryKey: qk.announcements, queryFn: () => dataService.getAnnouncements() });
export const useOfficers = () => useQuery({ queryKey: ['officers'], queryFn: () => dataService.getOfficers() });
export const useMyCard = () => useQuery({ queryKey: ['my-card'], queryFn: () => cardService.getMyCard(), staleTime: 60_000 });

export function useApproveDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) => dataService.decideApproval(id, decision),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.approvals }),
  });
}
export function useAssignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof dataService.assignTask>[0]) => dataService.assignTask(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Parameters<typeof dataService.updateTask>[1]) => dataService.updateTask(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, body }: { title: string; body: string }) => dataService.createReport(title, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.myReports }),
  });
}