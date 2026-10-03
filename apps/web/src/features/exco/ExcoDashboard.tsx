import { BriefcaseBusiness, ClipboardList, FileBarChart, Inbox } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Badge } from '@/components/ui/primitives';
import { DashboardStat } from '@/components/shared/DashboardStat';
import { PageHeader } from '@/components/shared/misc';
import { useAnnouncements, useMyTasks, useMyReports } from '@/hooks/queries';
import { useAuthStore } from '@/store/auth.store';
import { PERMISSION } from '@/lib/permissions';
import { timeAgo } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/** Office modules derive from POSITION permissions — never hardcoded per office. */
const OFFICE_MODULES: { permission: string; title: string; description: string; icon: LucideIcon; href: string }[] = [
  { permission: PERMISSION.NEWS_MANAGE, title: 'News & Press', description: 'Publish news, press releases and announcements.', icon: FileBarChart, href: '/exco/news' },
  { permission: PERMISSION.GALLERY_MANAGE, title: 'Media & Gallery', description: 'Upload and organise event photos.', icon: BriefcaseBusiness, href: '/exco/gallery' },
  { permission: PERMISSION.WELFARE_MANAGE, title: 'Welfare Queue', description: 'Review and respond to welfare requests.', icon: Inbox, href: '/exco/welfare' },
  { permission: PERMISSION.FINANCE_MANAGE, title: 'Financial Records', description: 'Budgets, expenses and financial reports.', icon: FileBarChart, href: '/exco/finance' },
  { permission: PERMISSION.EVENTS_MANAGE, title: 'Events & Activities', description: 'Plan and publish association events.', icon: ClipboardList, href: '/exco/events' },
  { permission: PERMISSION.RESOURCES_UPLOAD, title: 'Resource Uploads', description: 'Past questions and study materials.', icon: ClipboardList, href: '/exco/resources' },
];

export default function ExcoDashboard() {
  const profile = useAuthStore((s) => s.profile);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { data: myTasks = [] } = useMyTasks();
  const { data: reports = [] } = useMyReports();
  const { data: announcements = [] } = useAnnouncements();

  const modules = OFFICE_MODULES.filter((m) => hasPermission(m.permission));
  const openTasks = myTasks.filter((t) => t.status !== 'completed').length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="EXCO Workspace"
        description={profile?.administrationSession ? `Serving — administration ${profile.administrationSession}` : undefined}
      />

      {/* Office identity */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20 text-accent-foreground">
          <BriefcaseBusiness className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">My Office</p>
          <p className="text-lg font-bold">{profile?.position ?? 'Officer'}</p>
        </div>
        <Badge className="ml-auto bg-emerald-100 text-emerald-700">✓ Verified Officer</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardStat label="Open Tasks" value={openTasks} icon={ClipboardList} />
        <DashboardStat label="My Reports" value={reports.length} icon={FileBarChart} tone="blue" />
        <DashboardStat label="Office Modules" value={modules.length} icon={BriefcaseBusiness} tone="gold" />
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">My Office Modules</h2>
        {modules.length === 0
          ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No office-specific modules assigned to this position yet.</p>
          : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m) => (
                <NavLink key={m.href} to={m.href} className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary/40">
                  <m.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 font-semibold group-hover:text-primary">{m.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                </NavLink>
              ))}
            </div>}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Announcements</h2>
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{a.title}</p>
                <span className="whitespace-nowrap text-xs text-muted-foreground">{timeAgo(a.publishedAt)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">— {a.author}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}