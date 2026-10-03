import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send } from 'lucide-react';
import { Badge, Button, Input, Label, Select, Textarea } from '@/components/ui/primitives';
import { PageHeader, EmptyState } from '@/components/shared/misc';
import { submissionsService } from '@/services/submissions.service';
import type { Submission, SubmissionStatus, SubmissionType } from '@/services/submissions.service';
import { formatDate, timeAgo } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  submitted: 'bg-slate-100 text-slate-700', under_review: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-700', resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-muted text-muted-foreground',
};
const TYPE_LABEL: Record<string, string> = {
  suggestion: 'Suggestion', issue: 'Issue', request: 'Request',
  support: 'Support', welfare: 'Welfare',
};

export default function MemberSubmissions() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ['my-submissions'], queryFn: () => submissionsService.mine() });

  const [form, setForm] = useState<{ type: SubmissionType; subject: string; message: string; isAnonymous: boolean }>({
    type: 'suggestion', subject: '', message: '', isAnonymous: false,
  });
  const [createdRef, setCreatedRef] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => submissionsService.create(form),
    onSuccess: (r) => {
      setCreatedRef(r.reference);
      setForm({ type: 'suggestion', subject: '', message: '', isAnonymous: false });
      qc.invalidateQueries({ queryKey: ['my-submissions'] });
    },
  });

  const valid = form.subject.length >= 3 && form.message.length >= 5;

  return (
    <div>
      <PageHeader title="Suggestions & Reports" description="Talk to your EXCO — suggestions, issues, requests and welfare matters. Anonymous submissions never show your name to staff." />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* New submission */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-card p-5">
            <p className="mb-4 font-semibold">New submission</p>
            {createdRef && (
              <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Submitted! Your reference: <span className="font-mono font-bold">{createdRef}</span>
              </p>
            )}
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SubmissionType })}>
                  {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Subject</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Short summary" />
              </div>
              <div className="space-y-1.5"><Label>Message</Label>
                <Textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Describe it fully…" />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" checked={form.isAnonymous}
                  onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />
                Submit anonymously
              </label>
              {create.isError && <p className="text-sm text-red-600">{(create.error as Error).message}</p>}
              <Button className="w-full" disabled={!valid || create.isPending} onClick={() => { setCreatedRef(null); create.mutate(); }}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit
              </Button>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="lg:col-span-3">
          {items.length === 0
            ? <EmptyState title="No submissions yet" hint="Your submissions and the responses will appear here." />
            : <div className="space-y-3">
                {items.map((s: Submission) => (
                  <div key={s.id} className="rounded-xl border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-secondary text-secondary-foreground">{TYPE_LABEL[s.type]}</Badge>
                        <Badge className={STATUS_STYLE[s.status]}>{s.status.replace('_', ' ')}</Badge>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{s.reference}</span>
                    </div>
                    <p className="mt-2 font-medium">{s.subject}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{s.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDate(s.createdAt)} · {timeAgo(s.createdAt)}{s.isAnonymous ? ' · anonymous' : ''}</p>
                    {s.responseText && (
                      <div className="mt-3 rounded-lg bg-secondary/60 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary-foreground">EXCO response</p>
                        <p className="mt-1 whitespace-pre-line text-sm">{s.responseText}</p>
                        {s.respondedAt && <p className="mt-1 text-xs text-muted-foreground">{timeAgo(s.respondedAt)}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>}
        </div>
      </div>
    </div>
  );
}