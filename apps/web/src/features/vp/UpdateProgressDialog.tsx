import { useState } from 'react';
import { useUpdateTask } from '@/hooks/queries';
import { Button, Input, Label, Select, Textarea } from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Task } from '@/types/task';

export function UpdateProgressDialog({ task, open, onOpenChange }: {
  task: Task; open: boolean; onOpenChange: (v: boolean) => void;
}) {
  const update = useUpdateTask();
  const [progress, setProgress] = useState(task.progress);
  const [status, setStatus] = useState(task.status);
  const [report, setReport] = useState(task.reportText ?? '');

  const submit = () =>
    update.mutate(
      { id: task.id, progress, status, reportText: report || undefined },
      { onSuccess: () => onOpenChange(false) },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Update progress</DialogTitle>
        <DialogDescription>{task.title}</DialogDescription>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Progress — {progress}%</Label>
            <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full accent-[hsl(var(--primary))]" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onChange={(e) => setStatus(e.target.value as Task['status'])}>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Report note (optional)</Label>
            <Textarea value={report} onChange={(e) => setReport(e.target.value)} placeholder="What has been done?" />
          </div>
          <Button className="w-full" onClick={submit} disabled={update.isPending}>Save update</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}