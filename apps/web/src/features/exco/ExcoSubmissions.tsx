import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Label, Select, Textarea } from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PageHeader, EmptyState } from '@/components/shared/misc';
import { useAuthStore } from '@/store/auth.store';
import { PERMISSION } from '@/lib/permissions';
import { submissionsService } from '@/services/submissions.service';
import type { Submission, SubmissionStatus } from '@/services/submissions.service';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const TYPE_LABEL: Record<string, string> = {
  suggestion: 'Suggestions', issue: 'Issues', request: 'Requests',
  support: 'Support', welfare: 'Welfare',
};
const STATUS_STYLE: Record<string, string> = {
  submitted: 'bg-slate-100 text-slate-700', under_review: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-700', resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-muted text-muted-foreground',
};

export default function ExcoSubmissions({ defaultType = 'all' }: { defaultType?: string }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [tab, setTab] = useState(defaultType);

  const tabs: { key: string; label: string }[] = [];
  if (hasPermission(PERMISSION.SUBMISSIONS_RESPOND)) {
    tabs.push({ key: 'all', label: 'All' });
    for (const [k, l] of Object.entries(TYPE_LABEL)) tabs.push({ key: k, label: l });
  } else if (hasPermission(PERMISSION.WELFARE_MANAGE)) {
    tabs.push({ key: 'welfare', label: 'Welfare' });
  }

  if (tabs.length === 0) {
    return <EmptyState title="No submission permissions" hint="Your position does not include a submissions queue." />;
  }
  const activeTab = tabs.some((t) => t.key === tab) ? tab : tabs[0].key;

  return (
    <div>
      <PageHeader title="Submissions Queue" description="Member suggestions, issues, requests and welfare matters. Anonymous items never reveal the member's name." />
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === t.key ? 'bg-primary text-primary-foreground' : 'border bg-card text-muted-foreground hover:bg-muted')}>
            {t.label}
          </button>
        ))}
      </div>
      <Queue key={activeTab} type={activeTab === 'all' ? undefined : activeTab} />
    </div>
  );
}

function Queue({ type }: { type?: string }) {
  const qc = useQueryClient();
  const [responding, setResponding] = useState<Submission | null>(null);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['submissions-queue', type],
    queryFn: () => submissionsService.queue({ type }),
  });

  return (
    <div>
      {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        : items.length === 0 ? <EmptyState title="Queue is empty" hint="New submissions in this category will appear here." />
        : <div className="space-y-3">
            {items.map((s) => (
              <div key={s.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-secondary text-secondary-foreground">{s.submitterName}</Badge>
                    <Badge className={STATUS_STYLE[s.status]}>{s.status.replace('_', ' ')}</Badge>
                    {s.isAnonymous && <Badge className="bg-muted text-muted-foreground">anonymous</Badge>}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{s.reference}</span>
                </div>
                <p className="mt-2 font-medium">{s.subject}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{s.message}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</p>
                  <Button size="sm" variant="outline" onClick={() => setResponding(s)}>Respond</Button>
                </div>
                {s.responseText && (
                  <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm">
                    <span className="font-semibold">Response:</span> <span className="whitespace-pre-line">{s.responseText}</span>
                  </div>
                )}
              </div>
            ))}
          </div>}

      {responding && (
        <RespondDialog submission={responding} onClose={() => setResponding(null)}
          onDone={() => qc.invalidateQueries({ queryKey: ['submissions-queue'] })} />
      )}
    </div>
  );
}

function RespondDialog({ submission, onClose, onDone }: { submission: Submission; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<SubmissionStatus>(submission.status);
  const [responseText, setResponseText] = useState('');

  const update = useMutation({
    mutationFn: () => submissionsService.update(submission.id, {
      status, responseText: responseText || undefined,
    }),
    onSuccess: () => { onDone(); onClose(); },
  });

  return (
    <Dialog open onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent>
        <DialogTitle>Respond — {submission.reference}</DialogTitle>
        <DialogDescription>
          {submission.subject}{submission.isAnonymous ? ' · anonymous submission (name hidden)' : ` · from ${submission.submitterName}`}
        </DialogDescription>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as SubmissionStatus)}>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Response to the member (they get a notification)</Label>
            <Textarea rows={4} value={responseText} onChange={(e) => setResponseText(e.target.value)} placeholder="Optional — but members love answers…" />
          </div>
          {update.isError && <p className="text-sm text-red-600">{(update.error as Error).message}</p>}
          <Button className="w-full" disabled={update.isPending} onClick={() => update.mutate()}>
            {update.isPending ? 'Saving…' : 'Save update'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}