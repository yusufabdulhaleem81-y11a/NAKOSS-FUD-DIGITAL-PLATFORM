import { Link } from 'react-router-dom';
import { Badge, Button } from '@/components/ui/primitives';
import { DashboardStat } from '@/components/shared/DashboardStat';
import { PageHeader, EmptyState } from '@/components/shared/misc';
import { useAnalytics, useApprovals, useApproveDecision, useCurrentAdministration } from '@/hooks/queries';
import { AdminNav } from './AdminNav';
import { timeAgo } from '@/lib/utils';
import { Users, UserCheck, Hourglass, ListChecks } from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats } = useAnalytics();
  const { data: approvals = [] } = useApprovals();
  const decide = useApproveDecision();
  const { data: administration } = useCurrentAdministration();

  return (
    <div>
      <PageHeader title="Central Admin" description={administration ? `Platform overview — administration ${administration.sessionLabel}` : 'Platform overview'} />
      <AdminNav />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStat label="Total Members" value={stats.totalMembers} icon={Users} tone="green" />
          <DashboardStat label="Verified" value={stats.verifiedMembers} icon={UserCheck} />
          <DashboardStat label="Pending Approvals" value={stats.pendingApprovals} icon={Hourglass} tone="gold" />
          <DashboardStat label="Pending Tasks" value={stats.pendingTasks} icon={ListChecks} tone="red" />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Pending Approvals</h2>
          {approvals.length === 0
            ? <EmptyState title="No pending approvals" hint="Officer submissions will appear here." />
            : approvals.map((a) => (
              <div key={a.id} className="mb-2 flex items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.type} · {a.submittedBy} · {timeAgo(a.submittedAt)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => decide.mutate({ id: a.id, decision: 'approved' })}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: a.id, decision: 'rejected' })}>Reject</Button>
                </div>
              </div>
            ))}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { to: '/admin/students', label: 'Verify students', hint: 'Approve pending registrations' },
              { to: '/admin/exco', label: 'Manage EXCO', hint: 'Invite officers · temp passwords' },
              { to: '/admin/administrations', label: 'Administrations', hint: 'Create · switch · archive' },
              { to: '/admin/audit', label: 'Audit log', hint: 'Every admin action recorded' },
            ].map((q) => (
              <Link key={q.to} to={q.to} className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/40">
                <p className="font-medium">{q.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{q.hint}</p>
              </Link>
            ))}
          </div>
          {stats && stats.pendingApprovals > 0 && (
            <Badge className="mt-4 bg-amber-100 text-amber-800">{stats.pendingApprovals} item(s) awaiting your decision</Badge>
          )}
        </section>
      </div>
    </div>
  );
}