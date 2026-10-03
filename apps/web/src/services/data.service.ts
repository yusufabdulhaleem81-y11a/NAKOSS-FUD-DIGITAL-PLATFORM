import { USE_MOCKS } from '@/lib/env';
import { api } from '@/lib/api';
import { mockAnalytics, mockDb } from '@/mocks/data';
import type {
  Announcement, LeaderEntry, MembershipAnalytics, PendingApproval, Report, Task,
} from '@/types/task';

export interface AssignTaskInput {
  title: string; description?: string; assigneeId: string;
  deadline: string; priority: Task['priority'];
}
export interface UpdateTaskInput {
  progress: number; status: Task['status']; reportText?: string;
}

export const dataService = {
  async getAnalytics(): Promise<MembershipAnalytics> {
    if (USE_MOCKS) return mockAnalytics;
    return api.get<MembershipAnalytics>('/api/analytics/membership-summary');
  },
  async getApprovals(): Promise<PendingApproval[]> {
    if (USE_MOCKS) return mockDb.approvals;
    return api.get<PendingApproval[]>('/api/approvals?status=pending');
  },
  async decideApproval(id: string, decision: 'approved' | 'rejected', notes?: string) {
    if (USE_MOCKS) {
      mockDb.approvals = mockDb.approvals.filter((a) => a.id !== id);
      return;
    }
    await api.post(`/api/approvals/${id}/decision`, { decision, notes });
  },
  async getAllTasks(): Promise<Task[]> {
    if (USE_MOCKS) return mockDb.tasks;
    return api.get<Task[]>('/api/tasks');
  },
  async getMyTasks(): Promise<Task[]> {
    if (USE_MOCKS) return mockDb.tasks.filter((t) => t.assigneeName === 'Dev exco');
    return api.get<Task[]>('/api/tasks/mine');
  },
  async assignTask(input: AssignTaskInput): Promise<void> {
    if (USE_MOCKS) {
      const officer = mockDb.officers.find((o) => o.id === input.assigneeId);
      mockDb.tasks.unshift({
        id: `t${Date.now()}`, title: input.title, description: input.description ?? null,
        assigneeName: officer?.name ?? 'Unknown', assigneePosition: officer?.position ?? null,
        createdByName: 'Fatima Abubakar', deadline: input.deadline,
        priority: input.priority, status: 'pending', progress: 0, reportText: null,
      });
      return;
    }
    await api.post('/api/tasks', input);
  },
  async updateTask(id: string, input: UpdateTaskInput): Promise<void> {
    if (USE_MOCKS) {
      const t = mockDb.tasks.find((t) => t.id === id);
      if (t) Object.assign(t, input, { progress: Math.min(100, Math.max(0, input.progress)) });
      return;
    }
    await api.patch(`/api/tasks/${id}`, input);
  },
  async getOfficers(): Promise<Array<{ id: string; name: string; position: string }>> {
    if (USE_MOCKS) return mockDb.officers;
    return api.get<Array<{ id: string; name: string; position: string }>>('/api/officers');
  },
  async getLeadership(): Promise<LeaderEntry[]> {
    if (USE_MOCKS) return mockDb.leadership;
    return api.get<LeaderEntry[]>('/api/leadership/current');
  },
  async getMyReports(): Promise<Report[]> {
    if (USE_MOCKS) return mockDb.reports;
    return api.get<Report[]>('/api/reports/mine');
  },
  async createReport(title: string, body: string): Promise<void> {
    if (USE_MOCKS) {
      mockDb.reports.unshift({
        id: `r${Date.now()}`, title, body, authorName: 'Dev exco',
        status: 'pending_review', createdAt: new Date().toISOString(),
      });
      return;
    }
    await api.post('/api/reports', { title, body });
  },
  async getAnnouncements(): Promise<Announcement[]> {
    if (USE_MOCKS) return mockDb.announcements;
    return api.get<Announcement[]>('/api/announcements?audience=exco');
  },
};