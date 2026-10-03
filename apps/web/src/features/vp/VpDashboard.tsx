import { useState } from 'react';
import { ListTodo, Send, AlarmClock, FileText, Plus } from 'lucide-react';
import { Button, Badge } from '@/components/ui/primitives';
import { DashboardStat } from '@/components/shared/DashboardStat';
import { PageHeader, EmptyState } from '@/components/shared/misc';
import { TaskCard } from '@/components/shared/TaskCard';
import { useCurrentAdministration, useLeadership, useMyTasks } from '@/hooks/queries';
import { AssignTaskDialog } from './AssignTaskDialog';
import { UpdateProgressDialog } from './UpdateProgressDialog';
import type { Task } from '@/types/task';

export default function VpDashboard() {
  const { data: myTasks = [] } = useMyTasks();
  const { data: leadership = [] } = useLeadership();
  const { data: administration } = useCurrentAdministration();
  const [assignOpen, setAssignOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const overdue = myTasks.filter((t) => t.status !== 'completed' && new Date(t.deadline) < new Date()).length;
  const submitted = myTasks.filter((t) => t.status === 'submitted').length;
  const filledPositions = leadership.filter((l) => l.holderName).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Vice President"
        description={administration ? `Coordination workspace — administration ${administration.sessionLabel}` : 'Coordination workspace'}
        actions={<Button onClick={() => setAssignOpen(true)}><Plus className="h-4 w-4" /> Assign task</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat label="My Open Tasks" value={myTasks.filter((t) => t.status !== 'completed').length} icon={ListTodo} />
        <DashboardStat label="Submitted for Review" value={submitted} icon={Send} tone="gold" />
        <DashboardStat label="Overdue" value={overdue} icon={AlarmClock} tone="red" />
        <DashboardStat label="Offices Filled" value={`${filledPositions}/17`} icon={FileText} tone="green" hint="Current administration" />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">My Tasks</h2>
        {myTasks.length === 0
          ? <EmptyState title="No tasks assigned to you" hint="Tasks assigned by the President or Central Admin will appear here." />
          : <div className="grid gap-4 md:grid-cols-2">
              {myTasks.map((t) => (
                <TaskCard key={t.id} task={t}
                  action={<Button size="sm" variant="outline" onClick={() => setEditing(t)}>Update progress</Button>} />
              ))}
            </div>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">EXCO Coordination</h2>
        <div className="grid gap-2 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
          {leadership.map((l) => (
            <div key={l.position} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
              <span className="text-muted-foreground">{l.position}</span>
              {l.holderName
                ? <Badge className="bg-emerald-100 text-emerald-700">{l.holderName}</Badge>
                : <Badge className="bg-muted text-muted-foreground">Vacant</Badge>}
            </div>
          ))}
        </div>
      </section>

      <AssignTaskDialog open={assignOpen} onOpenChange={setAssignOpen} />
      {editing && <UpdateProgressDialog task={editing} open={!!editing} onOpenChange={(v: boolean) => !v && setEditing(null)} />}
    </div>
  );
}