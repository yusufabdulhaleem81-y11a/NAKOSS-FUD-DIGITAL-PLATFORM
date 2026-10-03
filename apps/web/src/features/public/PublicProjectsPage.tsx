import { useQuery } from '@tanstack/react-query';
import { Badge, Progress, Skeleton } from '@/components/ui/primitives';
import { contentService } from '@/services/content.service';
import { formatDate } from '@/lib/utils';

const PROJECT_STATUS: Record<string, string> = {
  planned: 'bg-blue-100 text-blue-700', ongoing: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-700', suspended: 'bg-red-100 text-red-700',
};

export default function PublicProjectsPage() {
  const { data: projects = [], isLoading } = useQuery({ queryKey: ['public-projects'], queryFn: () => contentService.getProjects() });

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">Projects</h1>
      <p className="mt-1 text-muted-foreground">What each administration is delivering.</p>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        {projects.map((p) => (
          <div key={p.slug} className="flex flex-col rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <Badge className={PROJECT_STATUS[p.status] ?? 'bg-muted'}>{p.status}</Badge>
              {p.sessionLabel && <span className="text-xs text-muted-foreground">{p.sessionLabel}</span>}
            </div>
            <p className="mt-3 font-semibold leading-snug">{p.title}</p>
            {p.description && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>}
            <div className="mt-auto pt-4">
              <div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{p.progress}%</span></div>
              <Progress value={p.progress} />
            </div>
          </div>
        ))}
      </div>

      {!isLoading && projects.length === 0 && (
        <p className="mt-8 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No published projects yet.</p>
      )}
    </div>
  );
}

