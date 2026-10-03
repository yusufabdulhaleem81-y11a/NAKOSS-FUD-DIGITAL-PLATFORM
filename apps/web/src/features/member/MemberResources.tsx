import type { ResourceFilters } from '@/services/resources.service';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Search, Upload } from 'lucide-react';
import { Button, Input, Label, Select } from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/DataTable';
import { PageHeader, EmptyState } from '@/components/shared/misc';
import { useAuthStore } from '@/store/auth.store';
import { PERMISSION } from '@/lib/permissions';
import { resourcesService } from '@/services/resources.service';
import type { PastQuestionItem } from '@/services/resources.service';

export default function MemberResources() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [filters, setFilters] = useState<{ departmentId: string; levelId: string; session: string; semester: string; q: string }>({
    departmentId: '', levelId: '', session: '', semester: '', q: '',
  });
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: filterOpts } = useQuery({ queryKey: ['pq-filters'], queryFn: () => resourcesService.getFilters(), staleTime: 10 * 60_000 });
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['past-questions', filters],
    queryFn: () => resourcesService.list(filters),
  });

  const download = useMutation({
    mutationFn: (id: string) => resourcesService.download(id),
    onSuccess: ({ url }) => window.open(url, '_blank'),
  });

  const set = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters({ ...filters, [k]: e.target.value });

  return (
    <div>
      <PageHeader
        title="Past Questions & Resources"
        description="Search by course, faculty, level or session."
        actions={hasPermission(PERMISSION.RESOURCES_UPLOAD) ? (
          <Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4" /> Upload past question</Button>
        ) : undefined}
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Course code or title…" value={filters.q} onChange={set('q')} />
        </div>
        <Select value={filters.departmentId} onChange={set('departmentId')}>
          <option value="">All faculties</option>
          {(filterOpts?.departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Select value={filters.levelId} onChange={set('levelId')}>
          <option value="">All levels</option>
          {(filterOpts?.levels ?? []).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </Select>
        <Select value={filters.session} onChange={set('session')}>
          <option value="">All sessions</option>
          {(filterOpts?.sessions ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>

      <DataTable
        rows={items} keyOf={(p) => p.id}
        empty={isLoading ? undefined : <EmptyState title="No past questions found" hint="Try clearing filters — or be the first to upload one!" />}
        columns={[
          { header: 'Course', cell: (p) => <div><p className="font-mono font-medium">{p.courseCode}</p>{p.courseTitle && <p className="text-xs text-muted-foreground">{p.courseTitle}</p>}</div> },
          { header: 'Faculty', cell: (p) => <span className="text-sm">{p.department ?? '—'}</span> },
          { header: 'Level', cell: (p) => <span className="text-sm">{p.level ?? '—'}</span> },
          { header: 'Session', cell: (p) => <span className="text-sm">{p.sessionLabel}{p.semester ? ` · ${p.semester}` : ''}</span> },
          { header: 'Downloads', cell: (p) => <span className="text-sm text-muted-foreground">{p.downloadCount}</span> },
          { header: '', className: 'text-right', cell: (p) => (
            <Button size="sm" variant="outline" disabled={download.isPending} onClick={() => download.mutate(p.id)}>
              <Download className="h-3.5 w-3.5" /> PDF
            </Button>
          )},
        ]}
      />

      {hasPermission(PERMISSION.RESOURCES_UPLOAD) && (
        <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} filters={filterOpts} />
      )}
    </div>
  );
}

function UploadDialog({ open, onClose, filters }: {
  open: boolean; onClose: () => void; filters?: ResourceFilters;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({ semester: 'first' });
  const [file, setFile] = useState<File | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const upload = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.set('courseCode', form.courseCode ?? '');
      fd.set('courseTitle', form.courseTitle ?? '');
      fd.set('departmentId', form.departmentId ?? '');
      fd.set('levelId', form.levelId ?? '');
      fd.set('sessionLabel', form.sessionLabel ?? '');
      fd.set('semester', form.semester ?? '');
      fd.set('year', form.year ?? String(new Date().getFullYear()));
      if (file) fd.set('file', file);
      return resourcesService.upload(fd);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['past-questions'] }); qc.invalidateQueries({ queryKey: ['pq-filters'] }); onClose(); },
  });

  const valid = !!form.courseCode && !!form.departmentId && !!form.levelId && !!form.sessionLabel && !!file;

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent>
        <DialogTitle>Upload a past question</DialogTitle>
        <DialogDescription>PDF only, max 20 MB. It goes for approval before students can download it.</DialogDescription>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Course code</Label><Input placeholder="CSC 301" value={form.courseCode ?? ''} onChange={set('courseCode')} /></div>
            <div className="space-y-1.5"><Label>Course title</Label><Input placeholder="Data Structures" value={form.courseTitle ?? ''} onChange={set('courseTitle')} /></div>
            <div className="space-y-1.5"><Label>Faculty</Label>
              <Select value={form.departmentId ?? ''} onChange={set('departmentId')}>
                <option value="">Select…</option>
                {(filters?.departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select></div>
            <div className="space-y-1.5"><Label>Level</Label>
              <Select value={form.levelId ?? ''} onChange={set('levelId')}>
                <option value="">Select…</option>
                {(filters?.levels ?? []).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </Select></div>
            <div className="space-y-1.5"><Label>Session</Label><Input placeholder="2024/2025" value={form.sessionLabel ?? ''} onChange={set('sessionLabel')} /></div>
            <div className="space-y-1.5"><Label>Semester</Label>
              <Select value={form.semester ?? 'first'} onChange={set('semester')}>
                <option value="first">First</option><option value="second">Second</option>
              </Select></div>
          </div>
          <div className="space-y-1.5">
            <Label>PDF file</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {file && <p className="text-xs text-muted-foreground">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
          </div>
          {upload.isError && <p className="text-sm text-red-600">{(upload.error as Error).message}</p>}
          <Button className="w-full" disabled={!valid || upload.isPending} onClick={() => upload.mutate()}>
            {upload.isPending ? 'Uploading…' : 'Upload for approval'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}