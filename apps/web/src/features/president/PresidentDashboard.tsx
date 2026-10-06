import { Users, UserCheck, Activity, BriefcaseBusiness, FolderKanban, ListChecks, CheckCircle2, Hourglass } from 'lucide-react';
import { DashboardStat } from '@/components/shared/DashboardStat';
import { DataTable } from '@/components/shared/DataTable';
import { ChartCard, PageHeader, EmptyState } from '@/components/shared/misc';
import { Badge, Button } from '@/components/ui/primitives';
import { useAnalytics, useApprovals, useApproveDecision, useAllTasks, useCurrentAdministration } from '@/hooks/queries';
import { TaskStatusBadge, statusLabel } from '@/components/shared/badges';
import { timeAgo } from '@/lib/utils';

const PALETTE = ['#15803d', '#f59e0b', '#0d9488', '#6366f1', '#ec4899', '#94a3b8'];

type ChartDatum = { label: string; count: number };
type TrendDatum = { week: string; count: number };

function SimpleBarChart({ data, color }: { data: ChartDatum[]; color: string }) {
  const maxValue = Math.max(...data.map((item) => item.count), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>{item.label}</span>
            <span>{item.count}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(8, (item.count / maxValue) * 100)}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SimpleTrendChart({ data, color }: { data: TrendDatum[]; color: string }) {
  const maxValue = Math.max(...data.map((item) => item.count), 1);
  const points = data
    .map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (item.count / maxValue) * 80;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-3">
      <svg viewBox="0 0 100 100" className="h-48 w-full overflow-visible">
        <defs>
          <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((y) => (
          <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="2 2" />
        ))}
        <polyline fill="none" stroke={color} strokeWidth="2.5" points={points} />
        <polygon points={`0,100 ${points} 100,100`} fill="url(#trend-fill)" opacity={0.8} />
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500">
        {data.map((item) => (
          <span key={item.week}>{item.week}</span>
        ))}
      </div>
    </div>
  );
}

function SimpleCategoryList({ data, palette }: { data: ChartDatum[]; palette: string[] }) {
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.label} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
            <span className="text-sm text-slate-600">{item.label}</span>
          </div>
          <span className="text-sm font-medium text-slate-800">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function PresidentDashboard() {
  const { data: stats } = useAnalytics();
  const { data: approvals = [] } = useApprovals();
  const { data: tasks = [] } = useAllTasks();
  const { data: administration } = useCurrentAdministration();
  const decide = useApproveDecision();

  if (!stats) return null;

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress');

  return (
    <div className="space-y-8">
      <PageHeader
        title="President Dashboard"
        description={administration ? `Live overview — administration ${administration.sessionLabel}` : 'Live overview'}
      />

      {/* Stats — every value comes from the service layer (DB queries in Phase 5) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat label="Total Members" value={stats.totalMembers} icon={Users} tone="green" />
        <DashboardStat label="Verified Members" value={stats.verifiedMembers} icon={UserCheck} hint={`${Math.round((stats.verifiedMembers / stats.totalMembers) * 100)}% of total`} />
        <DashboardStat label="Active Members" value={stats.activeMembers} icon={Activity} tone="blue" />
        <DashboardStat label="EXCO Officers" value={stats.excoOfficers} icon={BriefcaseBusiness} tone="gold" />
        <DashboardStat label="Active Projects" value={stats.activeProjects} icon={FolderKanban} />
        <DashboardStat label="Pending Tasks" value={stats.pendingTasks} icon={ListChecks} tone="red" hint="Open across all offices" />
        <DashboardStat label="Completed Tasks" value={stats.completedTasks} icon={CheckCircle2} tone="green" />
        <DashboardStat label="Pending Approvals" value={stats.pendingApprovals} icon={Hourglass} tone="gold" />
      </div>

      {/* Membership analytics — computed from DB, never hardcoded */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Members by Level" description="Automatically recalculated on every registration">
          <SimpleBarChart data={stats.byLevel} color="#15803d" />
        </ChartCard>

        <ChartCard title="Local Government Distribution" description="Breakdown by the local government areas represented in the current session">
          <SimpleBarChart data={stats.byState} color="#0f766e" />
        </ChartCard>

        <ChartCard title="Members by Faculty" description="The 9 faculties of FUD — live from registrations">
          <SimpleBarChart data={stats.byDepartment} color="#f59e0b" />
        </ChartCard>

        <ChartCard title="Members by Local Government" description="Representation across the 21 LGAs of Kogi State">
          <SimpleBarChart data={stats.byState} color="#0d9488" />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Membership Categories" description="Labels are configured by Central Admin">
          <SimpleCategoryList data={stats.byCategory} palette={PALETTE} />
        </ChartCard>

        <ChartCard title="State Coverage" description="State distribution of the current member base">
          <SimpleBarChart data={stats.byState} color="#6366f1" />
        </ChartCard>
      </div>

      <ChartCard title="Registration Trend" description="New members per week (current session)">
        <SimpleTrendChart data={stats.registrationTrend} color="#15803d" />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Pending Approvals</h2>
          <DataTable
            rows={approvals}
            keyOf={(a) => a.id}
            empty={<EmptyState title="No pending approvals" hint="Content submitted by officers will appear here." />}
            columns={[
              { header: 'Type', cell: (a) => <Badge className="bg-secondary text-secondary-foreground">{a.type}</Badge> },
              { header: 'Item', cell: (a) => <div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.submittedBy} · {timeAgo(a.submittedAt)}</p></div> },
              { header: '', className: 'text-right', cell: (a) => (
                <div className="flex justify-end gap-2">
                  <Button size="sm" onClick={() => decide.mutate({ id: a.id, decision: 'approved' })}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: a.id, decision: 'rejected' })}>Reject</Button>
                </div>
              )},
            ]}
          />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Open Tasks</h2>
          <DataTable
            rows={pendingTasks}
            keyOf={(t) => t.id}
            empty={<EmptyState title="No open tasks" />}
            columns={[
              { header: 'Task', cell: (t) => <p className="font-medium">{t.title}</p> },
              { header: 'Officer', cell: (t) => t.assigneeName },
              { header: 'Status', cell: (t) => <TaskStatusBadge task={t} /> },
              { header: 'Progress', className: 'text-right', cell: (t) => <span>{t.progress}% · {statusLabel(t.priority)}</span> },
            ]}
          />
        </section>
      </div>
    </div>
  );
}