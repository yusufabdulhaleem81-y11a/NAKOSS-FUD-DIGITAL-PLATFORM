import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Badge, Button, Input, Label, Select } from '@/components/ui/primitives';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader, EmptyState } from '@/components/shared/misc';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AdminNav } from './AdminNav';
import { useAdminMembers, useVerifyMember, useUpdateMember } from '@/hooks/adminQueries';
import { registrationService } from '@/services/registration.service';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
import type { AdminMember } from '@/services/admin.service';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800', verified: 'bg-emerald-100 text-emerald-700',
  active: 'bg-emerald-100 text-emerald-700', suspended: 'bg-red-100 text-red-700',
  graduated: 'bg-slate-100 text-slate-700',
};

export default function AdminStudents() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<AdminMember | null>(null);

  const { data, isLoading } = useAdminMembers({ page, q, status });
  const verify = useVerifyMember();
  const update = useUpdateMember();

  const rows = data?.data ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <PageHeader title="Students" description="Search, verify and manage membership records." />
      <AdminNav />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, matric or membership no…"
            value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select className="w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="active">Active</option>
        </Select>
      </div>

      <DataTable
        rows={rows} keyOf={(m) => m.id}
        empty={isLoading ? undefined : <EmptyState title="No students found" hint="Try a different search or status filter." />}
        columns={[
          { header: 'Member', cell: (m) => (
            <div><p className="font-medium">{m.fullName}</p><p className="font-mono text-xs text-muted-foreground">{m.membershipNumber}</p></div>
          )},
          { header: 'Matric', cell: (m) => <span className="font-mono text-xs">{m.matricNumber}</span> },
          { header: 'Faculty', cell: (m) => <span className="text-sm">{m.department ?? '—'}</span> },
          { header: 'Level', cell: (m) => <span className="text-sm">{m.level ?? '—'}</span> },
          { header: 'Registered', cell: (m) => <span className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</span> },
          { header: 'Status', cell: (m) => <Badge className={STATUS_STYLE[m.status] ?? ''}>{m.status}</Badge> },
          { header: '', className: 'text-right', cell: (m) => (
            <div className="flex justify-end gap-2">
              {m.status === 'pending' && (
                <Button size="sm" disabled={verify.isPending}
                  onClick={() => verify.mutate(m.id, { onSuccess: () => setEditing(null) })}>
                  <Check className="h-3 w-3" /> Verify
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setEditing(m)}>Edit</Button>
            </div>
          )},
        ]}
      />

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.total} member(s) · page {data.page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {editing && <EditMemberDialog member={editing} onClose={() => setEditing(null)} onSave={(patch) =>
        update.mutate({ id: editing.id, patch }, { onSuccess: () => setEditing(null) })} saving={update.isPending} />}
    </div>
  );
}

function EditMemberDialog({ member, onClose, onSave, saving }: {
  member: AdminMember; onClose: () => void; onSave: (patch: Record<string, unknown>) => void; saving: boolean;
}) {
  const { data: ref } = useQuery({ queryKey: ['reference-data'], queryFn: () => registrationService.getReferenceData(), staleTime: 10 * 60_000 });
  const [form, setForm] = useState({
    fullName: member.fullName, phone: member.phone ?? '',
    departmentId: '', levelId: '', stateId: '', categoryId: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent>
        <DialogTitle>Edit member</DialogTitle>
        <DialogDescription>{member.membershipNumber} — changes reflect on the card and dashboards immediately.</DialogDescription>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5"><Label>Full name</Label><Input value={form.fullName} onChange={set('fullName')} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={set('phone')} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Faculty</Label>
              <Select value={form.departmentId} onChange={set('departmentId')}>
                <option value="">(unchanged)</option>
                {(ref?.departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select></div>
            <div className="space-y-1.5"><Label>Level</Label>
              <Select value={form.levelId} onChange={set('levelId')}>
                <option value="">(unchanged)</option>
                {(ref?.levels ?? []).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </Select></div>
            <div className="space-y-1.5"><Label>LGA (Kogi State)</Label>
              <Select value={form.stateId} onChange={set('stateId')}>
                <option value="">(unchanged)</option>
                {(ref?.states ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select></div>
            <div className="space-y-1.5"><Label>Category</Label>
              <Select value={form.categoryId} onChange={set('categoryId')}>
                <option value="">(unchanged)</option>
                {(ref?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select></div>
          </div>
          <Button className="w-full" disabled={saving} onClick={() => {
            const patch: Record<string, unknown> = { fullName: form.fullName, phone: form.phone || null };
            if (form.departmentId) patch.departmentId = form.departmentId;
            if (form.levelId) patch.levelId = form.levelId;
            if (form.stateId) patch.stateId = form.stateId;
            if (form.categoryId) patch.categoryId = form.categoryId;
            onSave(patch);
          }}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}