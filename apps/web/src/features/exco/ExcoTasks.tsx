    import { useState } from 'react';
import { PageHeader, EmptyState } from '@/components/shared/misc';
import { TaskCard } from '@/components/shared/TaskCard';
import { useMyTasks } from '@/hooks/queries';
import { UpdateProgressDialog } from '@/features/vp/UpdateProgressDialog';
import type { Task } from '@/types/task';

export default function ExcoTasks() {
  const { data: tasks = [] } = useMyTasks();
  const [editing, setEditing] = useState<Task | null>(null);

  return (
    <div>
      <PageHeader title="My Tasks" description="Tasks assigned to your office — update progress and submit reports." />
      {tasks.length === 0
        ? <EmptyState title="No tasks yet" hint="Assigned tasks will appear here." />
        : <div className="grid gap-4 md:grid-cols-2">
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t}
                action={<button className="text-sm font-medium text-primary hover:underline" onClick={() => setEditing(t)}>Update progress</button>} />
            ))}
          </div>}
      {editing && <UpdateProgressDialog task={editing} open={!!editing} onOpenChange={(v: boolean) => !v && setEditing(null)} />}
    </div>
  );
}