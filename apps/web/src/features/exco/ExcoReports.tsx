import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { Badge, Button, Input, Label, Textarea } from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/misc';
import { useMyReports } from '@/hooks/queries';
import { dataService } from '@/services/data.service';
import { formatDate } from '@/lib/utils';
import { qk } from '@/hooks/queries';

const REPORT_BADGE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground', pending_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700',
};

function NewReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useMutation({
    mutationFn: (v: { title: string; body: string }) => dataService.createReport(v.title, v.body),
    onSuccess: () => onOpenChange(false),
  });
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>New office report</DialogTitle>
        <DialogDescription>Submitted reports go for review before approval.</DialogDescription>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Body</Label><Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <Button className="w-full" disabled={create.isPending || !title || !body}
            onClick={() => create.mutate({ title, body }, { onSuccess: () => { void qc.invalidateQueries({ queryKey: qk.myReports }); setTitle(''); setBody(''); } })}>
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Submit for review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ExcoReports() {
  const { data: reports = [] } = useMyReports();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader title="My Reports" description="Office reports and their review status."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New report</Button>} />

      <DataTable
        rows={reports} keyOf={(r) => r.id}
        columns={[
          { header: 'Title', cell: (r) => <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</p></div> },
          { header: 'Status', cell: (r) => <Badge className={REPORT_BADGE[r.status]}>{r.status.replace('_', ' ')}</Badge> },
        ]}
      />
      <NewReportDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}