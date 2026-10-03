import { USE_MOCKS } from '@/lib/env';
import { api } from '@/lib/api';

export interface PastQuestionItem {
  id: string; courseCode: string; courseTitle: string | null;
  sessionLabel: string; semester: string | null; year: number;
  downloadCount: number; department: string | null; level: string | null;
}
export interface ResourceFilters {
  departments: { id: string; name: string }[];
  levels: { id: string; label: string }[];
  sessions: string[];
}

export const resourcesService = {
  async getFilters(): Promise<ResourceFilters> {
    if (USE_MOCKS) return {
      departments: [{ id: 'd1', name: 'Computer Science' }, { id: 'd2', name: 'Economics' }],
      levels: [{ id: 'l1', label: '100 Level' }, { id: 'l2', label: '200 Level' }],
      sessions: ['2024/2025', '2023/2024'],
    };
    return api.get<ResourceFilters>('/api/resources/filters');
  },
  async list(p: { departmentId?: string; levelId?: string; session?: string; semester?: string; q?: string }): Promise<PastQuestionItem[]> {
    if (USE_MOCKS) return [{ id: 'pq1', courseCode: 'CSC 301', courseTitle: 'Data Structures', sessionLabel: '2024/2025', semester: 'first', year: 2025, downloadCount: 12, department: 'Computer Science', level: '300 Level' }];
    const sp = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => { if (v) sp.set(k, v); });
    const qs = sp.toString();
    return api.get<PastQuestionItem[]>(`/api/resources/past-questions${qs ? `?${qs}` : ''}`);
  },
  async download(id: string): Promise<{ url: string }> {
    return api.get<{ url: string }>(`/api/resources/past-questions/${id}/download`);
  },
  async upload(fd: FormData): Promise<{ id: string }> {
    return api.postForm('/api/resources/past-questions', fd);
  },
};