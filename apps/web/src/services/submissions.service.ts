import { api } from '@/lib/api';

export type SubmissionType = 'suggestion' | 'issue' | 'request' | 'support' | 'welfare';
export type SubmissionStatus = 'submitted' | 'under_review' | 'in_progress' | 'resolved' | 'closed';

export interface Submission {
  id: string; reference: string; type: SubmissionType; subject: string; message: string;
  status: SubmissionStatus; isAnonymous: boolean; responseText: string | null;
  respondedAt: string | null; createdAt: string; submitterName?: string;
}

export const submissionsService = {
  async create(input: { type: SubmissionType; subject: string; message: string; isAnonymous: boolean }): Promise<{ reference: string }> {
    return api.post('/api/submissions', input);
  },
  async mine(): Promise<Submission[]> { return api.get('/api/submissions/mine'); },
  async queue(p: { type?: string; status?: string } = {}): Promise<Submission[]> {
    const sp = new URLSearchParams();
    if (p.type) sp.set('type', p.type);
    if (p.status) sp.set('status', p.status);
    const qs = sp.toString();
    return api.get(`/api/submissions${qs ? `?${qs}` : ''}`);
  },
  async update(id: string, patch: { status?: SubmissionStatus; responseText?: string }): Promise<{ ok: boolean }> {
    return api.patch(`/api/submissions/${id}`, patch);
  },
};