export type TaskStatus = 'pending' | 'in_progress' | 'submitted' | 'completed' | 'rejected';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigneeName: string;
  assigneePosition: string | null;
  createdByName: string;
  deadline: string;              // ISO
  priority: TaskPriority;
  status: TaskStatus;            // 'overdue' is computed, never stored
  progress: number;              // 0–100
  reportText: string | null;
}

export interface PendingApproval {
  id: string; type: string; title: string; submittedBy: string; submittedAt: string;
}

export interface LeaderEntry { position: string; holderName: string | null; }

export interface Announcement { id: string; title: string; body: string; publishedAt: string; author: string; }

export interface Report {
  id: string; title: string; body: string;
  authorName: string; status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  createdAt: string;
}

export interface MembershipAnalytics {
  totalMembers: number; verifiedMembers: number; activeMembers: number; excoOfficers: number;
  activeProjects: number; pendingTasks: number; completedTasks: number; pendingApprovals: number;
  byLevel: { label: string; count: number }[];
  byDepartment: { label: string; count: number }[];
  byState: { label: string; count: number }[];
  byLocalGovernment?: { label: string; count: number }[];
  byCategory: { label: string; count: number }[];
  registrationTrend: { week: string; count: number }[];
}