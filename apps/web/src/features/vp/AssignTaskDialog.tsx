import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button, Input, Label, Select, Textarea } from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAssignTask } from '@/hooks/queries';
import { mockDb } from '@/mocks/data';

const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  assigneeId: z.string().min(1, 'Select an officer'),
  deadline: z.string().min(1, 'Pick a deadline'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});
type FormValues = z.infer<typeof schema>;

export function AssignTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const assign = useAssignTask();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium' },
  });

  const onSubmit = (v: FormValues) =>
    assign.mutate(v, { onSuccess: () => { reset(); onOpenChange(false); } });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Assign a task</DialogTitle>
        <DialogDescription>Delegate work to an EXCO officer for the current administration.</DialogDescription>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input placeholder="e.g. Compile welfare needs assessment" {...register('title')} />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea placeholder="Details, expectations, links…" {...register('description')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Assign to</Label>
              <Select {...register('assigneeId')}>
                <option value="">Select officer…</option>
                {mockDb.officers.map((o) => <option key={o.id} value={o.id}>{o.name} — {o.position}</option>)}
              </Select>
              {errors.assigneeId && <p className="text-xs text-red-600">{errors.assigneeId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select {...register('priority')}>
                <option value="low">Low</option><option value="medium">Medium</option>
                <option value="high">High</option><option value="urgent">Urgent</option>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Deadline</Label>
            <Input type="datetime-local" {...register('deadline')} />
            {errors.deadline && <p className="text-xs text-red-600">{errors.deadline.message}</p>}
          </div>
          {assign.isError && <p className="text-sm text-red-600">{(assign.error as Error).message}</p>}
          <Button type="submit" className="w-full" disabled={assign.isPending}>
            {assign.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Assign task
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}