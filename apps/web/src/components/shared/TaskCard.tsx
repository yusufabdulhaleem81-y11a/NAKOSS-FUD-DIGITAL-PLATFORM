import { Card, CardContent } from '@/components/ui/primitives';
import { Progress } from '@/components/ui/primitives';
import { TaskPriorityBadge, TaskStatusBadge } from './badges';
import { formatDate, cn } from '@/lib/utils';
import { CalendarDays, User2 } from 'lucide-react';
import { isTaskOverdue } from './badges';
import type { Task } from '@/types/task';

export function TaskCard({ task, action }: { task: Task; action?: React.ReactNode }) {
  const overdue = isTaskOverdue(task);
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-medium leading-snug">{task.title}</p>
          <div className="flex gap-1.5"><TaskPriorityBadge priority={task.priority} /><TaskStatusBadge task={task} /></div>
        </div>
        {task.description && <p className="mt-1.5 text-sm text-muted-foreground">{task.description}</p>}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><User2 className="h-3 w-3" />{task.assigneeName}{task.assigneePosition ? ` · ${task.assigneePosition}` : ''}</span>
          <span className={cn('inline-flex items-center gap-1', overdue && 'font-medium text-red-600')}>
            <CalendarDays className="h-3 w-3" />{formatDate(task.deadline)}{overdue ? ' · overdue' : ''}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Progress value={task.progress} />
          <span className="w-10 text-right text-xs text-muted-foreground">{task.progress}%</span>
        </div>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}