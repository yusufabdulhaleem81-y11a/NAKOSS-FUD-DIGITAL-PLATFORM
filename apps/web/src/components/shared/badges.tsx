import { Badge } from '@/components/ui/primitives';
import type { Task } from '@/types/task';

const priorityStyles: Record<Task['priority'], string> = {
  low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  urgent: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
};

const statusStyles: Record<Task['status'], string> = {
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  submitted: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
};

export function statusLabel(priority: Task['priority']) {
  return priority.charAt(0).toUpperCase() + priority.slice(1).replace('_', ' ');
}

export function TaskPriorityBadge({ priority }: { priority: Task['priority'] }) {
  return <Badge className={priorityStyles[priority]}>{statusLabel(priority)}</Badge>;
}

export function TaskStatusBadge({ task }: { task: Pick<Task, 'status'> }) {
  const label = task.status.replace('_', ' ');
  return <Badge className={statusStyles[task.status]}>{label}</Badge>;
}

export function isTaskOverdue(task: Pick<Task, 'deadline' | 'status'>) {
  if (task.status === 'completed' || task.status === 'rejected') return false;
  const dueAt = new Date(task.deadline).getTime();
  return Number.isFinite(dueAt) && dueAt < Date.now();
}
