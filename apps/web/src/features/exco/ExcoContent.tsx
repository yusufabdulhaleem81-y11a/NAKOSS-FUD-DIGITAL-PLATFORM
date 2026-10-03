import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Badge, Button, Input, Label, Progress, Select, Textarea } from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PageHeader, EmptyState } from '@/components/shared/misc';
import { useAuthStore } from '@/store/auth.store';
import { PERMISSION } from '@/lib/permissions';
import { contentService } from '@/services/content.service';
import type { MyContentItem } from '@/services/content.service';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Tab = 'news' | 'events' | 'projects' | 'announcements';

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground', pending_review: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

const TAB_PERMISSION: Record<Tab, string> = {
  news: PERMISSION.NEWS_MANAGE,
  events: PERMISSION.EVENTS_MANAGE,
  projects: PERMISSION.CONTENT_APPROVE,
  announcements: PERMISSION.NEWS_MANAGE,
};

export default function ExcoContent({ defaultTab = 'news' }: { defaultTab?: Tab }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const allowed = (Object.keys(TAB_PERMISSION) as Tab[]).filter((t) => hasPermission(TAB_PERMISSION[t]));
  const [tab, setTab] = useState<Tab>(allowed.includes(defaultTab) ? defaultTab : (allowed[0] ?? 'news'));

  if (allowed.length === 0) {
    return <EmptyState title="No content permissions" hint="Your position does not include content management. Submitted items appear after an authorised officer approves them." />;
  }

  return (
    <div>
      <PageHeader title="Content Studio" description="Create news, events, projects and announcements. Everything goes through approval before publishing." />

      <div className="mb-6 flex flex-wrap gap-2">
        {allowed.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors',
              tab === t ? 'bg-primary text-primary-foreground' : 'border bg-card text-muted-foreground hover:bg-muted')}>
            {t}
          </button>
        ))}
      </div>

      <ContentList key={tab} tab={tab} />
    </div>
  );
}

function ContentList({ tab }: { tab: Tab }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const fetcher = {
    news: contentService.myNews, events: contentService.myEvents,
    projects: contentService.myProjects, announcements: contentService.myAnnouncements,
  }[tab];

  const { data: items = [], isLoading } = useQuery({ queryKey: ['content-mine', tab], queryFn: fetcher });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New {tab.slice(0, -1) === 'announcemen' ? 'announcement' : tab.slice(0, -1)}</Button>
      </div>

      {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        : items.length === 0 ? <EmptyState title={`No ${tab} yet`} hint={`Create your first one — it will go for approval before publishing.`} />
        : <div className="space-y-2">
            {items.map((it: MyContentItem) => (
              <div key={it.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{it.title}</p>
                  <p className="text-xs text-muted-foreground">Created {formatDate(it.createdAt)}{it.publishedAt ? ` · published ${formatDate(it.publishedAt)}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  {tab === 'projects' && it.progress !== undefined && <div className="w-28"><Progress value={it.progress} /></div>}
                  <Badge className={STATUS_STYLE[it.status] ?? ''}>{it.status.replace('_', ' ')}</Badge>
                </div>
              </div>
            ))}
          </div>}

      <CreateDialog key={`d-${tab}`} tab={tab} open={open} onClose={() => setOpen(false)}
        onDone={() => qc.invalidateQueries({ queryKey: ['content-mine', tab] })} />
    </div>
  );
}

function CreateDialog({ tab, open, onClose, onDone }: { tab: Tab; open: boolean; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const mutation = useMutation({
    mutationFn: async () => {
      if (tab === 'news') {
        const fd = new FormData();
        fd.set('title', form.title ?? ''); fd.set('excerpt', form.excerpt ?? ''); fd.set('body', form.body ?? '');
        if (file) fd.set('cover', file);
        return contentService.createNews(fd);
      }
      if (tab === 'events') {
        const fd = new FormData();
        fd.set('title', form.title ?? ''); fd.set('description', form.description ?? '');
        fd.set('startAt', new Date(form.startAt ?? Date.now()).toISOString());
        if (form.endAt) fd.set('endAt', new Date(form.endAt).toISOString());
        fd.set('location', form.location ?? '');
        if (file) fd.set('cover', file);
        return contentService.createEvent(fd);
      }
      if (tab === 'projects') return contentService.createProject({ title: form.title ?? '', description: form.description, progress: Number(form.progress ?? 0) });
      return contentService.createAnnouncement({ title: form.title ?? '', body: form.body ?? '' });
    },
    onSuccess: () => { onDone(); onClose(); },
  });

  const valid = tab === 'events' ? !!form.title && !!form.startAt : !!form.title && (tab === 'projects' || !!form.body);

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent>
        <DialogTitle>New {tab.slice(0, -1) === 'announcemen' ? 'announcement' : tab.slice(0, -1)}</DialogTitle>
        <DialogDescription>Submitted for approval — visible publicly once approved.</DialogDescription>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5"><Label>Title</Label><Input value={form.title ?? ''} onChange={set('title')} /></div>

          {tab === 'news' && (<>
            <div className="space-y-1.5"><Label>Excerpt (optional)</Label><Input value={form.excerpt ?? ''} onChange={set('excerpt')} /></div>
            <div className="space-y-1.5"><Label>Body</Label><Textarea rows={7} value={form.body ?? ''} onChange={set('body')} /></div>
            <div className="space-y-1.5"><Label>Cover image (optional)</Label><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          </>)}

          {tab === 'events' && (<>
            <div className="space-y-1.5"><Label>Description</Label><Textarea rows={4} value={form.description ?? ''} onChange={set('description')} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Starts</Label><Input type="datetime-local" value={form.startAt ?? ''} onChange={set('startAt')} /></div>
              <div className="space-y-1.5"><Label>Ends (optional)</Label><Input type="datetime-local" value={form.endAt ?? ''} onChange={set('endAt')} /></div>
            </div>
            <div className="space-y-1.5"><Label>Location</Label><Input value={form.location ?? ''} onChange={set('location')} /></div>
            <div className="space-y-1.5"><Label>Cover image (optional)</Label><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          </>)}

          {tab === 'projects' && (<>
            <div className="space-y-1.5"><Label>Description</Label><Textarea rows={5} value={form.description ?? ''} onChange={set('description')} /></div>
            <div className="space-y-1.5"><Label>Progress — {form.progress ?? 0}%</Label>
              <input type="range" min={0} max={100} step={5} value={form.progress ?? 0} onChange={set('progress')} className="w-full accent-[hsl(var(--primary))]" /></div>
          </>)}

          {tab === 'announcements' && (
            <div className="space-y-1.5"><Label>Message</Label><Textarea rows={5} value={form.body ?? ''} onChange={set('body')} /></div>
          )}

          {mutation.isError && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
          <Button className="w-full" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Submitting…' : 'Submit for approval'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}